import { query } from "../client";
import type { User } from "@/types";

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    "SELECT id, email, role, created_at FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
}

export async function getUserPasswordHash(email: string): Promise<string | null> {
  const result = await query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0]?.password_hash ?? null;
}

export async function createUser(
  email: string,
  passwordHash: string,
  role: "leader" | "member" = "member"
): Promise<User> {
  const result = await query<User>(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role, created_at`,
    [email, passwordHash, role]
  );
  return result.rows[0];
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await query<User>(
    "SELECT id, email, role, created_at FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}
