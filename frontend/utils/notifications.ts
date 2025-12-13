import * as Notifications from "expo-notifications";
import { Platform, Alert } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === "web") {
      // Expo web push requires VAPID configuration; skip and let caller handle.
      Alert.alert("Not available on web", "Push notifications require a VAPID key. Please use the mobile app.");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    return tokenResponse.data;
  } catch (err) {
    console.warn("Failed to register for push notifications", err);
    return null;
  }
}
