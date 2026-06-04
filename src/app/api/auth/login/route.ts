export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { getUserByEmail, getUserPasswordHash } from "@/lib/db/queries/users";
import { signToken, cookieName, cookieOptions } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    const hash = await getUserPasswordHash(email);
    if (!hash) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await compare(password, hash);
    if (!valid) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set(cookieName(), token, cookieOptions());

    return Response.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("[login]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
