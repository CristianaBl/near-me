import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import User from "../models/User";
import FollowRequest from "../models/FollowRequest";
import { getAllUsers } from "@/services/userService";
import {
  createFollowRequest,
  getFollowRequestsForUser,
  getFollowRequestsSentByUser,
  deleteFollowRequest,
  updateFollowRequestStatus,
} from "@/services/followRequestService";
import { getUserIdFromToken } from "@/utils/jwt";

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [followRequestsSent, setFollowRequestsSent] = useState<FollowRequest[]>([]);
  const [followRequestsReceived, setFollowRequestsReceived] = useState<FollowRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [modalVisible, setModalVisible] = useState(false);

  // Load current user id and all users
  useEffect(() => {
    async function loadUsers() {
      const token = await AsyncStorage.getItem("token");
      const id = getUserIdFromToken(token || '');
      setCurrentUserId(id || "");

      try {
        const allUsers = await getAllUsers();
        setUsers(allUsers);

        // Load received requests
        const receivedRequests = await getFollowRequestsForUser(id || '');
        setFollowRequestsReceived(receivedRequests ?? []);

        // Load sent requests
        const sentRequests = await getFollowRequestsSentByUser(id || '');
        setFollowRequestsSent(sentRequests ?? []);

      } catch (err: any) {
        Alert.alert("Error", err.message);
      }
    }

    loadUsers();
  }, []);

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

  // Accept / Decline follow request
  const handleRequestAction = async (requestId: string, status: "accepted" | "rejected") => {
    try {
      await updateFollowRequestStatus(requestId, status);
      setFollowRequestsReceived(prev =>
        prev.filter(r => r.id !== requestId)
      );
      Alert.alert("Success", `Request ${status}`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };


  const getUserEmail = (request: FollowRequest) => {
    const user = users.find(u => u.id === request.requesterId);
    return user ? user.email : "Unknown";
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

  const renderRequestItem = ({ item }: { item: FollowRequest }) => (
    <View style={styles.requestItem}>
      <Text>{getUserEmail(item)}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="Accept" onPress={() => handleRequestAction(item.id, "accepted")} />
        <Button title="Decline" color="#d9534f" onPress={() => handleRequestAction(item.id, "rejected")} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by email"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="notifications-outline" size={28} color="#333" />
          {followRequestsReceived.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{followRequestsReceived.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {search.length > 0 && (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text>No users found</Text>}
        />
      )}

      {/* Modal for received follow requests */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Follow Requests</Text>
          {followRequestsReceived.length === 0 ? (
            <Text>No requests</Text>
          ) : (
            <FlatList
              data={followRequestsReceived}
              keyExtractor={(item) => item.id}
              renderItem={renderRequestItem}
            />
          )}
          <Button title="Close" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "red",
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  userEmail: { fontSize: 16 },
  modalContainer: { flex: 1, padding: 20, paddingTop: 60 },
  modalTitle: { fontSize: 20, marginBottom: 16 },
  requestItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
