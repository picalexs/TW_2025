const notificationController = require("../controllers/notificationController");
const url = require("url");
const { sendResponse } = require("../utils/helpers");

async function handleNotificationRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");  
  const method = req.method.toLowerCase();

  // Create notification
  if (trimmedPath === "api/notifications" && method === "post") {
    console.log('[NotificationRoutes] Handling /api/notifications POST request');
    await notificationController.createNotification(req, res);
    return true;
  }

  // Get user notifications
  const userNotificationsMatch = trimmedPath.match(/^api\/notifications\/user\/(\d+)$/);
  if (userNotificationsMatch && method === "get") {
    const userId = parseInt(userNotificationsMatch[1]);
    console.log(`[NotificationRoutes] Handling /api/notifications/user/${userId} GET request`);
    await notificationController.getUserNotifications(req, res, userId);
    return true;
  }

  // Mark notification as read
  const markReadMatch = trimmedPath.match(/^api\/notifications\/(\d+)\/read$/);
  if (markReadMatch && method === "put") {
    const notificationId = parseInt(markReadMatch[1]);
    console.log(`[NotificationRoutes] Handling /api/notifications/${notificationId}/read PUT request`);
    await notificationController.markAsRead(req, res, notificationId);
    return true;
  }

  // Send care reminders
  if (trimmedPath === "api/notifications/care-reminders" && method === "post") {
    console.log('[NotificationRoutes] Handling /api/notifications/care-reminders POST request');
    await notificationController.sendCareReminders(req, res);
    return true;
  }

  // Get notification statistics
  const statsMatch = trimmedPath.match(/^api\/notifications\/stats\/(\d+)$/);
  if (statsMatch && method === "get") {
    const userId = parseInt(statsMatch[1]);
    console.log(`[NotificationRoutes] Handling /api/notifications/stats/${userId} GET request`);
    await notificationController.getNotificationStats(req, res, userId);
    return true;
  }

  return false;
}

module.exports = {
  handleNotificationRoutes,
};
