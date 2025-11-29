// components/MapComponent.native.tsx
import React, { useState } from "react";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface Location {
  id: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  category?: string;
  kind?: "user" | "pin";
}

interface MapComponentProps {
  locations?: Location[];
  onLongPress?: (latitude: number, longitude: number) => void;
}

export default function MapComponent({ locations = [], onLongPress }: MapComponentProps) {
  const categoryColor: Record<string, string> = {
    home: "#ff7eb6",
    school: "#7ed957",
    church: "#8e8cff",
    work: "#ffc107",
    restaurant: "#ff6f61",
    other: "#0096c7",
  };

  const iconFor = (loc: Location) => {
    if (loc.kind === "user") return "🧑";
    const map: Record<string, string> = {
      home: "🏠",
      school: "🏫",
      church: "⛪",
      work: "💼",
      restaurant: "🍽️",
      other: "📍",
    };
    return map[loc.category || ""] || "📍";
  };

  const [region, setRegion] = useState({
    latitude: 46.7712, // Cluj-Napoca
    longitude: 23.6236,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
        onRegionChangeComplete={setRegion}
        onLongPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          onLongPress?.(latitude, longitude);
        }}
      >
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            title={loc.title}
            description={loc.description}
            tracksViewChanges
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor:
                  loc.kind === "user"
                    ? "#6c5ce7"
                    : categoryColor[loc.category || "other"] || categoryColor.other,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: "#fff",
              }}
            >
              <Text style={{ fontSize: 16 }}>{iconFor(loc)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
