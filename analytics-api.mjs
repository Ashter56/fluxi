/**
 * Analytics API Routes
 * Provides endpoints for fetching analytics data for the dashboard
 */

const express = require('express');
const { db } = require('./server/db');
const { sql } = require('drizzle-orm');
const { subDays, subWeeks, subMonths, format, formatISO } = require('date-fns');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');
const { EventType } = require('./analytics');

const router = express.Router();

/**
 * Authentication and permission middleware
 * Ensures that only authorized users (admins/investors) can access analytics
 */
function requireAnalyticsAccess(req, res, next) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Check if user has analytics access (admin or specified role)
  const hasAccess = req.user.role === 'admin' || req.user.username === 'ashterabbas';
  
  if (!hasAccess) {
    return res.status(403).json({ message: 'You do not have permission to access analytics' });
  }
  
  next();
}

/**
 * Get all dashboard data in a single request
 * Combines multiple analytics queries to reduce API calls
 */
router.get('/dashboard', requireAnalyticsAccess, async (req, res) => {
  try {
    const now = new Date();
    
    // Get active users metrics
    const activeUsers = await getActiveUsersData(now);
    
    // Get retention data
    const retention = await getRetentionData(now);
    
    // Get K-factor (viral coefficient)
    const kFactor = await getKFactorData(now);
    
    // Get task completion data
    const taskCompletion = await getTaskCompletionData(now);
    
    // Combine all data
    const dashboardData = {
      activeUsers,
      retention,
      kFactor,
      taskCompletion
    };
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Failed to fetch analytics data' });
  }
});

/**
 * Generate and download investor report as CSV
 */
