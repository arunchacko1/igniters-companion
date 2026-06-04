import { cookies } from "next/headers";
import { verifyToken, cookieName } from "./session";
import type { JwtPayload } from "@/types";

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName())?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<JwtPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireLeader(): Promise<JwtPayload> {
  const session = await requireAuth();
  if (session.role !== "leader") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
