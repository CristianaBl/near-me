import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { io, Socket } from "socket.io-client";
import { useRouter } from "expo-router";

import User from "@/models/User";
import FollowRequest from "@/models/FollowRequest";
import { getAllUsers } from "@/services/userService";
import {
  createFollowRequest,
  getFollowRequestsForUser,
  getFollowRequestsSentByUser,
  deleteFollowRequest,
  updateFollowRequestStatus,
} from "@/services/followRequestService";
import {
  createSubscription,
  getSubscriptionsForTarget,
  getSubscriptionsForViewer,
  Subscription,
  deleteSubscriptionByUsers,
  setSubscriptionEnabled,
} from "@/services/subscriptionService";
import { getUserIdFromToken } from "@/utils/jwt";
import { registerPushToken } from "@/services/pushTokenService";
import { registerForPushNotificationsAsync } from "@/utils/notifications";

export default function Home() {
  const router = useRouter();
  const SCREEN_HEIGHT = Dimensions.get("window").height;
  type FollowerAccess = Subscription & { canSee: boolean };
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [followRequestsSent, setFollowRequestsSent] = useState<FollowRequest[]>([]);
  const [followRequestsReceived, setFollowRequestsReceived] = useState<FollowRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [modalVisible, setModalVisible] = useState(false);
  const [userActionModalVisible, setUserActionModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [subscriptionsFollowing, setSubscriptionsFollowing] = useState<Subscription[]>([]);
  const [subscriptionsFollowers, setSubscriptionsFollowers] = useState<FollowerAccess[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [pushRegistered, setPushRegistered] = useState(false);

  const FancyButton = ({
    title,
    onPress,
    color = "#ff7eb6",
    disabled = false,
  }: {
    title: string;
    onPress: () => void;
    color?: string;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.fancyButton,
        { backgroundColor: color, opacity: disabled ? 0.5 : 1 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.fancyButtonText}>{title}</Text>
    </TouchableOpacity>
  );

  // Load data initially
  useEffect(() => {
    loadData();
  }, []);

  // Socket setup for live follow requests
  useEffect(() => {
    const setup = async () => {
      const token = await AsyncStorage.getItem("token");
      const id = getUserIdFromToken(token || "");
      if (!id) return;
      const s = io(process.env.EXPO_PUBLIC_BACKEND_URI || "http://172.20.10.2:3000", {
        transports: ["websocket"],
      });
      s.emit("register", id);
      s.on("follow-request", async () => {
        await loadData();
        Alert.alert("New follow request", "Someone wants to follow you");
      });
      s.on("follow-request-accepted", async (payload) => {
        await loadData();
        const email = payload?.acceptedByEmail || "Someone";
        Alert.alert("Request accepted", `${email} accepted your follow request`);
      });
      setSocket(s);
    };
    setup();
    return () => {
      socket?.disconnect();
    };
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
      let requesterId = currentUserId;
      if (!requesterId) {
        const token = await AsyncStorage.getItem("token");
        requesterId = getUserIdFromToken(token || "") || "";
        setCurrentUserId(requesterId);
      }
      if (!requesterId) {
        Alert.alert("Please wait", "Still loading your profile. Try again in a moment.");
        return;
      }
      const pending = getPendingRequest(targetId);
      if (pending) {
        // Cancel follow request
        if (pending.id.startsWith("temp-")) {
          // Local placeholder, just drop it
          setFollowRequestsSent((prev) => prev.filter((r) => r.id !== pending.id));
        } else {
          await deleteFollowRequest(pending.id);
          setFollowRequestsSent((prev) =>
            prev.filter((r) => r.id !== pending.id)
          );
        }
        setFollowRequestsSent((prev) =>
          prev.filter((r) => r.id !== pending.id)
        );
        Alert.alert("Cancelled", "Follow request cancelled");
      } else {
        // Send follow request
        const newRequest = await createFollowRequest(requesterId, targetId);
        setFollowRequestsSent((prev) => [...prev, newRequest]);
        Alert.alert("Success", "Follow request sent");
      }
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes("already exists")) {
        // Sync state so UI shows cancel
        await loadData();
        // If still not present, add a lightweight placeholder so UI switches to Cancel
        if (!getPendingRequest(targetId)) {
          setFollowRequestsSent((prev) => [
            ...prev,
            {
              id: `temp-${targetId}`,
              requesterId: currentUserId,
              targetId,
              status: "pending",
              createdAt: new Date().toISOString(),
            } as FollowRequest,
          ]);
        }
        Alert.alert("Pending", "Follow request already exists");
      } else {
        Alert.alert("Error", err.message);
      }
    }
  };

  const loadData = async () => {
    try {
      setRefreshing(true);
      const token = await AsyncStorage.getItem("token");
      const id = getUserIdFromToken(token || '');
      setCurrentUserId(id || "");

      const allUsers = await getAllUsers();
      setUsers(allUsers);

      // Load received requests
      const receivedRequests = await getFollowRequestsForUser(id || '');
      setFollowRequestsReceived((receivedRequests ?? []).filter(r => r.status !== "rejected"));

      // Load sent requests
      const sentRequests = await getFollowRequestsSentByUser(id || '');
      setFollowRequestsSent(sentRequests ?? []);

      if (id) {
        // Load subscriptions: who I follow and who follows me
        const [following, followers] = await Promise.all([
          getSubscriptionsForViewer(id),
          getSubscriptionsForTarget(id),
        ]);
        setSubscriptionsFollowing(following ?? []);
        setSubscriptionsFollowers((followers ?? []).map((f) => ({ ...f, canSee: f.enabled !== false })));
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Register push notifications token once we know the user
  useEffect(() => {
    if (!currentUserId || pushRegistered) return;
    const register = async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;
      try {
        await registerPushToken(currentUserId, token);
        setPushRegistered(true);
      } catch (err) {
        console.warn("Failed to save push token", err);
      }
    };
    register();
  }, [currentUserId, pushRegistered]);

  // Accept / Decline follow request
  const handleRequestAction = async (requestId: string, status: "accepted" | "rejected") => {
    try {
      const request = followRequestsReceived.find((r) => r.id === requestId);
      await updateFollowRequestStatus(requestId, status);
      setFollowRequestsReceived(prev => prev.filter(r => r.id !== requestId));

      if (status === "accepted" && request) {
        // Create a subscription so the requester can view the target
        const newSub = await createSubscription(request.requesterId, request.targetId);
        setSubscriptionsFollowers((prev) => [...prev, { ...newSub, canSee: true }]);
      }

      Alert.alert("Success", `Request ${status}`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };


  const getUserEmail = (request: FollowRequest) => {
    const user = users.find(u => u.id === request.requesterId);
    return user ? user.email : "Unknown";
  };

  const getEmailById = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.email : "Unknown";
  };

  const isFollowingUser = (userId: string) =>
    subscriptionsFollowing.some((s) => s.targetId === userId);

  const ensureUserId = async () => {
    if (currentUserId) return currentUserId;
    const token = await AsyncStorage.getItem("token");
    const id = getUserIdFromToken(token || "");
    if (id) setCurrentUserId(id);
    return id;
  };

  const handleFollowBack = async (userId: string) => {
    try {
      // Send a follow request (will be pending until accepted)
      const req = await createFollowRequest(currentUserId, userId);
      setFollowRequestsSent((prev) => [...prev, req]);
      Alert.alert("Request sent", "Follow request sent");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleUnfollow = async (userId: string) => {
    const viewerId = await ensureUserId();
    if (!viewerId) {
      Alert.alert("Please wait", "Still loading your profile. Try again in a moment.");
      return;
    }

    // Mobile uses Alert, web uses confirm for compatibility
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" ? window.confirm("Unfollow? You will stop seeing this user.") : false;
      if (!ok) return;
      try {
        await deleteSubscriptionByUsers(viewerId, userId);
        setSubscriptionsFollowing((prev) =>
          prev.filter((s) => !(s.targetId === userId && s.viewerId === viewerId))
        );
        await loadData();
        Alert.alert("Unfollowed", "You unfollowed this user");
      } catch (err: any) {
        Alert.alert("Error", err.message);
      }
    } else {
      Alert.alert("Unfollow?", "You will stop seeing this user.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unfollow",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSubscriptionByUsers(viewerId, userId);
              setSubscriptionsFollowing((prev) =>
                prev.filter((s) => !(s.targetId === userId && s.viewerId === viewerId))
              );
              await loadData();
              Alert.alert("Unfollowed", "You unfollowed this user");
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]);
    }
  };

  const handleCancelRequest = async (userId: string) => {
    try {
      const pending = getPendingRequest(userId);
      if (!pending) return;
      await deleteFollowRequest(pending.id);
      setFollowRequestsSent((prev) => prev.filter((r) => r.id !== pending.id));
      Alert.alert("Cancelled", "Follow request cancelled");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const toggleViewerAccess = async (viewerId: string, enable: boolean) => {
    const targetId = await ensureUserId();
    if (!targetId) return;
    try {
      if (enable) {
        const newSub = await createSubscription(viewerId, targetId);
        setSubscriptionsFollowers((prev) => {
          const existing = prev.find((s) => s.viewerId === viewerId && s.targetId === targetId);
          if (existing) {
            return prev.map((s) =>
              s.viewerId === viewerId && s.targetId === targetId ? { ...newSub, canSee: true } : s
            );
          }
          return [...prev, { ...newSub, canSee: true }];
        });
      } else {
        await deleteSubscriptionByUsers(viewerId, targetId);
        setSubscriptionsFollowers((prev) =>
          prev.filter((s) => !(s.viewerId === viewerId && s.targetId === targetId))
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not update access");
    }
  };

  const getStatusLabel = (userId: string) => {
    if (subscriptionsFollowing.some((s) => s.targetId === userId)) return "Following";
    if (subscriptionsFollowers.some((s) => s.viewerId === userId)) return "Can see you";
    if (getPendingRequest(userId)) return "Pending";
    return "Not following";
  };

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <TouchableOpacity onPress={() => { setSelectedUser(item); setUserActionModalVisible(true); }}>
        <Text style={styles.userEmail}>{item.email}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push(`/user/${item.id}`)}>
        <Text style={styles.profileLink}>Details</Text>
      </TouchableOpacity>
      <View style={styles.rowEnd}>
        <Text style={styles.statusText}>{getStatusLabel(item.id)}</Text>
        <FancyButton
          title={getPendingRequest(item.id) ? "Cancel" : "Follow"}
          onPress={() => handleFollowToggle(item.id)}
          color={getPendingRequest(item.id) ? "#ffc1dc" : "#ff7eb6"}
        />
      </View>
    </View>
  );

  const renderRequestItem = ({ item }: { item: FollowRequest }) => (
    <View style={styles.requestItem}>
      <Text>{getUserEmail(item)}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <FancyButton
          title="Accept"
          onPress={() => handleRequestAction(item.id, "accepted")}
          color="#7ed957"
        />
        <FancyButton
          title="Decline"
          onPress={() => handleRequestAction(item.id, "rejected")}
          color="#ff6f61"
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { height: SCREEN_HEIGHT * 0.9, paddingBottom: 40 }]}>
      <View style={styles.ribbonOne} />
      <View style={styles.ribbonTwo} />
      <FlatList
        data={search.length > 0 ? filteredUsers : []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={search.length > 0 ? <Text>No users found</Text> : null}
        refreshing={refreshing}
        onRefresh={loadData}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search users by email"
                value={search}
                onChangeText={setSearch}
              />
              <TouchableOpacity
                onPress={() => {
                  loadData();
                  setModalVisible(true);
                }}
                style={{ marginRight: 8 }}
              >
                <Ionicons name="notifications-outline" size={28} color="#333" />
                {followRequestsReceived.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{followRequestsReceived.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

          </View>
        }
        ListFooterComponent={
          <View>
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>Requests you sent</Text>
              {followRequestsSent.length === 0 ? (
                <View style={styles.emptyPill}>
                  <Text style={styles.emptyText}>No pending requests</Text>
                </View>
              ) : (
                followRequestsSent.map((item) => (
                  <View key={item.id} style={[styles.listRow, styles.listRowActions]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text>{getEmailById(item.targetId)}</Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>
                          {item.status === "accepted" ? "Accepted" : "Pending"}
                        </Text>
                      </View>
                    </View>
                    {item.status === "pending" ? (
                      <FancyButton
                        title="Cancel"
                        color="#ffc1dc"
                        onPress={() => handleCancelRequest(item.targetId)}
                      />
                    ) : (
                      <Text style={styles.muted}>Awaiting removal when declined</Text>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Modal for received follow requests */}
            <Modal
              visible={modalVisible}
              animationType="slide"
              onRequestClose={() => setModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Follow Requests</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseIcon}>
                    <Ionicons name="close-circle" size={28} color="#b30059" />
                  </TouchableOpacity>
                </View>
              {followRequestsReceived.length === 0 ? (
                <View style={styles.emptyPill}>
                  <Text style={styles.emptyText}>No requests</Text>
                </View>
              ) : (
                <FlatList
                  data={followRequestsReceived}
                  keyExtractor={(item) => item.id}
                  renderItem={renderRequestItem}
                />
              )}
              </View>
            </Modal>

            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>People you follow</Text>
            {subscriptionsFollowing.length === 0 ? (
              <View style={styles.emptyPill}>
                <Text style={styles.emptyText}>No subscriptions yet</Text>
              </View>
            ) : (
              subscriptionsFollowing.map((item) => (
                <View key={item.id} style={[styles.listRow, styles.listRowActions]}>
                  <TouchableOpacity onPress={() => router.push(`/user/${item.targetId}`)}>
                    <Text style={styles.profileLink}>{getEmailById(item.targetId)}</Text>
                  </TouchableOpacity>
                  <FancyButton
                    title="Unfollow"
                    color="#ff6f61"
                    onPress={() => handleUnfollow(item.targetId)}
                  />
                </View>
              ))
            )}
          </View>

            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>Followers</Text>
              {subscriptionsFollowers.length === 0 ? (
                <View style={styles.emptyPill}>
                  <Text style={styles.emptyText}>No one sees your location yet</Text>
                </View>
              ) : (
                subscriptionsFollowers.map((item) => (
                  <View key={item.id} style={[styles.listRow, styles.listRowActions]}>
                    <Text>{getEmailById(item.viewerId)}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      {!isFollowingUser(item.viewerId) && !getPendingRequest(item.viewerId) && (
                        <FancyButton
                          title="Follow back"
                          color="#7ed957"
                          onPress={() => handleFollowBack(item.viewerId)}
                        />
                      )}
                      <FancyButton
                        title="Revoke"
                        color="#d9534f"
                        onPress={() => toggleViewerAccess(item.viewerId, false)}
                      />
                      <View style={{ alignItems: "center" }}>
                        <Text style={styles.muted}>Allow location</Text>
                        <Switch
                          value={item.canSee !== false}
                          onValueChange={(value) => toggleViewerAccess(item.viewerId, value)}
                          thumbColor={item.canSee !== false ? "#ff7eb6" : "#ccc"}
                          trackColor={{ true: "#ffd6ec", false: "#ddd" }}
                        />
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        }
      />

      {/* Modal for user actions (unfollow / revoke) */}
      <Modal
        visible={userActionModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUserActionModalVisible(false)}
      >
        <View style={styles.actionOverlay}>
          <View style={styles.actionModal}>
            <Text style={styles.modalTitle}>{selectedUser?.email ?? "User options"}</Text>
            <Text style={styles.modalSubtitle}>Keep your circle curated</Text>
            <FancyButton
              title="Unfollow"
              color="#e75480"
              disabled={
                !selectedUser ||
                !currentUserId ||
                !subscriptionsFollowing.some(
                  (s) => s.targetId === selectedUser.id && s.viewerId === currentUserId
                )
              }
              onPress={async () => {
                if (!selectedUser || !currentUserId) return;
                const sub = subscriptionsFollowing.find(
                  (s) => s.targetId === selectedUser.id && s.viewerId === currentUserId
                );
                if (!sub) {
                  Alert.alert("Not following", "You are not following this user.");
                  return;
                }
                try {
                  await deleteSubscriptionByUsers(currentUserId, selectedUser.id);
                  setSubscriptionsFollowing((prev) =>
                    prev.filter(
                      (s) => !(s.targetId === selectedUser.id && s.viewerId === currentUserId)
                    )
                  );
                  Alert.alert("Unfollowed", `You unfollowed ${selectedUser.email}`);
                } catch (err: any) {
                  Alert.alert("Error", err.message);
                } finally {
                  setUserActionModalVisible(false);
                }
              }}
            />
            <View style={{ height: 10 }} />
            <FancyButton
              title="Revoke access"
              color="#d9534f"
              disabled={
                !selectedUser ||
                !currentUserId ||
                !subscriptionsFollowers.some(
                  (s) => s.viewerId === selectedUser.id && s.targetId === currentUserId && s.canSee !== false
                )
              }
              onPress={async () => {
                if (!selectedUser || !currentUserId) return;
                const sub = subscriptionsFollowers.find(
                  (s) => s.viewerId === selectedUser.id && s.targetId === currentUserId && s.canSee !== false
                );
                if (!sub) {
                  Alert.alert("No access", "This user does not currently follow you.");
                  return;
                }
                try {
                  await toggleViewerAccess(selectedUser.id, false);
                  Alert.alert("Revoked", `Revoked ${selectedUser.email}'s access`);
                } catch (err: any) {
                  Alert.alert("Error", err.message);
                } finally {
                  setUserActionModalVisible(false);
                }
              }}
            />
            <View style={{ height: 10 }} />
            <FancyButton title="Close" color="#6c5ce7" onPress={() => setUserActionModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60, backgroundColor: "#fff0f6" },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ffb6d9",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ff79b0",
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ffd6ec",
  },
  userEmail: { fontSize: 16, color: "#b30059", fontWeight: "600" },
  modalContainer: { flex: 1, padding: 20, paddingTop: 60 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, marginBottom: 8, color: "#b30059", fontWeight: "700" },
  modalSubtitle: { color: "#a8547a", marginBottom: 12 },
  requestItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  muted: { color: "#777" },
  listRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileLink: { color: "#6c5ce7", fontWeight: "700", marginRight: 8 },
  listRowActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  actionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  actionModal: {
    width: "100%",
    backgroundColor: "#fff5fb",
    padding: 20,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#ffc1dc",
    shadowColor: "#ff99c8",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  fancyButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  fancyButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  statusText: { color: "#a8547a", marginRight: 6 },
  statusPill: {
    backgroundColor: "#ffe6f2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ffb6d9",
  },
  statusPillText: {
    color: "#b30059",
    fontWeight: "700",
    fontSize: 12,
  },
  rowEnd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ribbonOne: {
    position: "absolute",
    top: -40,
    left: -60,
    width: 200,
    height: 200,
    backgroundColor: "#ffe6f2",
    borderRadius: 100,
    transform: [{ rotate: "-12deg" }],
    opacity: 0.7,
  },
  ribbonTwo: {
    position: "absolute",
    bottom: -60,
    right: -40,
    width: 220,
    height: 220,
    backgroundColor: "#ffd1e8",
    borderRadius: 120,
    transform: [{ rotate: "18deg" }],
    opacity: 0.6,
  },
  emptyPill: {
    backgroundColor: "#ffe6f2",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  emptyText: {
    color: "#b30059",
    fontWeight: "600",
  },
  modalCloseIcon: { padding: 4 },
});
