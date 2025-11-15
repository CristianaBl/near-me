import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapComponent from '@/components/MapComponent';

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

export default function Map()  {
  return (
    <View style={styles.container}>
      <MapComponent locations={locations} />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24 }
});
