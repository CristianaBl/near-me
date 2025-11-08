import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';

// Location interface
interface Location {
  id: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
}

interface MapComponentProps {
  locations?: Location[];
}

export default function MapComponent({ locations = [] }: MapComponentProps) {
  const [region, setRegion] = useState({
    latitude: 46.7712,      // Cluj-Napoca latitude
    longitude: 23.6236,     // Cluj-Napoca longitude
    latitudeDelta: 0.05,    // zoom level
    longitudeDelta: 0.05,   // zoom level
});

  // ---------------- Web Version ----------------
  if (Platform.OS === 'web') {
    // Dynamic imports to avoid loading react-native-maps
    const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet');
    const L = require('leaflet');

    // Fix default marker icons
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    require('leaflet/dist/leaflet.css');

    return (
      <div style={{ width: '100%', height: '100vh' }}>
        <MapContainer
          center={[region.latitude, region.longitude]}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {locations.map((loc) => (
            <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
              <Popup>
                <strong>{loc.title}</strong>
                <br />
                {loc.description}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    );
  }

  // ---------------- Mobile Version ----------------
  const MapView = require('react-native-maps').default;
  const { Marker, PROVIDER_GOOGLE } = require('react-native-maps');

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE} // You can switch to PROVIDER_DEFAULT
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
        onRegionChangeComplete={setRegion}
      >
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            title={loc.title}
            description={loc.description}
          />
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
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
