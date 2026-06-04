import { getSession } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Igniters Companion</h1>
          <p className="text-xs text-slate-500">Faith-formation assistant</p>
        </div>
        <div className="flex items-center gap-4">
          {session.role === "leader" && (
            <a href="/admin" className="text-sm text-blue-600 hover:underline">
              Admin
            </a>
          )}
          <span className="text-sm text-slate-500">{session.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <ChatInterface userEmail={session.email} role={session.role} />
      </main>
    </div>
  );
}
