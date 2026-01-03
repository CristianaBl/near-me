import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform, Modal, TouchableOpacity, SafeAreaView, Alert, ScrollView, TextInput } from "react-native";
import { io } from "socket.io-client";
import * as ExpoLocation from "expo-location";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MapComponent from "@/components/MapComponent";
import { getUserIdFromToken } from "@/utils/jwt";
import { getFollowingLocations, updateLocation, UserLocation } from "@/services/locationService";
import { createPin, getPins, deletePin, Pin, PinCategory } from "@/services/pinService";
import { listArrivalWatches } from "@/services/arrivalWatchService";

type Marker = {
  id: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  category?: PinCategory;
  kind?: "user" | "pin";
};

type ArrivalUpdate = {
  id: string;
  targetId: string;
  pinId?: string;
  pinLat?: number;
  pinLng?: number;
  useViewerLocation?: boolean;
  eventType: "arrival" | "departure";
  timestamp: string;
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

export default function MapScreen() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [followingLocations, setFollowingLocations] = useState<UserLocation[]>([]);
  const [myLocation, setMyLocation] = useState<ExpoLocation.LocationObject | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinListVisible, setPinListVisible] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [customPinName, setCustomPinName] = useState("");
  const [arrivalUpdates, setArrivalUpdates] = useState<ArrivalUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const isWeb = Platform.OS === "web";

  const mergeArrivalUpdates = useCallback((incoming: ArrivalUpdate[]) => {
    if (!incoming?.length) return;
    setArrivalUpdates((prev) => {
      const merged = [...incoming, ...prev];
      const unique = new globalThis.Map<string, ArrivalUpdate>();
      merged.forEach((u) => {
        unique.set(`${u.id}-${u.eventType}-${u.timestamp}`, u);
      });
      return Array.from(unique.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);
    });
  }, []);

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

  // Load arrival/departure watches to seed updates (notifications on)
  useEffect(() => {
    if (!currentUserId) return;
    const loadWatches = async () => {
      try {
        const watches = await listArrivalWatches(currentUserId);
        const seeded =
          (watches ?? [])
            .map((w: any) => {
              const lastInside = w.lastInside;
              const eventType = w.eventType === "departure" ? "departure" : "arrival";
              const hasEvent =
                (eventType === "arrival" && lastInside === true) ||
                (eventType === "departure" && lastInside === false);
              if (!hasEvent) return null;
              const pinObj = typeof w.pinId === "object" ? w.pinId : undefined;
              return {
                id: String(w._id ?? w.id ?? w.watchId ?? `${w.targetId}-${eventType}`),
                targetId: String(w.targetId),
                pinId: pinObj?._id ? String(pinObj._id) : w.pinId ? String(w.pinId) : undefined,
                pinLat: pinObj?.latitude,
                pinLng: pinObj?.longitude,
                useViewerLocation: !!w.useViewerLocation,
                eventType,
                timestamp: w.updatedAt || w.createdAt || new Date().toISOString(),
              } as ArrivalUpdate;
            })
            .filter(Boolean) as ArrivalUpdate[];

        mergeArrivalUpdates(seeded);
      } catch (err) {
        console.error("Failed to load arrival watches", err);
      }
    };

    loadWatches();
  }, [currentUserId, mergeArrivalUpdates]);

  // Live socket updates for arrival/departure events
  useEffect(() => {
    if (!currentUserId) return;

    const backend = process.env.EXPO_PUBLIC_BACKEND_URI || "http://172.20.10.2:3000";
    const s = io(backend, { transports: ["websocket"] });
    s.emit("register", currentUserId);
    s.on("arrival-triggered", (payload: any) => {
      const update: ArrivalUpdate = {
        id: payload.watchId ? String(payload.watchId) : `${payload.targetId}-${Date.now()}`,
        targetId: String(payload.targetId),
        pinId: payload.pinId ? String(payload.pinId) : undefined,
        pinLat: payload.pinLat,
        pinLng: payload.pinLng,
        useViewerLocation: !!payload.useViewerLocation,
        eventType: payload.eventType === "departure" ? "departure" : "arrival",
        timestamp: new Date().toISOString(),
      };
      mergeArrivalUpdates([update]);
    });

    return () => {
      s.disconnect();
    };
  }, [currentUserId, mergeArrivalUpdates]);

  // Surface push notifications in the Updates list (when sockets were inactive/backgrounded)
  useEffect(() => {
    if (isWeb) return;

    const handlePushData = (data: any) => {
      if (!data || data.type !== "arrival-watch" || !data.targetId) return;
      const update: ArrivalUpdate = {
        id: data.watchId ? String(data.watchId) : `${data.targetId}-${Date.now()}`,
        targetId: String(data.targetId),
        pinId: data.pinId ? String(data.pinId) : undefined,
        pinLat: typeof data.pinLat === "number" ? data.pinLat : undefined,
        pinLng: typeof data.pinLng === "number" ? data.pinLng : undefined,
        useViewerLocation: !!data.useViewerLocation,
        eventType: data.eventType === "departure" ? "departure" : "arrival",
        timestamp: new Date().toISOString(),
      };
      mergeArrivalUpdates([update]);
    };

    const subReceived = Notifications.addNotificationReceivedListener((notification) => {
      handlePushData(notification?.request?.content?.data);
    });
    const subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      handlePushData(response?.notification?.request?.content?.data);
    });

    // Capture a notification that launched the app
    Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) handlePushData(last.notification?.request?.content?.data);
    });

    return () => {
      subReceived.remove();
      subResponse.remove();
    };
  }, [isWeb, mergeArrivalUpdates]);

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
      title: `${CATEGORY_EMOJI[p.category]} ${p.title || p.category}`,
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

  const formatUserName = (userId: string) => {
    const loc = followingLocations.find((u) => u.userId === userId);
    if (!loc) return "User";
    const name = [loc.firstName, loc.lastName].filter(Boolean).join(" ").trim();
    return loc.email || name || "User";
  };

  const formatLocationLabel = (update: ArrivalUpdate) => {
    if (update.useViewerLocation) return "near you";
    const pinMatch = pins.find(
      (p) =>
        p.id === update.pinId ||
        `pin-${p.id}` === update.pinId ||
        String(p.id) === update.pinId
    );
    if (pinMatch) return `${CATEGORY_EMOJI[pinMatch.category]} ${pinMatch.title || pinMatch.category}`;
    if (typeof update.pinLat === "number" && typeof update.pinLng === "number") {
      return `${update.pinLat.toFixed(5)}, ${update.pinLng.toFixed(5)}`;
    }
    return "this location";
  };

  const ensureUserId = async () => {
    if (currentUserId) return currentUserId;
    const token = await AsyncStorage.getItem("token");
    const id = getUserIdFromToken(token || "");
    if (id) setCurrentUserId(id);
    return id;
  };

  const handleAddPin = async (category: PinCategory, title?: string) => {
    const userId = await ensureUserId();
    if (!pendingCoord || !userId) return;
    const trimmedTitle = title?.trim();
    if (category === "other" && !trimmedTitle) {
      Alert.alert("Name required", "Please enter a name for your custom pin.");
      return;
    }
    try {
      const pin = await createPin(
        userId,
        category,
        pendingCoord.lat,
        pendingCoord.lng,
        trimmedTitle
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
        <TouchableOpacity
          style={styles.inlineLink}
          onPress={() => setPinListVisible(true)}
        >
          <Text style={styles.inlineLinkText}>My Pins</Text>
        </TouchableOpacity>
        <View style={styles.updatesHeader}>
          <Text style={styles.sectionTitle}>Updates</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{arrivalUpdates.length}</Text>
          </View>
        </View>
        {arrivalUpdates.length === 0 ? (
          <Text style={{ color: "#555", marginTop: 8 }}>No updates yet.</Text>
        ) : (
          <ScrollView style={styles.updatesList}>
            {arrivalUpdates.map((update) => (
              <View key={`${update.id}-${update.timestamp}`} style={styles.updateRow}>
                <View>
                  <Text style={{ fontWeight: "700" }}>{formatUserName(update.targetId)}</Text>
                  <Text style={{ color: "#555" }}>
                    {update.eventType === "departure" ? "Has left" : "Has arrived to"}{" "}
                    {formatLocationLabel(update)} at {new Date(update.timestamp).toLocaleString()}
                  </Text>
                </View>
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
                      <Text style={{ fontWeight: "700" }}>{CATEGORY_EMOJI[pin.category]} {pin.title || pin.category}</Text>
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
              {(["home", "work", "school", "church", "restaurant"] as PinCategory[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.chip}
                  onPress={() => handleAddPin(cat)}
                >
                  <Text style={styles.chipText}>{CATEGORY_EMOJI[cat]} {cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: "700", marginBottom: 6 }}>Custom name</Text>
              <TextInput
                style={styles.customInput}
                placeholder="e.g., Grandma's house"
                value={customPinName}
                onChangeText={setCustomPinName}
              />
              <TouchableOpacity
                style={[styles.chip, styles.customSave]}
                onPress={() => {
                  handleAddPin("other", customPinName);
                  setCustomPinName("");
                }}
              >
                <Text style={[styles.chipText, styles.customSaveText]}>📍 Save custom pin</Text>
              </TouchableOpacity>
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
  customInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  customSave: {
    backgroundColor: "#b30059",
  },
  customSaveText: { color: "#fff" },
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
  inlineLink: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  inlineLinkText: {
    color: "#6c5ce7",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
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
  pinListScroll: {
    marginTop: 8,
    maxHeight: 300,
  },
});