router.post('/download-report', requireAnalyticsAccess, async (req, res) => {
  try {
    const now = new Date();
    const reportPath = await generateInvestorReport(now);
    
    res.download(reportPath, 'fluxion_investor_report.csv', (err) => {
      if (err) {
        console.error('Error sending report file:', err);
      }
      
      // Delete the file after sending
      fs.unlinkSync(reportPath);
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Failed to generate investor report' });
  }
});

/**
 * Gets active users data (DAU, WAU, MAU)
 * @param {Date} date - The date for which to get data
 * @returns {Promise<Object>} - Active users data
 */
async function getActiveUsersData(date) {
  try {
    // Get current DAU, WAU, MAU
    const [dau, wau, mau] = await Promise.all([
      getUniqueUserCount(null, subDays(date, 1), date),
      getUniqueUserCount(null, subWeeks(date, 1), date),
      getUniqueUserCount(null, subMonths(date, 1), date)
    ]);
    
    // Calculate stickiness (DAU/MAU)
    const stickiness = mau > 0 ? (dau / mau) * 100 : 0;
    
    // Get historical data for chart (7 days)
    const historyData = [];
    for (let i = 6; i >= 0; i--) {
      const current = subDays(date, i);
      const dayStart = new Date(current.setHours(0, 0, 0, 0));
      const dayEnd = new Date(current.setHours(23, 59, 59, 999));
      
      const [dailyUsers, weeklyUsers, monthlyUsers] = await Promise.all([
        getUniqueUserCount(null, dayStart, dayEnd),
        getUniqueUserCount(null, subWeeks(dayEnd, 1), dayEnd),
        getUniqueUserCount(null, subMonths(dayEnd, 1), dayEnd)
      ]);
      
      historyData.push({
        date: format(dayStart, 'yyyy-MM-dd'),
        dau: dailyUsers,
        wau: weeklyUsers,
        mau: monthlyUsers
      });
    }
    
    return {
      dau,
      wau,
      mau,
      stickiness,
      history: historyData
    };
  } catch (error) {
    console.error('Error getting active users data:', error);
    throw error;
  }
}

/**
 * Gets retention data for cohorts
 * @param {Date} date - The date for which to get data
 * @returns {Promise<Object>} - Retention data
 */
async function getRetentionData(date) {
  try {
    // Get current cohort's week 1 retention
    const currentCohortResult = await db.execute(sql`
      SELECT
        AVG(CASE WHEN active THEN 100 ELSE 0 END) AS rate
      FROM retention_cohorts
      WHERE cohort_week = DATE_TRUNC('week', NOW() - INTERVAL '1 week')
    `);
    const currentRate = parseFloat(currentCohortResult[0]?.rate || 0);
    
    // Get previous cohort's week 1 retention for comparison
    const previousCohortResult = await db.execute(sql`
      SELECT
        AVG(CASE WHEN active THEN 100 ELSE 0 END) AS rate
      FROM retention_cohorts
      WHERE cohort_week = DATE_TRUNC('week', NOW() - INTERVAL '2 weeks')
    `);
    const previousRate = parseFloat(previousCohortResult[0]?.rate || 0);
    
    // Calculate change
    const change = currentRate - previousRate;
    
    // Get cohort data for last 5 cohorts
    const cohortsResult = await db.execute(sql`
      WITH cohorts AS (
        SELECT DISTINCT
          DATE_TRUNC('week', cohort_week) AS week,
          COUNT(DISTINCT user_id) AS size
        FROM retention_cohorts
        GROUP BY week
        ORDER BY week DESC
        LIMIT 5
      )
      SELECT
        TO_CHAR(c.week, 'YYYY-MM-DD') AS week,
        c.size,
        ARRAY_AGG(
          COALESCE(
            (SELECT AVG(CASE WHEN active THEN 100 ELSE 0 END)
             FROM retention_cohorts rc
             WHERE rc.cohort_week = c.week
             AND rc.updated_at BETWEEN c.week + (n || ' weeks')::INTERVAL 
                                    AND c.week + (n || ' weeks')::INTERVAL + INTERVAL '1 week'
            ), 0
          ) ORDER BY n
        ) AS rates
      FROM cohorts c
      CROSS JOIN generate_series(0, 4) n
      GROUP BY c.week, c.size
      ORDER BY c.week DESC
    `);
    
    // Format cohort data
    const cohorts = cohortsResult.map(row => {
      return {
        week: row.week,
        size: parseInt(row.size),
        rates: row.rates.map(rate => parseFloat(parseFloat(rate).toFixed(1)))
      };
    });
    
    return {
      currentRate,
      previousRate,
      change,
      cohorts
    };
  } catch (error) {
    console.error('Error getting retention data:', error);
    throw error;
  }
}

/**
 * Gets K-factor (viral coefficient) data
 * @param {Date} date - The date for which to get data
 * @returns {Promise<Object>} - K-factor data
 */
async function getKFactorData(date) {
  try {
    // Get total users
    const usersResult = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM user_events
      WHERE created_at < ${date.toISOString()}
    `);
    const totalUsers = parseInt(usersResult[0]?.count || 0);
    
    // Get total invites and shares in last 4 weeks
    const startDate = subWeeks(date, 4);
    const invitesResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM user_events
      WHERE event_type IN (${EventType.INVITE}, ${EventType.SHARE})
      AND created_at BETWEEN ${startDate.toISOString()} AND ${date.toISOString()}
    `);
    const totalInvites = parseInt(invitesResult[0]?.count || 0);
    
    // Calculate K-factor
    const kFactor = totalUsers > 0 ? totalInvites / totalUsers : 0;
    
    // Get historical K-factor data (5 weeks)
    const historyData = [];
    for (let i = 4; i >= 0; i--) {
      const current = subWeeks(date, i);
      const weekStart = subWeeks(current, 4);
      
      // Get users as of that week
      const weekUsersResult = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id) AS count
        FROM user_events
        WHERE created_at < ${current.toISOString()}
      `);
      const weekUsers = parseInt(weekUsersResult[0]?.count || 0);
      
      // Get invites in the 4 weeks leading up to that week
      const weekInvitesResult = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM user_events
        WHERE event_type IN (${EventType.INVITE}, ${EventType.SHARE})
        AND created_at BETWEEN ${weekStart.toISOString()} AND ${current.toISOString()}
      `);
      const weekInvites = parseInt(weekInvitesResult[0]?.count || 0);
      
      // Calculate week's K-factor
      const weekKFactor = weekUsers > 0 ? weekInvites / weekUsers : 0;
      
      historyData.push({
        date: format(current, 'yyyy-MM-dd'),
        value: weekKFactor
      });
    }
    
    return {
      current: kFactor,
      invitesSent: totalInvites,
      invitesPerUser: kFactor,
      history: historyData
    };
  } catch (error) {
    console.error('Error getting K-factor data:', error);
    throw error;
  }
}

