import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, FlatList, Platform, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { createArrivalWatch, deleteArrivalWatch, listArrivalWatches } from "@/services/arrivalWatchService";
import { getUserById } from "@/services/userService";
import { getSubscriptionsForViewer, getSubscriptionsForTarget, createSubscription, deleteSubscriptionByUsers } from "@/services/subscriptionService";
import { createFollowRequest, getFollowRequestsSentByUser, deleteFollowRequest } from "@/services/followRequestService";
import { getPins, Pin } from "@/services/pinService";
import { getUserIdFromToken } from "@/utils/jwt";

type Watch = {
  id: string;
  pinId: string | null;
  pinLabel: string;
  radius: number;
  eventType: "arrival" | "departure";
  targetId: string;
  useViewerLocation?: boolean;
};

const NEAR_ME_ID = "near-me";

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
  const [selectedPinId, setSelectedPinId] = useState<string>(NEAR_ME_ID);
  const [radiusInput, setRadiusInput] = useState<string>("200");
  const [showDropdown, setShowDropdown] = useState(false);

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
      const pinsList = myPins || [];
      setPins(pinsList);
      setSelectedPinId((prev) => {
        if (prev !== NEAR_ME_ID && pinsList.some((p) => p.id === prev)) return prev;
        return pinsList.length ? pinsList[0].id : NEAR_ME_ID;
      });
      const mappedWatches =
        (myWatches?.map((w: any) => {
          const pinObj = w.pinId && typeof w.pinId === "object" ? w.pinId : undefined;
          const targetObj = w.targetId && typeof w.targetId === "object" ? w.targetId : undefined;
          return {
            id: String(w.id ?? w._id ?? w.watchId ?? `${targetObj?._id || w.targetId}-${w.eventType ?? "arrival"}`),
            pinId: pinObj?._id ? String(pinObj._id) : w.pinId ? String(w.pinId) : null,
            pinLabel: w.useViewerLocation
              ? "Near you"
              : pinObj?.title
                ? pinObj.title
                : pinObj?.category
                  ? `${pinObj.category}`
                  : "Pin",
            radius: w.radiusMeters ?? w.radius ?? 200,
            eventType: w.eventType === "departure" ? "departure" : "arrival",
            targetId: targetObj?._id ? String(targetObj._id) : String(w.targetId),
            useViewerLocation: !!w.useViewerLocation,
          } as Watch;
        }) as Watch[]) || [];
      const relevantWatches = mappedWatches.filter((w) => w.targetId === tid);
      setWatches(relevantWatches);

      const proximityWatch = relevantWatches.find((w) => w.useViewerLocation);
      if (proximityWatch) {
        setSelectedPinId(NEAR_ME_ID);
        setRadiusInput(String(proximityWatch.radius ?? "200"));
      } else {
        setRadiusInput("200");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load user");
    }
  };

  const sanitizeRadius = (raw: string) => {
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
  };

  const pinOptions = [
    { id: NEAR_ME_ID, label: "Near me (uses your current location)" },
    ...pins.map((pin) => ({
      id: pin.id,
      label: `${pin.title || pin.category} (${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)})`,
    })),
  ];

  const selectedOption = pinOptions.find((opt) => opt.id === selectedPinId) || pinOptions[0];

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
    try {
      const radius = sanitizeRadius(radiusInput);
      const useViewerLocation = selectedPinId === NEAR_ME_ID;
      const pinId = useViewerLocation ? null : selectedPinId;
      await createArrivalWatch(currentUserId, targetId, pinId, radius, selectedEventType, useViewerLocation);
      await loadData(currentUserId, targetId);
      setRadiusInput(String(radius));
      Alert.alert("Alert added", `You'll be notified on ${selectedEventType}.`);
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

  const followButton = isFollowing
    ? { label: "Unfollow", action: handleUnfollow }
    : pending
      ? { label: "Cancel request", action: handleCancelRequest }
      : { label: "Follow", action: handleFollow };

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
      <Text style={styles.caption}>Get notified when {targetEmail || "they"} arrive at or leave one of your pins or near you.</Text>

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
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownHeader}
              onPress={() => setShowDropdown((prev) => !prev)}
              activeOpacity={0.85}
            >
              <Text style={styles.dropdownLabel}>{selectedOption?.label || "Choose a location"}</Text>
              <Text style={styles.dropdownCaret}>{showDropdown ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {showDropdown && (
              <View style={styles.dropdownList}>
                {pinOptions.map((option) => {
                  const active = selectedPinId === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.dropdownItem, active && styles.selectItemActive]}
                      onPress={() => {
                        setSelectedPinId(option.id);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {pins.length === 0 && (
                  <Text style={[styles.caption, { marginTop: 4 }]}>No pins saved yet.</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.radiusRow}>
        <Text style={styles.caption}>Radius in meters (default 200)</Text>
        <TextInput
          style={styles.radiusInput}
          keyboardType="numeric"
          value={radiusInput}
          onChangeText={setRadiusInput}
          onBlur={() => setRadiusInput(String(sanitizeRadius(radiusInput)))}
          placeholder="200"
          placeholderTextColor="#888"
        />
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
  radiusRow: { marginVertical: 8 },
  radiusInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 8,
    marginTop: 4,
    minWidth: 120,
    backgroundColor: "#fff",
  },
  radiusBtn: { paddingHorizontal: 12, alignSelf: "flex-end" },
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
  dropdownContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f3e9f7",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownLabel: { color: "#333", fontWeight: "700", flex: 1 },
  dropdownCaret: { color: "#6c5ce7", fontWeight: "800", marginLeft: 8 },
  dropdownList: { paddingHorizontal: 8, paddingVertical: 6, gap: 6 },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
  },
  dropdownItemText: { color: "#333", fontWeight: "600" },
  dropdownItemTextActive: { color: "#fff" },
});
