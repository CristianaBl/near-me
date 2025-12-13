import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { registerUser } from "@/services/authService";

export default function Register() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      await registerUser(firstName, lastName, email, password);
      Alert.alert("Success", "Account created! Please log in.");
      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.blobOne} />
      <View style={styles.blobTwo} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.logo}>nearMe</Text>
            <Text style={styles.title}>Create your space ✨</Text>
            <Text style={styles.subtitle}>A softer, sweeter place to keep friends close.</Text>

            <Text style={styles.label}>First name</Text>
            <TextInput
              placeholder="Ava"
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor="#c48bae"
            />

            <Text style={styles.label}>Last name</Text>
            <TextInput
              placeholder="Monroe"
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor="#c48bae"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="ava@example.com"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              placeholderTextColor="#c48bae"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              placeholder="••••••••"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#c48bae"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister}>
              <Text style={styles.primaryText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.secondaryText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff0f6",
  },
  blobOne: {
    position: "absolute",
    width: 260,
    height: 260,
    backgroundColor: "#ffd6ec",
    borderRadius: 140,
    top: -80,
    right: -60,
    opacity: 0.9,
  },
  blobTwo: {
    position: "absolute",
    width: 220,
    height: 220,
    backgroundColor: "#ffe8f3",
    borderRadius: 130,
    bottom: -60,
    left: -80,
    opacity: 0.8,
  },
  card: {
    marginHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#b30059",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  logo: {
    alignSelf: "flex-start",
    backgroundColor: "#ff7eb6",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#b30059",
    marginBottom: 4,
  },
  subtitle: {
    color: "#a45b7a",
    marginBottom: 18,
  },
  label: {
    color: "#8a4f6b",
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ffc2dd",
    backgroundColor: "#fff7fb",
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    color: "#3b1c2a",
  },
  primaryBtn: {
    backgroundColor: "#ff7eb6",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ffd6ec",
    backgroundColor: "#fff8fc",
  },
  secondaryText: {
    color: "#b30059",
    fontWeight: "700",
  },
});
