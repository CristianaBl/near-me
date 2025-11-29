import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, FlatList, Platform, ScrollView } from "react-native";
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
  const [selectedEventType, setSelectedEventType] = useState<"arrival" | "departure">("arrival");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

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

  const handleCreateWatch = async () => {
    if (!currentUserId || !targetId) return;
    if (!selectedPinId) {
      Alert.alert("Select a pin", "Please choose a pin to watch.");
      return;
    }
    try {
      await createArrivalWatch(currentUserId, targetId, selectedPinId, 100, selectedEventType);
      await loadData(currentUserId, targetId);
      Alert.alert("Watch added", `You will be notified on ${selectedEventType}.`);
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
      <View style={styles.pickerRow}>
        <View style={styles.pillToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, selectedEventType === "arrival" && styles.toggleBtnActive]}
            onPress={() => setSelectedEventType("arrival")}
          >
            <Text style={[styles.toggleText, selectedEventType === "arrival" && styles.toggleTextActive]}>
              Arrival
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, selectedEventType === "departure" && styles.toggleBtnActive]}
            onPress={() => setSelectedEventType("departure")}
          >
            <Text style={[styles.toggleText, selectedEventType === "departure" && styles.toggleTextActive]}>
              Departure
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.selectBox}>
          {pins.length === 0 ? (
            <Text style={styles.caption}>No pins saved yet.</Text>
          ) : (
            <ScrollView>
              {pins.map((pin) => (
                <TouchableOpacity
                  key={pin.id}
                  style={[
                    styles.selectItem,
                    selectedPinId === pin.id && styles.selectItemActive,
                  ]}
                  onPress={() => setSelectedPinId(pin.id)}
                >
                  <Text style={{ color: selectedPinId === pin.id ? "#fff" : "#333" }}>
                    {pin.category} ({pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { marginTop: 8, opacity: selectedPinId ? 1 : 0.5 },
        ]}
        disabled={!selectedPinId}
        onPress={handleCreateWatch}
      >
        <Text style={styles.btnText}>Add alert</Text>
      </TouchableOpacity>

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
  pickerRow: { gap: 8, marginBottom: 8 },
  pillToggle: {
    flexDirection: "row",
    backgroundColor: "#f3e9f7",
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  toggleBtnActive: { backgroundColor: "#6c5ce7" },
  toggleText: { color: "#6c5ce7", fontWeight: "700" },
  toggleTextActive: { color: "#fff" },
  selectBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 6,
    backgroundColor: "#fafafa",
    maxHeight: 200,
  },
  selectItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  selectItemActive: {
    backgroundColor: "#6c5ce7",
    borderColor: "#6c5ce7",
  },
});
