import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://172.20.10.2:3000/api";

async function authHeader() {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function getAllUsers() {
  const res = await fetch(`${API_URL}/users`, {
    method: "GET",
    headers: await authHeader(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch users");
  return data.users;
}

export async function getUserById(id: string) {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: "GET",
    headers: await authHeader(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch user");
  return data.user;
}

export async function updateUser(id: string, updates: any) {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: "PUT",
    headers: await authHeader(),
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update user");
  return data.user;
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: "DELETE",
    headers: await authHeader(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete user");
  return data;
}
