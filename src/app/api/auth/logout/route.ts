export const runtime = "nodejs";

import { cookies } from "next/headers";
import { cookieName } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName());
  return Response.json({ ok: true });
}
