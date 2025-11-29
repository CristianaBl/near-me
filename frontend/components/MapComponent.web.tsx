// components/MapComponent.web.tsx
import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

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
  onMapClick?: (lat: number, lng: number) => void;
}

type LeafletStuff = {
  L: any;
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
};

export default function MapComponent({ locations = [], onMapClick }: MapComponentProps) {
  const [leaflet, setLeaflet] = useState<LeafletStuff | null>(null);

  useEffect(() => {
    // Make sure this only runs in the browser
    if (typeof window === "undefined") return;

    let cancelled = false;

    (async () => {
      // Load Leaflet + React-Leaflet + CSS only on client
      const leafletModule = await import("leaflet");
      const L = leafletModule.default ?? leafletModule;

       const {
        MapContainer,
        TileLayer,
        Marker,
        Popup,
      } = await import("react-leaflet");

      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!cancelled) {
        setLeaflet({ L, MapContainer, TileLayer, Marker, Popup });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // While Leaflet is loading (during first render) show placeholder
  if (!leaflet) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Loading map...
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = leaflet;
  const center: [number, number] = [46.7712, 23.6236]; // Cluj

  return (
    <div style={{ width: "100%", height: "70vh" }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        eventHandlers={{
          click: (e: any) => {
            if (onMapClick && e?.latlng) {
              onMapClick(e.latlng.lat, e.latlng.lng);
            }
          },
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={
              leaflet.L.divIcon({
                className: "custom-pin",
                html: `<div style="font-size:20px;">${iconFor(loc.kind, loc.category)}</div>`,
                iconSize: [24, 24],
              })
            }
          >
            <Popup>
              <strong>{iconFor(loc.kind, loc.category)} {loc.title}</strong>
              <br />
              {loc.description}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function iconFor(kind?: "user" | "pin", category?: string) {
  if (kind === "user") return "🧑";
  const map: Record<string, string> = {
    home: "🏠",
    school: "🏫",
    church: "⛪",
    work: "💼",
    restaurant: "🍽️",
    other: "📍",
  };
  return map[category || ""] || "📍";
}
