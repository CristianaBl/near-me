import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, FlatList, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getUserById } from "@/services/userService";
import { getSubscriptionsForViewer, getSubscriptionsForTarget, createSubscription, deleteSubscriptionByUsers } from "@/services/subscriptionService";
import { createFollowRequest, getFollowRequestsSentByUser, deleteFollowRequest } from "@/services/followRequestService";
import { getPins, Pin } from "@/services/pinService";
import { getUserIdFromToken } from "@/utils/jwt";

type Watch = {
  id: string;
  pinId: string;
  pinLabel: string;
  radius: number;
  eventType: "arrival" | "departure";
};

import { createArrivalWatch, deleteArrivalWatch, listArrivalWatches } from "@/services/arrivalWatchService";

export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const targetId = id || "";
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [targetEmail, setTargetEmail] = useState<string>("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollower, setIsFollower] = useState(false);
  const [pending, setPending] = useState(false);
  const [pins, setPins] = useState<Pin[]>([]);
  const [watches, setWatches] = useState<Watch[]>([]);

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("token");
      const uid = getUserIdFromToken(token || "");
      if (!uid) return;
      setCurrentUserId(uid);
      if (targetId) {
        await loadData(uid, targetId);
      }
    };
    init();
  }, [targetId]);

  const loadData = async (uid: string, tid: string) => {
    try {
      const user = await getUserById(tid);
      setTargetEmail(user.email);

      const [sent, following, followers, myPins, myWatches] = await Promise.all([
        getFollowRequestsSentByUser(uid),
        getSubscriptionsForViewer(uid),
        getSubscriptionsForTarget(uid),
        getPins(uid),
        listArrivalWatches(uid),
      ]);
      setPending(sent?.some((r) => r.targetId === tid && r.status === "pending") || false);
      setIsFollowing(following?.some((s) => s.targetId === tid) || false);
      setIsFollower(followers?.some((s) => s.viewerId === tid) || false);
      setPins(myPins || []);
      setWatches(
        (myWatches?.map((w: any) => ({
          id: w.id ?? w._id ?? w.id,
          pinId: w.pinId?._id || w.pinId,
          pinLabel: w.pinId?.category ? `${w.pinId.category}` : "Pin",
          radius: w.radiusMeters ?? w.radius ?? 100,
          eventType: w.eventType ?? "arrival",
        })) as Watch[]) || []
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load user");
    }
  };

  const handleFollow = async () => {
    try {
      if (!currentUserId || !targetId) return;
      await createFollowRequest(currentUserId, targetId);
      setPending(true);
      Alert.alert("Request sent", "Follow request sent");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleCancelRequest = async () => {
    try {
      if (!currentUserId || !targetId) return;
      const sent = await getFollowRequestsSentByUser(currentUserId);
      const pendingReq = sent?.find((r) => r.targetId === targetId && r.status === "pending");
      if (!pendingReq) return;
      await deleteFollowRequest(pendingReq.id);
      setPending(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUserId || !targetId) return;
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" ? window.confirm("Unfollow this user?") : false;
      if (!ok) return;
    } else {
      const confirm = await new Promise<boolean>((resolve) => {
        Alert.alert("Unfollow", "Stop following this user?", [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Unfollow", style: "destructive", onPress: () => resolve(true) },
        ]);
      });
      if (!confirm) return;
    }
    try {
      await deleteSubscriptionByUsers(currentUserId, targetId);
      setIsFollowing(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleFollowBack = async () => {
    if (!currentUserId || !targetId) return;
    try {
      await createSubscription(currentUserId, targetId);
      setIsFollowing(true);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleCreateWatch = async (pinId: string, eventType: "arrival" | "departure") => {
    if (!currentUserId || !targetId) return;
    try {
      await createArrivalWatch(currentUserId, targetId, pinId, 100, eventType);
      await loadData(currentUserId, targetId);
      Alert.alert("Watch added", `You will be notified on ${eventType}.`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDeleteWatch = async (watchId: string) => {
    if (!currentUserId) return;
    const confirm = Platform.OS === "web"
      ? (typeof window !== "undefined" ? window.confirm("Delete this alert?") : false)
      : await new Promise<boolean>((resolve) => {
          Alert.alert("Delete alert?", "You won't get notified for this pin.", [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Delete", style: "destructive", onPress: () => resolve(true) },
          ]);
        });
    if (!confirm) return;
    try {
      await deleteArrivalWatch(watchId, currentUserId);
      setWatches((prev) => prev.filter((w) => w.id !== watchId));
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const followButton = useMemo(() => {
    if (isFollowing) return { label: "Unfollow", action: handleUnfollow };
    if (pending) return { label: "Cancel request", action: handleCancelRequest };
    return { label: "Follow", action: handleFollow };
  }, [isFollowing, pending]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.header}>{targetEmail || "User"}</Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.primaryBtn} onPress={followButton.action}>
          <Text style={styles.btnText}>{followButton.label}</Text>
        </TouchableOpacity>
        {isFollower && !isFollowing && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleFollowBack}>
            <Text style={styles.btnText}>Follow back</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Arrival/Departure alerts</Text>
      <Text style={styles.caption}>Get notified when {targetEmail || "they"} arrive at or leave one of your saved pins.</Text>

      <Text style={styles.subheading}>Add alert</Text>
      <FlatList
        data={pins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listRow}>
            <Text>{item.category} ({item.latitude.toFixed(4)}, {item.longitude.toFixed(4)})</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => handleCreateWatch(item.id, "arrival")}>
                <Text style={{ color: "#6c5ce7" }}>Arrival</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleCreateWatch(item.id, "departure")}>
                <Text style={{ color: "#ff6f61" }}>Departure</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.caption}>No pins saved yet.</Text>}
      />

      <Text style={styles.subheading}>Active alerts</Text>
      <FlatList
        data={watches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listRow}>
            <Text>{item.pinLabel} ({item.eventType}) radius {item.radius}m</Text>
            <TouchableOpacity onPress={() => handleDeleteWatch(item.id)}>
              <Text style={{ color: "#ff6f61" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.caption}>No active alerts.</Text>}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginBottom: 8,
  },
  backText: { color: "#333", fontWeight: "600" },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 12, color: "#b30059" },
  row: { flexDirection: "row", gap: 12, marginBottom: 16 },
  primaryBtn: { backgroundColor: "#ff7eb6", padding: 10, borderRadius: 10 },
  secondaryBtn: { backgroundColor: "#6c5ce7", padding: 10, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  caption: { color: "#555", marginBottom: 6 },
  subheading: { fontWeight: "700", marginTop: 12, marginBottom: 6 },
  listRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    marginTop: 16,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ccc",
    borderRadius: 8,
  },
  backText: { color: "#333", fontWeight: "600" },
});