/**
 * Gets task completion data
 * @param {Date} date - The date for which to get data
 * @returns {Promise<Object>} - Task completion data
 */
async function getTaskCompletionData(date) {
  try {
    // Get total tasks created and completed in last 4 weeks
    const startDate = subWeeks(date, 4);
    
    const [createdResult, completedResult] = await Promise.all([
      db.execute(sql`
        SELECT COUNT(*) AS count
        FROM user_events
        WHERE event_type = ${EventType.TASK_CREATED}
        AND created_at BETWEEN ${startDate.toISOString()} AND ${date.toISOString()}
      `),
      db.execute(sql`
        SELECT COUNT(*) AS count
        FROM user_events
        WHERE event_type = ${EventType.TASK_COMPLETED}
        AND created_at BETWEEN ${startDate.toISOString()} AND ${date.toISOString()}
      `)
    ]);
    
    const tasksCreated = parseInt(createdResult[0]?.count || 0);
    const tasksCompleted = parseInt(completedResult[0]?.count || 0);
    
    // Calculate completion rate
    const rate = tasksCreated > 0 ? (tasksCompleted / tasksCreated) * 100 : 0;
    
    // Get historical data (5 weeks)
    const historyData = [];
    for (let i = 4; i >= 0; i--) {
      const current = subWeeks(date, i);
      const weekStart = subWeeks(current, 1);
      
      const [weekCreatedResult, weekCompletedResult] = await Promise.all([
        db.execute(sql`
          SELECT COUNT(*) AS count
          FROM user_events
          WHERE event_type = ${EventType.TASK_CREATED}
          AND created_at BETWEEN ${weekStart.toISOString()} AND ${current.toISOString()}
        `),
        db.execute(sql`
          SELECT COUNT(*) AS count
          FROM user_events
          WHERE event_type = ${EventType.TASK_COMPLETED}
          AND created_at BETWEEN ${weekStart.toISOString()} AND ${current.toISOString()}
        `)
      ]);
      
      const weekCreated = parseInt(weekCreatedResult[0]?.count || 0);
      const weekCompleted = parseInt(weekCompletedResult[0]?.count || 0);
      
      historyData.push({
        date: format(current, 'yyyy-MM-dd'),
        created: weekCreated,
        completed: weekCompleted
      });
    }
    
    return {
      rate,
      tasksCreated,
      tasksCompleted,
      history: historyData
    };
  } catch (error) {
    console.error('Error getting task completion data:', error);
    throw error;
  }
}

/**
 * Gets count of unique users for an event type within a date range
 * @param {string|null} eventType - Type of event or null for any event
 * @param {Date} startDate - Start date for the range
 * @param {Date} endDate - End date for the range
 * @returns {Promise<number>} - Count of unique users
 */
async function getUniqueUserCount(eventType, startDate, endDate) {
  try {
    let query;
    
    if (eventType) {
      query = sql`
        SELECT COUNT(DISTINCT user_id) AS count
        FROM user_events
        WHERE event_type = ${eventType}
        AND created_at BETWEEN ${formatISO(startDate)} AND ${formatISO(endDate)}
      `;
    } else {
      query = sql`
        SELECT COUNT(DISTINCT user_id) AS count
        FROM user_events
        WHERE created_at BETWEEN ${formatISO(startDate)} AND ${formatISO(endDate)}
      `;
    }
    
    const result = await db.execute(query);
    return parseInt(result[0]?.count || 0);
  } catch (error) {
    console.error('Error getting unique user count:', error);
    return 0;
  }
}

/**
 * Generates an investor report as CSV
 * @param {Date} date - The date for which to generate the report
 * @returns {Promise<string>} - Path to the generated CSV file
 */
