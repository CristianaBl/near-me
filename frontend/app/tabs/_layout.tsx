import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        headerShown: false,
        tabBarActiveTintColor: '#b30059',
        tabBarInactiveTintColor: '#d1a3c4',
        tabBarStyle: {
          backgroundColor: '#fff0f6',
          borderTopColor: '#ffc1dc',
          height: 64,
          paddingBottom: 90,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={28} />
          )
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" color={color} size={28} />
          )
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={28} />
          )
        }}
      />
    </Tabs>
  );
}
