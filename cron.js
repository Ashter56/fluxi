/**
 * Cron Job for Analytics Calculations
 * Handles scheduled calculations of retention rates, active users, 
 * and other metrics for investor analytics
 */

const { db } = require('./server/db');
const { sql } = require('drizzle-orm');
const { EventType } = require('./analytics');
const { startOfWeek, endOfWeek, subWeeks, format, formatISO } = require('date-fns');

/**
 * Calculates user retention for cohorts
 * Groups users by signup week and checks their activity in subsequent weeks
 */
async function calculateRetention() {
  console.log('Starting retention calculation...');
  
  try {
    // Get the current date and time
    const now = new Date();
    
    // Get all user signup events grouped by week (cohorts)
    const cohorts = await db.execute(sql`
      WITH user_signups AS (
        SELECT 
          user_id,
          DATE_TRUNC('week', created_at) AS cohort_week
        FROM user_events
        WHERE event_type = ${EventType.USER_SIGNUP}
      )
      SELECT
        cohort_week,
        ARRAY_AGG(user_id) AS user_ids
      FROM user_signups
      GROUP BY cohort_week
      ORDER BY cohort_week DESC
      LIMIT 12
    `);
    
    // For each cohort, calculate retention
    for (const cohort of cohorts) {
      const cohortWeek = new Date(cohort.cohort_week);
      const userIds = cohort.user_ids;
      
      console.log(`Processing cohort week: ${format(cohortWeek, 'yyyy-MM-dd')} with ${userIds.length} users`);
      
      // Check if each user was active in the last week
      const endDate = now;
      const startDate = subWeeks(now, 1);
      
      // Get active users in the last week
      const activeUsers = await db.execute(sql`
        SELECT DISTINCT user_id
        FROM user_events
        WHERE created_at BETWEEN ${formatISO(startDate)} AND ${formatISO(endDate)}
        AND user_id = ANY(${userIds})
      `);
      
      const activeUserIds = activeUsers.map(user => user.user_id);
      
      // Calculate retention rate
      const retentionRate = userIds.length > 0 ? (activeUserIds.length / userIds.length) * 100 : 0;
      
      // Store the results in retention_cohorts table
      for (const userId of userIds) {
        const isActive = activeUserIds.includes(userId);
        
        // Insert or update retention data
        await db.execute(sql`
          INSERT INTO retention_cohorts (cohort_week, user_id, active)
          VALUES (${cohortWeek.toISOString()}, ${userId}, ${isActive})
          ON CONFLICT (cohort_week, user_id)
          DO UPDATE SET active = ${isActive}, updated_at = NOW()
        `);
      }
      
      console.log(`Cohort ${format(cohortWeek, 'yyyy-MM-dd')} retention rate: ${retentionRate.toFixed(2)}%`);
    }
    
    console.log('Retention calculation completed successfully.');
    return true;
  } catch (error) {
    console.error('Error calculating retention:', error);
    return false;
  }
}

/**
 * Calculates active users (DAU, WAU, MAU)
 * @returns {Promise<Object>} - Object containing DAU, WAU, MAU counts
 */
