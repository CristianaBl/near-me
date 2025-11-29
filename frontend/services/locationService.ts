import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URI ?? "http://172.20.10.2:3000"}/api`;

async function authHeader() {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export type UserLocation = {
  id: string;
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

export async function updateLocation(userId: string, latitude: number, longitude: number) {
  const res = await fetch(`${API_URL}/locations/${userId}`, {
    method: "PUT",
    headers: await authHeader(),
    body: JSON.stringify({ latitude, longitude }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update location");
  return data.location as UserLocation;
}

export async function getFollowingLocations(viewerId: string) {
  const res = await fetch(`${API_URL}/locations/following/${viewerId}`, {
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch locations");
  return data.locations as UserLocation[];
}
