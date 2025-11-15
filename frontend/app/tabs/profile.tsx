import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import { getUserById, updateUser } from "@/services/userService";
import { getUserIdFromToken } from "@/utils/jwt";

export default function ProfileScreen() {
  const router = useRouter();

  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

  const [isEditing, setIsEditing] = useState<boolean>(false);

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

  const logout = async () => {
    await AsyncStorage.clear();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>

      {/* EMAIL */}
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, !isEditing && styles.disabled]}
        editable={isEditing}
        value={email}
        onChangeText={setEmail}
      />

      {/* FIRST NAME */}
      <Text style={styles.label}>First Name</Text>
      <TextInput
        style={[styles.input, !isEditing && styles.disabled]}
        editable={isEditing}
        value={firstName}
        onChangeText={setFirstName}
      />

      {/* LAST NAME */}
      <Text style={styles.label}>Last Name</Text>
      <TextInput
        style={[styles.input, !isEditing && styles.disabled]}
        editable={isEditing}
        value={lastName}
        onChangeText={setLastName}
      />

      {/* BUTTONS */}
      <View style={styles.buttonContainer}>
        {!isEditing ? (
          <Button title="Edit Profile" onPress={() => setIsEditing(true)} />
        ) : (
          <>
            <Button title="Save Changes" onPress={handleSave} />
            <View style={{ height: 10 }} />
            <Button title="Cancel" color="gray" onPress={() => setIsEditing(false)} />
          </>
        )}

        <View style={{ height: 20 }} />
        <Button title="Logout" color="#d9534f" onPress={logout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  disabled: {
    backgroundColor: "#eee",
  },
  buttonContainer: {
    marginTop: 30,
  },
});