async function calculateActiveUsers() {
  console.log('Calculating active users metrics...');
  
  try {
    const now = new Date();
    
    // Calculate daily active users (DAU)
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dauResult = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM user_events
      WHERE created_at BETWEEN ${dayStart.toISOString()} AND ${dayEnd.toISOString()}
    `);
    const dau = parseInt(dauResult[0]?.count || 0);
    
    // Calculate weekly active users (WAU)
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    
    const wauResult = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM user_events
      WHERE created_at BETWEEN ${weekStart.toISOString()} AND ${weekEnd.toISOString()}
    `);
    const wau = parseInt(wauResult[0]?.count || 0);
    
    // Calculate monthly active users (MAU)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const mauResult = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM user_events
      WHERE created_at BETWEEN ${monthStart.toISOString()} AND ${monthEnd.toISOString()}
    `);
    const mau = parseInt(mauResult[0]?.count || 0);
    
    // Calculate stickiness (DAU/MAU)
    const stickiness = mau > 0 ? (dau / mau) * 100 : 0;
    
    const result = { dau, wau, mau, stickiness };
    console.log('Active users calculation completed:', result);
    
    // Store metrics in database for historical tracking
    await db.execute(sql`
      INSERT INTO analytics_metrics (
        metric_date, metric_type, metric_value, additional_data
      ) VALUES 
        (${now.toISOString()}, 'dau', ${dau}, NULL),
        (${now.toISOString()}, 'wau', ${wau}, NULL),
        (${now.toISOString()}, 'mau', ${mau}, NULL),
        (${now.toISOString()}, 'stickiness', ${stickiness}, NULL)
    `);
    
    return result;
  } catch (error) {
    console.error('Error calculating active users:', error);
    return { dau: 0, wau: 0, mau: 0, stickiness: 0 };
  }
}

/**
 * Calculates the task completion ratio
 * @returns {Promise<number>} - Completion ratio as a percentage
 */
async function calculateTaskCompletionRatio() {
  console.log('Calculating task completion ratio...');
  
  try {
    const now = new Date();
    const startDate = subWeeks(now, 4); // Last 4 weeks
    
    // Get total tasks created
    const createdResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM user_events
      WHERE event_type = ${EventType.TASK_CREATED}
      AND created_at BETWEEN ${startDate.toISOString()} AND ${now.toISOString()}
    `);
    const tasksCreated = parseInt(createdResult[0]?.count || 0);
    
    // Get total tasks completed
    const completedResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM user_events
      WHERE event_type = ${EventType.TASK_COMPLETED}
      AND created_at BETWEEN ${startDate.toISOString()} AND ${now.toISOString()}
    `);
    const tasksCompleted = parseInt(completedResult[0]?.count || 0);
    
    // Calculate completion ratio
    const completionRatio = tasksCreated > 0 ? (tasksCompleted / tasksCreated) * 100 : 0;
    
    console.log(`Task completion ratio: ${completionRatio.toFixed(2)}% (${tasksCompleted}/${tasksCreated})`);
    
    // Store the metric
    await db.execute(sql`
      INSERT INTO analytics_metrics (
        metric_date, metric_type, metric_value, additional_data
      ) VALUES (
        ${now.toISOString()}, 
        'task_completion_ratio', 
        ${completionRatio}, 
        ${JSON.stringify({ tasksCreated, tasksCompleted })}
      )
    `);
    
    return completionRatio;
  } catch (error) {
    console.error('Error calculating task completion ratio:', error);
    return 0;
  }
}

/**
 * Calculates viral coefficient (K-factor)
 * Number of invites sent by existing users / number of users
 * @returns {Promise<number>} - K-factor value
 */
async function calculateViralCoefficient() {
  console.log('Calculating viral coefficient (K-factor)...');
  
  try {
    const now = new Date();
    const startDate = subWeeks(now, 4); // Last 4 weeks
    
    // Get total users
    const usersResult = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) AS count
      FROM user_events
      WHERE created_at < ${now.toISOString()}
    `);
    const totalUsers = parseInt(usersResult[0]?.count || 0);
    
    // Get total invites and shares
    const invitesResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM user_events
      WHERE event_type IN (${EventType.INVITE}, ${EventType.SHARE})
      AND created_at BETWEEN ${startDate.toISOString()} AND ${now.toISOString()}
    `);
    const totalInvites = parseInt(invitesResult[0]?.count || 0);
    
    // Calculate K-factor
    const kFactor = totalUsers > 0 ? totalInvites / totalUsers : 0;
    
    console.log(`Viral coefficient (K-factor): ${kFactor.toFixed(2)} (${totalInvites} invites / ${totalUsers} users)`);
    
    // Store the metric
    await db.execute(sql`
      INSERT INTO analytics_metrics (
        metric_date, metric_type, metric_value, additional_data
      ) VALUES (
        ${now.toISOString()}, 
        'k_factor', 
        ${kFactor}, 
        ${JSON.stringify({ totalUsers, totalInvites })}
      )
    `);
    
    return kFactor;
  } catch (error) {
    console.error('Error calculating viral coefficient:', error);
    return 0;
  }
}

/**
 * Main function to run all calculations
 */
async function runDailyCalculations() {
  console.log('Starting daily analytics calculations...');
  
  try {
    // Create analytics_metrics table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analytics_metrics (
        id SERIAL PRIMARY KEY,
        metric_date TIMESTAMPTZ NOT NULL,
        metric_type VARCHAR(50) NOT NULL,
        metric_value NUMERIC NOT NULL,
        additional_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Run all calculations
    await calculateRetention();
    await calculateActiveUsers();
    await calculateTaskCompletionRatio();
    await calculateViralCoefficient();
    
    console.log('All daily calculations completed successfully.');
    return true;
  } catch (error) {
    console.error('Error running daily calculations:', error);
    return false;
  }
}

// If run directly from command line
if (require.main === module) {
  runDailyCalculations()
    .then(() => {
      console.log('Cron job finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cron job failed:', error);
      process.exit(1);
    });
}

module.exports = {
  calculateRetention,
  calculateActiveUsers,
  calculateTaskCompletionRatio,
  calculateViralCoefficient,
  runDailyCalculations
};