async function generateInvestorReport(date) {
  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, `investor_report_${format(date, 'yyyy-MM-dd')}.csv`);
  
  // Create CSV writer
  const csvWriter = createObjectCsvWriter({
    path: reportPath,
    header: [
      { id: 'date', title: 'Date' },
      { id: 'dau', title: 'DAU' },
      { id: 'wau', title: 'WAU' },
      { id: 'mau', title: 'MAU' },
      { id: 'newUsers', title: 'New Users' },
      { id: 'taskCreated', title: 'Tasks Created' },
      { id: 'taskCompleted', title: 'Tasks Completed' },
      { id: 'completionRate', title: 'Completion Rate (%)' },
      { id: 'shares', title: 'Shares' },
      { id: 'kFactor', title: 'K-Factor' },
      { id: 'retentionRate', title: 'Week 1 Retention (%)' }
    ]
  });
  
  // Get data for the last 4 weeks
  const reportData = [];
  for (let i = 3; i >= 0; i--) {
    const current = subWeeks(date, i);
    const weekStart = new Date(current);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999); // End of week (Saturday)
    
    // Get metrics for this week
    const [
      dau, 
      wau, 
      mau, 
      newUsers,
      tasksCreated,
      tasksCompleted,
      shares
    ] = await Promise.all([
      getUniqueUserCount(null, current, current),
      getUniqueUserCount(null, subWeeks(current, 1), current),
      getUniqueUserCount(null, subMonths(current, 1), current),
      getUniqueUserCount(EventType.USER_SIGNUP, weekStart, weekEnd),
      db.execute(sql`
        SELECT COUNT(*) AS count
        FROM user_events
        WHERE event_type = ${EventType.TASK_CREATED}
        AND created_at BETWEEN ${weekStart.toISOString()} AND ${weekEnd.toISOString()}
      `),
      db.execute(sql`
        SELECT COUNT(*) AS count
        FROM user_events
        WHERE event_type = ${EventType.TASK_COMPLETED}
        AND created_at BETWEEN ${weekStart.toISOString()} AND ${weekEnd.toISOString()}
      `),
      db.execute(sql`
        SELECT COUNT(*) AS count
        FROM user_events
        WHERE event_type IN (${EventType.SHARE}, ${EventType.INVITE})
        AND created_at BETWEEN ${weekStart.toISOString()} AND ${weekEnd.toISOString()}
      `)
    ]);
    
    const numTasksCreated = parseInt(tasksCreated[0]?.count || 0);
    const numTasksCompleted = parseInt(tasksCompleted[0]?.count || 0);
    const numShares = parseInt(shares[0]?.count || 0);
    
    // Calculate completion rate
    const completionRate = numTasksCreated > 0 
      ? (numTasksCompleted / numTasksCreated) * 100 
      : 0;
    
    // Get total users at the end of the week
    const totalUsersResult = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM user_events
      WHERE created_at <= ${weekEnd.toISOString()}
    `);
    const totalUsers = parseInt(totalUsersResult[0]?.count || 0);
    
    // Calculate K-factor
    const kFactor = totalUsers > 0 ? numShares / totalUsers : 0;
    
    // Get retention rate
    const retentionResult = await db.execute(sql`
      SELECT
        AVG(CASE WHEN active THEN 100 ELSE 0 END) AS rate
      FROM retention_cohorts
      WHERE cohort_week = DATE_TRUNC('week', ${weekStart.toISOString()})
    `);
    const retentionRate = parseFloat(retentionResult[0]?.rate || 0);
    
    reportData.push({
      date: format(weekStart, 'yyyy-MM-dd'),
      dau,
      wau,
      mau,
      newUsers,
      taskCreated: numTasksCreated,
      taskCompleted: numTasksCompleted,
      completionRate: completionRate.toFixed(2),
      shares: numShares,
      kFactor: kFactor.toFixed(2),
      retentionRate: retentionRate.toFixed(2)
    });
  }
  
  // Write data to CSV
  await csvWriter.writeRecords(reportData);
  
  // Print report to console
  console.table(reportData);
  
  return reportPath;
}

// Command-line script for generating investor report
if (require.main === module) {
  generateInvestorReport(new Date())
    .then(reportPath => {
      console.log(`Report generated successfully at: ${reportPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Error generating report:', error);
      process.exit(1);
    });
}

module.exports = router;
