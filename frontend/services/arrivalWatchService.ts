import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URI ?? "http://172.20.10.2:3000"}/api`;

async function authHeader() {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function createArrivalWatch(viewerId: string, targetId: string, pinId: string, radiusMeters: number, eventType: "arrival" | "departure" = "arrival") {
  const res = await fetch(`${API_URL}/arrival-watches`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ viewerId, targetId, pinId, radiusMeters, eventType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create arrival watch");
  return data.watch;
}

export async function listArrivalWatches(viewerId: string) {
  const res = await fetch(`${API_URL}/arrival-watches/${viewerId}`, {
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch arrival watches");
  return data.watches;
}

export async function deleteArrivalWatch(id: string, viewerId: string) {
  const res = await fetch(`${API_URL}/arrival-watches/${id}?viewerId=${viewerId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete arrival watch");
  return data;
}
