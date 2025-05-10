/**
 * Analytics Service for Fluxion
 * Tracks user activities and events for investor analytics
 */

const { db } = require('./server/db');
const { sql } = require('drizzle-orm');

/**
 * Event types for analytics tracking
 */
const EventType = {
  USER_SIGNUP: 'user_signup',
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  SHARE: 'share',
  INVITE: 'invite',
  LOGIN: 'login',
  TASK_UPDATED: 'task_updated',
  LIKE: 'like',
  COMMENT: 'comment'
};

/**
 * Tracks an event in the analytics system
 * @param {number} userId - The user ID performing the action
 * @param {string} eventType - The type of event from EventType enum
 * @param {Object} metadata - Optional additional data about the event
 * @returns {Promise<Object>} - The created event record
 */
async function trackEvent(userId, eventType, metadata = {}) {
  try {
    // Ensure userId is valid
    if (!userId) {
      console.error('Cannot track event without a user ID');
      return null;
    }

    // Insert event into the database
    const result = await db.execute(sql`
      INSERT INTO user_events (user_id, event_type, metadata, created_at)
      VALUES (${userId}, ${eventType}, ${JSON.stringify(metadata)}, NOW())
      RETURNING *
    `);

    console.log(`Tracked event: ${eventType} for user ${userId}`);
    return result[0];
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    return null;
  }
}

/**
 * Tracks user signup event
 * @param {number} userId - ID of the user who signed up
 * @param {Object} userData - Additional user data (email, etc.)
 */
async function trackSignup(userId, userData = {}) {
  return trackEvent(userId, EventType.USER_SIGNUP, userData);
}

/**
 * Tracks user login event
 * @param {number} userId - ID of the user who logged in
 */
async function trackLogin(userId) {
  return trackEvent(userId, EventType.LOGIN);
}

/**
 * Tracks task creation event
 * @param {number} userId - ID of the user who created the task
 * @param {number} taskId - ID of the created task
 * @param {Object} taskData - Additional task data
 */
async function trackTaskCreation(userId, taskId, taskData = {}) {
  return trackEvent(userId, EventType.TASK_CREATED, { taskId, ...taskData });
}

/**
 * Tracks task completion event
 * @param {number} userId - ID of the user who completed the task
 * @param {number} taskId - ID of the completed task
 */
async function trackTaskCompletion(userId, taskId) {
  return trackEvent(userId, EventType.TASK_COMPLETED, { taskId });
}

/**
 * Tracks task update event
 * @param {number} userId - ID of the user who updated the task
 * @param {number} taskId - ID of the updated task
 * @param {Object} updateData - Data about the update
 */
async function trackTaskUpdate(userId, taskId, updateData = {}) {
  return trackEvent(userId, EventType.TASK_UPDATED, { taskId, ...updateData });
}

/**
 * Tracks sharing of a task
 * @param {number} userId - ID of the user who shared
 * @param {number} taskId - ID of the shared task
 * @param {string} shareMethod - Method used to share (e.g., 'twitter', 'whatsapp')
 */
async function trackShare(userId, taskId, shareMethod) {
  return trackEvent(userId, EventType.SHARE, { taskId, shareMethod });
}

/**
 * Tracks when a user invites another user
 * @param {number} userId - ID of the user who sent the invitation
 * @param {string} inviteMethod - Method used to invite (e.g., 'email', 'link')
 * @param {Object} inviteData - Additional data about the invitation
 */
async function trackInvite(userId, inviteMethod, inviteData = {}) {
  return trackEvent(userId, EventType.INVITE, { inviteMethod, ...inviteData });
}

/**
 * Tracks when a user likes a task
 * @param {number} userId - ID of the user who liked
 * @param {number} taskId - ID of the liked task
 */
async function trackLike(userId, taskId) {
  return trackEvent(userId, EventType.LIKE, { taskId });
}

/**
 * Tracks when a user comments on a task
 * @param {number} userId - ID of the user who commented
 * @param {number} taskId - ID of the task that was commented on
 * @param {number} commentId - ID of the comment
 */
async function trackComment(userId, taskId, commentId) {
  return trackEvent(userId, EventType.COMMENT, { taskId, commentId });
}

/**
 * Gets count of events by type within a date range
 * @param {string} eventType - Type of event to count
 * @param {Date} startDate - Start date for the range
 * @param {Date} endDate - End date for the range
 * @returns {Promise<number>} - Count of events
 */
async function getEventCount(eventType, startDate, endDate) {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM user_events
      WHERE event_type = ${eventType}
      AND created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
    `);
    
    return parseInt(result[0]?.count || 0);
  } catch (error) {
    console.error('Error getting event count:', error);
    return 0;
  }
}

/**
 * Gets unique user count for an event type within a date range
 * @param {string} eventType - Type of event to analyze
 * @param {Date} startDate - Start date for the range
 * @param {Date} endDate - End date for the range
 * @returns {Promise<number>} - Count of unique users
 */
async function getUniqueUserCount(eventType, startDate, endDate) {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) as count
      FROM user_events
      WHERE event_type = ${eventType}
      AND created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
    `);
    
    return parseInt(result[0]?.count || 0);
  } catch (error) {
    console.error('Error getting unique user count:', error);
    return 0;
  }
}

module.exports = {
  EventType,
  trackEvent,
  trackSignup,
  trackLogin,
  trackTaskCreation,
  trackTaskCompletion,
  trackTaskUpdate,
  trackShare,
  trackInvite,
  trackLike,
  trackComment,
  getEventCount,
  getUniqueUserCount
};