const { Expo } = require("expo-server-sdk");
const PushTokenService = require("../pushTokens/pushToken.service");
const User = require("../users/user.model");

const expo = new Expo();

async function sendPushMessages(pushTokens, title, body, data = {}) {
  if (!pushTokens?.length) return;
  const messages = [];
  for (const token of pushTokens) {
    if (!Expo.isExpoPushToken(token)) continue;
    messages.push({
      to: token,
      sound: "default",
      title,
      body,
      data,
    });
  }
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error("Push error", err);
    }
  }
}

async function notifyUser(userId, title, body, data = {}) {
  try {
    const tokens = await PushTokenService.getTokensForUser(userId);
    const tokenValues = tokens.map((t) => t.token);
    await sendPushMessages(tokenValues, title, body, data);
  } catch (err) {
    console.error("Failed to notify user", userId, err);
  }
}

async function getUserDisplayName(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return "Someone";
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return user.email || name || "Someone";
  } catch (err) {
    return "Someone";
  }
}

module.exports = { sendPushMessages, notifyUser, getUserDisplayName };
