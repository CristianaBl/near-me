import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform, Dimensions } from "react-native";
import * as ExpoLocation from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MapComponent from "@/components/MapComponent";
import { getUserIdFromToken } from "@/utils/jwt";
import { getFollowingLocations, updateLocation, UserLocation } from "@/services/locationService";

type Marker = {
  id: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
};

const UPDATE_MS = 3000;

export default function Map() {
  const SCREEN_HEIGHT = Dimensions.get("window").height;
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [followingLocations, setFollowingLocations] = useState<UserLocation[]>([]);
  const [myLocation, setMyLocation] = useState<ExpoLocation.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
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
        }
      } catch (err: any) {
        console.error("Failed to update location", err?.message || err);
        if (err?.message?.toLowerCase().includes("not authorized")) {
          setPermissionError("Location permission denied");
        }
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
      } catch (err: any) {
        console.error("Failed to fetch following locations", err?.message || err);
      }
    };

    loadLocations();
    const interval = setInterval(loadLocations, UPDATE_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUserId, permissionError]);

  const markers: Marker[] = useMemo(() => {
    const others = followingLocations.map((loc) => ({
      id: loc.userId,
      title: loc.email || [loc.firstName, loc.lastName].filter(Boolean).join(" ") || "User",
      description: `Updated ${new Date(loc.updatedAt).toLocaleTimeString()}`,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));

    const me = myLocation
      ? [
          {
            id: "me",
            title: "You",
            description: "Current location",
            latitude: myLocation.coords.latitude,
            longitude: myLocation.coords.longitude,
          },
        ]
      : [];

    return [...me, ...others];
  }, [followingLocations, myLocation]);

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
    <View style={[styles.container, { height: SCREEN_HEIGHT * 0.9, paddingBottom: 40 }]}>
      <MapComponent locations={markers} />
      {!markers.length && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>No live locations yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
});
