import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/guards";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect("/chat");
}
