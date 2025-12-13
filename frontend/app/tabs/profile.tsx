import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import { getUserById, updateUser } from "@/services/userService";
import { getUserIdFromToken } from "@/utils/jwt";
import { registerPushToken, removePushToken } from "@/services/pushTokenService";
import { registerForPushNotificationsAsync } from "@/utils/notifications";

export default function ProfileScreen() {
  const SCREEN_HEIGHT = Dimensions.get("window").height;
  const router = useRouter();

  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    async function loadUser() {
      const token = await AsyncStorage.getItem("token");
      const id = getUserIdFromToken(token || '');
      if (!id) return;

      setUserId(id);

      try {
        const user = await getUserById(id);

        setEmail(user.email);
        setFirstName(user.firstName ?? "");
        setLastName(user.lastName ?? "");
      } catch (err: any) {
        Alert.alert("Error", err.message);
      }
    }

    loadUser();
  }, []);

  const handleSave = async () => {
    try {
      await updateUser(userId, {
        email,
        firstName,
        lastName,
      });

      Alert.alert("Success", "Profile updated!");
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleTogglePush = async (enable: boolean) => {
    if (!userId) return;
    if (enable) {
      if (isWeb) {
        Alert.alert("Not available on web", "Push notifications require a VAPID key. Please use the mobile app.");
        setPushEnabled(false);
        return;
      }
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        setPushEnabled(false);
        return;
      }
      try {
        await registerPushToken(userId, token);
        setPushToken(token);
        setPushEnabled(true);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to enable push notifications");
      }
    } else {
      if (pushToken) {
        try {
          await removePushToken(pushToken);
        } catch {
          // ignore remove errors
        }
      }
      setPushEnabled(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    router.replace("/login");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: "#fff0f6" }}
    >
      <ScrollView contentContainerStyle={[styles.container, { minHeight: SCREEN_HEIGHT * 0.9, paddingBottom: 50 }]}>
        <View style={styles.ribbonOne} />
        <View style={styles.ribbonTwo} />
        <Text style={styles.logo}>nearMe</Text>
        <Text style={styles.header}>My Profile</Text>

        {/* PUSH NOTIFICATIONS */}
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Push notifications</Text>
            <Text style={styles.helper}>
              {isWeb
                ? "Push alerts require mobile or a VAPID web key."
                : "Enable alerts before editing the rest of your profile."}
            </Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={handleTogglePush}
            thumbColor={pushEnabled ? "#ff7eb6" : "#f1d4e3"}
            trackColor={{ true: "#ffd6ec", false: "#e7d5df" }}
            disabled={isWeb}
          />
        </View>

        {/* EMAIL */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.disabled]}
          editable={isEditing}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#c48bae"
        />

        {/* FIRST NAME */}
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.disabled]}
          editable={isEditing}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Ava"
          placeholderTextColor="#c48bae"
        />

        {/* LAST NAME */}
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.disabled]}
          editable={isEditing}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Bloom"
          placeholderTextColor="#c48bae"
        />

        {/* BUTTONS */}
        <View style={styles.buttonContainer}>
          {!isEditing ? (
            <FancyButton title="Edit Profile" onPress={() => setIsEditing(true)} />
          ) : (
            <>
              <FancyButton title="Save Changes" onPress={handleSave} />
              <View style={{ height: 10 }} />
              <FancyButton title="Cancel" color="#b2bec3" textColor="#2d3436" onPress={() => setIsEditing(false)} />
            </>
          )}

          <View style={{ height: 20 }} />
          <FancyButton title="Logout" color="#ff6f61" onPress={logout} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FancyButton({
  title,
  onPress,
  color = "#ff7eb6",
  textColor = "#fff",
}: {
  title: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.fancyButton, { backgroundColor: color }]}
    >
      <Text style={[styles.fancyButtonText, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 10,
    backgroundColor: "#fff0f6",
    paddingBottom: 60,
    position: "relative",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#ff99c8",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
    marginTop: 12,
  },
  helper: {
    color: "#a45b7a",
    marginTop: 4,
    maxWidth: 220,
  },
  header: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
    color: "#b30059",
  },
  logo: {
    alignSelf: "center",
    backgroundColor: "#ff7eb6",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    marginTop: 10,
    color: "#a8547a",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ffb6d9",
    padding: 12,
    borderRadius: 14,
    marginTop: 6,
    backgroundColor: "#fff",
  },
  disabled: {
    backgroundColor: "#f7f0f5",
  },
  buttonContainer: {
    marginTop: 30,
    gap: 10,
  },
  fancyButton: {
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#ff99c8",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  fancyButtonText: {
    fontWeight: "700",
    fontSize: 15,
  },
  ribbonOne: {
    position: "absolute",
    top: -50,
    left: -80,
    width: 240,
    height: 240,
    backgroundColor: "#ffe6f2",
    borderRadius: 120,
    transform: [{ rotate: "-10deg" }],
    opacity: 0.6,
  },
  ribbonTwo: {
    position: "absolute",
    bottom: -70,
    right: -40,
    width: 220,
    height: 220,
    backgroundColor: "#ffd1e8",
    borderRadius: 110,
    transform: [{ rotate: "15deg" }],
    opacity: 0.5,
  },
});
