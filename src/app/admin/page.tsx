import DocumentManager from "@/components/DocumentManager";

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Admin Dashboard</h1>
          <p className="text-xs text-slate-500">Document management</p>
        </div>
        <a href="/chat" className="text-sm text-blue-600 hover:underline">
          Back to chat
        </a>
      </header>

      <main className="flex-1">
        <DocumentManager />
      </main>
    </div>
  );
}
