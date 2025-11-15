import {jwtDecode} from "jwt-decode";

interface JwtPayload {
  id: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.id || null;
  } catch (err) {
    console.error("Invalid JWT:", err);
    return null;
  }
}
