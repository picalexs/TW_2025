const { sendResponse, collectRequestData } = require('../utils/helpers');
const { getPool } = require('../db/dbConnection');
const ErrorHandler = require('../utils/errorHandler');
const oracledb = require('oracledb');

class NotificationController {
    constructor() {
        this.debug = true;
    }

    /**
     * Create a new notification
     */
    async createNotification(req, res) {
        let connection;
        try {
            const notificationData = await collectRequestData(req);
            connection = await getPool().getConnection();

            const result = await connection.execute(
                `INSERT INTO advanced_notifications 
                (user_id, title, message, category, priority, data, scheduled_for)
                VALUES (:userId, :title, :message, :category, :priority, :data, :scheduledFor)
                RETURNING id INTO :id`,
                {
                    userId: notificationData.userId,
                    title: notificationData.title,
                    message: notificationData.message,
                    category: notificationData.category || 'general',
                    priority: notificationData.priority || 'medium',
                    data: notificationData.data ? JSON.stringify(notificationData.data) : null,
                    scheduledFor: notificationData.scheduledFor || new Date(),
                    id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                },
                { autoCommit: true }
            );

            const notificationId = result.outBinds.id[0];

            sendResponse(res, 201, {
                success: true,
                data: {
                    id: notificationId,
                    ...notificationData,
                    message: 'Notification created successfully'
                }
            });

        } catch (error) {
            ErrorHandler.handleError(error, res, 'notification creation');
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }

    /**
     * Get notifications for a user
     */
    async getUserNotifications(req, res, userId) {
        let connection;
        try {
            connection = await getPool().getConnection();

            const result = await connection.execute(
                `SELECT * FROM advanced_notifications 
                WHERE user_id = :userId 
                AND (scheduled_for <= CURRENT_TIMESTAMP OR scheduled_for IS NULL)
                ORDER BY created_at DESC`,
                { userId: { val: userId, type: oracledb.NUMBER } },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const notifications = result.rows.map(row => ({
                ...row,
                data: row.DATA ? JSON.parse(row.DATA) : null
            }));

            sendResponse(res, 200, {
                success: true,
                data: {
                    userId,
                    notifications,
                    totalCount: notifications.length,
                    unreadCount: notifications.filter(n => !n.IS_READ).length
                }
            });

        } catch (error) {
            ErrorHandler.handleError(error, res, 'fetching notifications');
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(req, res, notificationId) {
        let connection;
        try {
            connection = await getPool().getConnection();

            await connection.execute(
                `UPDATE advanced_notifications 
                SET is_read = 1, read_at = CURRENT_TIMESTAMP 
                WHERE id = :notificationId`,
                { notificationId: { val: notificationId, type: oracledb.NUMBER } },
                { autoCommit: true }
            );

            sendResponse(res, 200, {
                success: true,
                data: {
                    notificationId,
                    message: 'Notification marked as read'
                }
            });

        } catch (error) {
            ErrorHandler.handleError(error, res, 'marking notification as read');
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }

    /**
     * Send care reminder notifications
     */
    async sendCareReminders(req, res) {
        let connection;
        try {
            connection = await getPool().getConnection();

            // Get upcoming care tasks
            const upcomingTasks = await connection.execute(
                `SELECT cs.*, a.name as pet_name, a.user_id, u.username, u.email
                FROM care_schedule cs
                JOIN animals a ON cs.animal_id = a.id
                JOIN users u ON a.user_id = u.id
                WHERE cs.scheduled_for BETWEEN CURRENT_DATE AND CURRENT_DATE + 1
                AND cs.status = 'pending'`,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const notifications = [];
            for (const task of upcomingTasks.rows) {
                // Create notification
                const notificationResult = await connection.execute(
                    `INSERT INTO advanced_notifications 
                    (user_id, title, message, category, priority, data)
                    VALUES (:userId, :title, :message, 'care_reminder', 'high', :data)
                    RETURNING id INTO :id`,
                    {
                        userId: task.USER_ID,
                        title: `Care Reminder: ${task.PET_NAME}`,
                        message: `Don't forget: ${task.TASK_TYPE} for ${task.PET_NAME} is scheduled for ${task.SCHEDULED_FOR}`,
                        data: JSON.stringify({
                            taskId: task.ID,
                            petId: task.ANIMAL_ID,
                            petName: task.PET_NAME,
                            taskType: task.TASK_TYPE,
                            scheduledFor: task.SCHEDULED_FOR
                        }),
                        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                    },
                    { autoCommit: true }
                );

                notifications.push({
                    id: notificationResult.outBinds.id[0],
                    userId: task.USER_ID,
                    taskId: task.ID,
                    petName: task.PET_NAME
                });
            }

            sendResponse(res, 200, {
                success: true,
                data: {
                    totalReminders: notifications.length,
                    notifications,
                    message: `${notifications.length} care reminders sent successfully`
                }
            });

        } catch (error) {
            ErrorHandler.handleError(error, res, 'sending care reminders');
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }

    /**
     * Get notification statistics
     */
    async getNotificationStats(req, res, userId) {
        let connection;
        try {
            connection = await getPool().getConnection();

            const stats = await connection.execute(
                `SELECT 
                    COUNT(*) as total_notifications,
                    SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count,
                    SUM(CASE WHEN category = 'care_reminder' THEN 1 ELSE 0 END) as care_reminders,
                    SUM(CASE WHEN category = 'system' THEN 1 ELSE 0 END) as system_notifications,
                    SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
                    MAX(created_at) as last_notification
                FROM advanced_notifications 
                WHERE user_id = :userId`,
                { userId: { val: userId, type: oracledb.NUMBER } },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const categoryStats = await connection.execute(
                `SELECT category, COUNT(*) as count
                FROM advanced_notifications 
                WHERE user_id = :userId
                GROUP BY category`,
                { userId: { val: userId, type: oracledb.NUMBER } },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            sendResponse(res, 200, {
                success: true,
                data: {
                    userId,
                    overview: stats.rows[0] || {},
                    categoryBreakdown: categoryStats.rows,
                    generatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            ErrorHandler.handleError(error, res, 'fetching notification statistics');
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    }
}

module.exports = new NotificationController();
