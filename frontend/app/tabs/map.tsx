import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform, Modal, TouchableOpacity, SafeAreaView, Alert, ScrollView } from "react-native";
import * as ExpoLocation from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MapComponent from "@/components/MapComponent";
import { getUserIdFromToken } from "@/utils/jwt";
import { getFollowingLocations, updateLocation, UserLocation } from "@/services/locationService";
import { createPin, getPins, deletePin, Pin, PinCategory } from "@/services/pinService";

type Marker = {
  id: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  category?: PinCategory;
  kind?: "user" | "pin";
};

const UPDATE_MS = 3000;
const CATEGORY_EMOJI: Record<PinCategory, string> = {
  home: "🏠",
  school: "🏫",
  church: "⛪",
  work: "💼",
  restaurant: "🍽️",
  other: "📍",
};

export default function Map() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [followingLocations, setFollowingLocations] = useState<UserLocation[]>([]);
  const [myLocation, setMyLocation] = useState<ExpoLocation.LocationObject | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinListVisible, setPinListVisible] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const isWeb = Platform.OS === "web";

  // Resolve auth and permissions
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("token");
      const id = getUserIdFromToken(token || "");
      if (id) setCurrentUserId(id);

      if (isWeb) {
        // Browser will prompt when geolocation is accessed
        setPermissionError(null);
      } else {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setPermissionError("Location permission denied");
          setLoading(false);
          return;
        }
        setPermissionError(null);
      }
      setLoading(false);
    };

    init();
  }, []);

  // Periodically send my location to backend
  useEffect(() => {
    if (!currentUserId || permissionError) return;

    let cancelled = false;

    const sendLocation = async () => {
      try {
        if (isWeb) {
          if (typeof navigator === "undefined" || !navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              if (cancelled) return;
              const coords = pos.coords;
              const stubPosition: ExpoLocation.LocationObject = {
                coords: {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  accuracy: coords.accuracy ?? null,
                  altitude: coords.altitude ?? null,
                  altitudeAccuracy: coords.altitudeAccuracy ?? null,
                  heading: coords.heading ?? null,
                  speed: coords.speed ?? null,
                },
                mocked: false,
                timestamp: pos.timestamp,
              };
              setMyLocation(stubPosition);
              await updateLocation(currentUserId, coords.latitude, coords.longitude);
            },
            (err) => {
              console.error("Web geolocation error", err);
              if (err.code === 1 /* PERMISSION_DENIED */) {
                setPermissionError("Location permission denied");
              }
            },
            { enableHighAccuracy: false, maximumAge: 5000, timeout: 5000 }
          );
        } else {
          const position = await ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.Balanced,
          });
          if (cancelled) return;
          setMyLocation(position);
          await updateLocation(
            currentUserId,
            position.coords.latitude,
            position.coords.longitude
          );
          setNetworkError(null);
        }
      } catch (err: any) {
        console.error("Failed to update location", err?.message || err);
        if (err?.message?.toLowerCase().includes("not authorized")) {
          setPermissionError("Location permission denied");
        }
        setNetworkError("Cannot reach backend. Check network/IP for API.");
      }
    };

    // fire immediately, then on interval
    sendLocation();
    const interval = setInterval(sendLocation, UPDATE_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUserId, permissionError, isWeb]);

  // Periodically fetch locations of people I follow
  useEffect(() => {
    if (!currentUserId || permissionError) return;

    let cancelled = false;
    const loadLocations = async () => {
      try {
        const locs = await getFollowingLocations(currentUserId);
        if (!cancelled) setFollowingLocations(locs ?? []);
        setNetworkError(null);
      } catch (err: any) {
        console.error("Failed to fetch following locations", err?.message || err);
        setNetworkError("Cannot reach backend. Check network/IP for API.");
      }
    };

    loadLocations();
    const interval = setInterval(loadLocations, UPDATE_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUserId, permissionError]);

  // Load my saved pins
  const loadPins = async () => {
    if (!currentUserId) return;
    try {
      const res = await getPins(currentUserId);
      setPins(res);
      setNetworkError(null);
    } catch (err: any) {
      console.error("Failed to load pins", err);
      setNetworkError("Cannot reach backend. Check network/IP for API.");
    }
  };

  useEffect(() => {
    loadPins();
  }, [currentUserId]);

  const markers: Marker[] = useMemo(() => {
    const others = followingLocations.map((loc) => ({
      id: loc.userId,
      title: loc.email || [loc.firstName, loc.lastName].filter(Boolean).join(" ") || "User",
      description: `Updated ${new Date(loc.updatedAt).toLocaleTimeString()}`,
      latitude: loc.latitude,
      longitude: loc.longitude,
      kind: "user" as const,
    }));

    const myPins = pins.map((p) => ({
      id: `pin-${p.id}`,
      title: `${CATEGORY_EMOJI[p.category]} ${p.category}`,
      description: p.title || "Saved place",
      latitude: p.latitude,
      longitude: p.longitude,
      category: p.category,
      kind: "pin" as const,
    }));

    const me = myLocation
      ? [
          {
            id: "me",
            title: "You",
            description: "Current location",
            latitude: myLocation.coords.latitude,
            longitude: myLocation.coords.longitude,
            kind: "user" as const,
          },
        ]
      : [];

    return [...me, ...others, ...myPins];
  }, [followingLocations, myLocation, pins]);

  const followingUpdates = useMemo(
    () =>
      [...followingLocations]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .map((loc) => ({
          ...loc,
          displayName:
            loc.email ||
            [loc.firstName, loc.lastName].filter(Boolean).join(" ").trim() ||
            "User",
        })),
    [followingLocations]
  );

  const ensureUserId = async () => {
    if (currentUserId) return currentUserId;
    const token = await AsyncStorage.getItem("token");
    const id = getUserIdFromToken(token || "");
    if (id) setCurrentUserId(id);
    return id;
  };

  const handleAddPin = async (category: PinCategory) => {
    const userId = await ensureUserId();
    if (!pendingCoord || !userId) return;
    try {
      const pin = await createPin(
        userId,
        category,
        pendingCoord.lat,
        pendingCoord.lng,
        undefined
      );
      setPins((prev) => [pin, ...prev]);
      setNetworkError(null);
      // sync with backend list to ensure persistence
      await loadPins();
      Alert.alert("Pinned", "Location saved with your selected icon.");
    } catch (err: any) {
      console.error("Failed to create pin", err?.message || err);
      setNetworkError("Failed to save pin. Check network/API.");
    } finally {
      setPinModalVisible(false);
      setPendingCoord(null);
    }
  };

  const handleDeletePin = async (pinId: string) => {
    const userId = await ensureUserId();
    if (!userId) return;
    const confirm = async () => {
      try {
        await deletePin(pinId, userId);
        setPins((prev) => prev.filter((p) => p.id !== pinId));
        await loadPins();
      } catch (err: any) {
        Alert.alert("Error", err.message);
      }
    };

    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" ? window.confirm("Delete pin? This will remove the saved location.") : false;
      if (ok) await confirm();
    } else {
      Alert.alert("Delete pin?", "This will remove the saved location.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirm,
        },
      ]);
    }
  };

  const handleSelectLocation = async (lat: number, lng: number) => {
    const userId = await ensureUserId();
    if (!userId) {
      setNetworkError("Need to be logged in before saving pins.");
      return;
    }
    setPendingCoord({ lat, lng });
    setPinModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (permissionError) {
    return (
      <View style={styles.center}>
        <Text>{permissionError}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container]}>
      <View style={[styles.topBar, { paddingTop: 50 }]}>
        <TouchableOpacity style={styles.topButton} onPress={() => setPinListVisible(true)}>
          <Text style={styles.topButtonText}>My Pins ({pins.length})</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.mapSection}>
        <MapComponent
          locations={markers}
          onLongPress={(lat, lng) => handleSelectLocation(lat, lng)}
          onMapClick={(lat, lng) => {
            if (isWeb) {
              handleSelectLocation(lat, lng);
            }
          }}
        />
        {!markers.length && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>No live locations yet</Text>
          </View>
        )}
        {networkError && (
          <View style={[styles.overlay, { backgroundColor: "rgba(200,0,0,0.7)" }]}>
            <Text style={styles.overlayText}>{networkError}</Text>
          </View>
        )}
      </View>

      <View style={styles.updatesContainer}>
        <View style={styles.updatesHeader}>
          <Text style={styles.sectionTitle}>Updates</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{followingUpdates.length}</Text>
          </View>
        </View>
        {followingUpdates.length === 0 ? (
          <Text style={{ color: "#555", marginTop: 8 }}>No updates yet.</Text>
        ) : (
          <ScrollView style={styles.updatesList}>
            {followingUpdates.map((loc) => (
              <View key={loc.id} style={styles.updateRow}>
                <View>
                  <Text style={{ fontWeight: "700" }}>{loc.displayName}</Text>
                  <Text style={{ color: "#555" }}>
                    {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                  </Text>
                </View>
                <Text style={styles.updateMeta}>
                  {new Date(loc.updatedAt).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Modal
        visible={pinListVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPinListVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "75%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.modalTitle}>My Pins</Text>
              <TouchableOpacity onPress={() => setPinListVisible(false)}>
                <Text style={{ color: "#b30059", fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </View>
            {pins.length === 0 ? (
              <Text style={{ color: "#555", marginTop: 8 }}>No saved locations</Text>
            ) : (
              <ScrollView style={styles.pinListScroll}>
                {pins.map((pin) => (
                  <View key={pin.id} style={styles.pinRow}>
                    <View>
                      <Text style={{ fontWeight: "700" }}>{CATEGORY_EMOJI[pin.category]} {pin.category}</Text>
                      <Text style={{ color: "#555" }}>
                        {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeletePin(pin.id)}>
                      <Text style={{ color: "#ff6f61", fontWeight: "700" }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save this place as</Text>
            <View style={styles.chipColumn}>
              {(["home", "work", "school", "church", "restaurant", "other"] as PinCategory[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.chip}
                  onPress={() => handleAddPin(cat)}
                >
                  <Text style={styles.chipText}>{CATEGORY_EMOJI[cat]} {cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalClose} onPress={() => setPinModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  mapSection: { flex: 1, minHeight: 280 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  overlay: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  overlayText: { color: "#fff" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  chipColumn: { flexDirection: "column", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#ffe6f2",
  },
  chipText: { color: "#b30059", fontWeight: "600" },
  modalClose: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 8 },
  modalCloseText: { color: "#ff6f61", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  updatesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f2f2f2",
    gap: 8,
  },
  updatesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countPill: {
    minWidth: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ffe6f2",
    borderRadius: 999,
    alignItems: "center",
  },
  countPillText: { color: "#b30059", fontWeight: "700" },
  updatesList: { maxHeight: 240 },
  topBar: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 50,
    flexDirection: "row",
    justifyContent: "flex-start",
    pointerEvents: "box-none",
  },
  topButton: {
    backgroundColor: "#6c5ce7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  topButtonText: { color: "#fff", fontWeight: "700" },
  pinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  updateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  updateMeta: { color: "#777", fontSize: 12, marginLeft: 12 },
  pinListScroll: {
    marginTop: 8,
    maxHeight: 300,
  },
});
