import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import User from "../models/User";
import FollowRequest from "../models/FollowRequest";
import {
  getAllUsers,
} from "@/services/userService";
import {
  createFollowRequest,
  getFollowRequestsForUser,
  getFollowRequestsSentByUser,
  deleteFollowRequest,
} from "@/services/followRequestService";
import { getUserIdFromToken } from "@/utils/jwt";

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [followRequestsSent, setFollowRequestsSent] = useState<FollowRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Load current user id and all users
  useEffect(() => {
    async function loadUsers() {
      const token = await AsyncStorage.getItem("token");
      const id = getUserIdFromToken(token || '');
      setCurrentUserId(id || "");

      try {
        const allUsers = await getAllUsers();
        setUsers(allUsers);
      } catch (err: any) {
        Alert.alert("Error", err.message);
      }
    }

    loadUsers();
  }, []);

  // Load sent follow requests
  useEffect(() => {
    if (!currentUserId) return;

    async function loadFollowRequestsSent() {
      try {
        const requests = await getFollowRequestsSentByUser(currentUserId);
        setFollowRequestsSent(requests);
      } catch (err: any) {
        Alert.alert("Error", err.message);
      }
    }

    loadFollowRequestsSent();
  }, [currentUserId]);

  // Filter users based on search input
  useEffect(() => {
    if (!search) {
      setFilteredUsers([]);
    } else {
      const filtered = users.filter(
        (u) => u.id !== currentUserId && u.email.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [search, users, currentUserId]);

  // Check if a follow request is pending for a user
  const getPendingRequest = (targetId: string) =>
    followRequestsSent.find(
      (r) => r.targetId === targetId && r.status === "pending"
    );

  // Toggle follow / cancel
  const handleFollowToggle = async (targetId: string) => {
    try {
      const pending = getPendingRequest(targetId);
      if (pending) {
        // Cancel follow request
        await deleteFollowRequest(pending.id);
        setFollowRequestsSent((prev) =>
          prev.filter((r) => r.id !== pending.id)
        );
        Alert.alert("Cancelled", "Follow request cancelled");
      } else {
        // Send follow request
        const newRequest = await createFollowRequest(currentUserId, targetId);
        setFollowRequestsSent((prev) => [...prev, newRequest]);
        Alert.alert("Success", "Follow request sent");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <Text style={styles.userEmail}>{item.email}</Text>
      <Button
        title={getPendingRequest(item.id) ? "Cancel" : "Follow"}
        onPress={() => handleFollowToggle(item.id)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search users by email"
        value={search}
        onChangeText={setSearch}
      />

      {search.length > 0 && (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text>No users found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60, },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  userEmail: { fontSize: 16 },
});
