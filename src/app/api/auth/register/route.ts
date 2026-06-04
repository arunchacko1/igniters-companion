export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { cookies } from "next/headers";
import { createUser, getUserByEmail } from "@/lib/db/queries/users";
import { signToken, cookieName, cookieOptions } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return Response.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const user = await createUser(email, passwordHash, role === "leader" ? "leader" : "member");

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set(cookieName(), token, cookieOptions());

    return Response.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("[register]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
