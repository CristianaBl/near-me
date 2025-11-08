import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapComponent from '@/components/MapComponent';

export default function Home() {
  const locations = [
    {
      id: '1',
      title: 'Central Park Cluj',
      description: 'A nice park in the city center',
      latitude: 46.7712,
      longitude: 23.6236,
    },
    {
      id: '2',
      title: 'St. Michael\'s Church',
      description: 'Famous historical church in Cluj-Napoca',
      latitude: 46.7708,
      longitude: 23.5912,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Locations</Text>
      <MapComponent locations={locations} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // light theme
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 16,
  },
});
