import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import React from 'react';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' }, // white header
          headerTintColor: '#000', // black title text
        }}
      />
    </SafeAreaProvider>
  );
}
