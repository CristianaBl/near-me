export default interface FollowRequest {
    id: string;
    requesterId: string;
    targetId: string;
    status: "pending" | "accepted" | "rejected";
    createdAt: string;
};