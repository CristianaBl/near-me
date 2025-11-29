import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URI ?? "http://172.20.10.2:3000"}/api`;

async function authHeader() {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export type PinCategory = "home" | "school" | "church" | "work" | "restaurant" | "other";

export type Pin = {
  id: string;
  userId: string;
  category: PinCategory;
  title?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

export async function createPin(userId: string, category: PinCategory, latitude: number, longitude: number, title?: string) {
  const res = await fetch(`${API_URL}/pins`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ userId, category, latitude, longitude, title }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create pin");
  const pin: any = data.pin;
  return {
    id: pin.id ?? pin._id ?? pin.id,
    userId: pin.userId,
    category: pin.category,
    title: pin.title,
    latitude: pin.latitude,
    longitude: pin.longitude,
    createdAt: pin.createdAt,
  } as Pin;
}

export async function getPins(userId: string) {
  const res = await fetch(`${API_URL}/pins/${userId}`, {
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch pins");
  return (data.pins as any[]).map((pin) => ({
    id: pin.id ?? pin._id ?? pin.id,
    userId: pin.userId,
    category: pin.category,
    title: pin.title,
    latitude: pin.latitude,
    longitude: pin.longitude,
    createdAt: pin.createdAt,
  })) as Pin[];
}

export async function deletePin(id: string, userId: string) {
  const res = await fetch(`${API_URL}/pins/${id}?userId=${userId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete pin");
  return data;
}
