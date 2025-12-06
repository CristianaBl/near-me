import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URI ?? "http://172.20.10.2:3000"}/api`;

function toIdString(value: any) {
  if (typeof value === "string") return value;
  if (value?._id) return String(value._id);
  if (value?.id) return String(value.id);
  if (value?.toString) return String(value.toString());
  return "";
}

function normalizeSubscription(sub: any) {
  return {
    id: sub.id ?? sub._id ?? sub.id ?? "",
    viewerId: toIdString(sub.viewerId),
    targetId: toIdString(sub.targetId),
    createdAt: sub.createdAt,
  };
}

async function authHeader() {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export type Subscription = {
  id: string;
  viewerId: string;
  targetId: string;
  createdAt: string;
};

// Create a subscription
export async function createSubscription(viewerId: string, targetId: string) {
  const res = await fetch(`${API_URL}/subscriptions`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ viewerId, targetId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create subscription");
  return normalizeSubscription(data) as Subscription;
}

// Get subscriptions for viewer
export async function getSubscriptionsForViewer(viewerId: string) {
  const res = await fetch(`${API_URL}/subscriptions/viewer/${viewerId}`, {
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch subscriptions");
  return (data as any[]).map(normalizeSubscription) as Subscription[];
}

// Get subscriptions for target
export async function getSubscriptionsForTarget(targetId: string) {
  const res = await fetch(`${API_URL}/subscriptions/target/${targetId}`, {
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch subscriptions");
  return (data as any[]).map(normalizeSubscription) as Subscription[];
}

// Delete a subscription
export async function deleteSubscription(id: string) {
  const res = await fetch(`${API_URL}/subscriptions/${id}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete subscription");
  return data;
}

// Delete by viewer/target pair
export async function deleteSubscriptionByUsers(viewerId: string, targetId: string) {
  const res = await fetch(`${API_URL}/subscriptions?viewerId=${viewerId}&targetId=${targetId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete subscription");
  return data;
}
