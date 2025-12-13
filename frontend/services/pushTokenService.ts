import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URI ?? "http://172.20.10.2:3000"}/api`;

async function authHeader() {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function registerPushToken(userId: string, token: string) {
  const res = await fetch(`${API_URL}/push-tokens`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ userId, token }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to save push token");
  }
  return data.token;
}

export async function removePushToken(token: string) {
  const res = await fetch(`${API_URL}/push-tokens`, {
    method: "DELETE",
    headers: await authHeader(),
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to remove push token");
  return data;
}
