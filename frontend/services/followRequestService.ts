import FollowRequest from "@/models/FollowRequest";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URI ?? "http://172.20.10.2:3000"}/api`;

function normalizeRequest(req: any): FollowRequest {
  const toIdString = (value: any) =>
    typeof value === "object" && value !== null
      ? value._id ?? value.id ?? value.toString?.()
      : value;

  return {
    id: req.id ?? req._id ?? "",
    requesterId: String(toIdString(req.requesterId) ?? ""),
    targetId: String(toIdString(req.targetId) ?? ""),
    status: (req.status as FollowRequest["status"]) ?? "pending",
    createdAt: req.createdAt ?? new Date().toISOString(),
  };
}

async function authHeader() {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
} 

// Create a follow request
export async function createFollowRequest(requesterId: string, targetId: string) {
  const res = await fetch(`${API_URL}/follow-requests`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ requesterId, targetId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create follow request");
  return normalizeRequest(data.request);
}

// Get follow requests where user is target
export async function getFollowRequestsForUser(userId: string) {
  const res = await fetch(`${API_URL}/follow-requests/target/${userId}`, {
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch follow requests");
  return (data.requests ?? []).map(normalizeRequest) as FollowRequest[];
}

// Get follow requests where user is target
export async function getFollowRequestsSentByUser(userId: string) {
  const res = await fetch(`${API_URL}/follow-requests/source/${userId}`, {
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch follow requests");
  return (data.requests ?? []).map(normalizeRequest) as FollowRequest[];
}

// Update follow request status (accept/reject)
export async function updateFollowRequestStatus(id: string, status: "accepted" | "rejected") {
  const res = await fetch(`${API_URL}/follow-requests/${id}/status`, {
    method: "PUT",
    headers: await authHeader(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update follow request");
  return normalizeRequest(data.request);
}

// Delete a follow request
export async function deleteFollowRequest(id: string) {
  const res = await fetch(`${API_URL}/follow-requests/${id}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete follow request");
  return data;
}
