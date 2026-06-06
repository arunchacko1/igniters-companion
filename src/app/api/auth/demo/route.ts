export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { cookies } from "next/headers";
import { createUser } from "@/lib/db/queries/users";
import { signToken, cookieName, cookieOptions } from "@/lib/auth/session";

// One-click demo access for the public portfolio link. Each click provisions a
// throwaway Member account and signs the visitor in, so there's no login wall
// and each visitor gets their own clean chat history (no shared state). The
// account is a Member, so it can chat but cannot upload or delete documents —
// the demo content can't be vandalised. The random password is never returned,
// so the account is effectively single-session.
export async function POST() {
  try {
    const email = `guest-${randomUUID()}@demo.igniters`;
    const passwordHash = await hash(randomUUID(), 12);
    const user = await createUser(email, passwordHash, "member");

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set(cookieName(), token, cookieOptions());

    return Response.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("[demo]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
