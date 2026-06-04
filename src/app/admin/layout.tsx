import { requireLeader } from "@/lib/auth/guards";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireLeader();
  } catch {
    redirect("/chat");
  }

  return <>{children}</>;
}
