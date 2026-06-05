// Lightweight liveness check for the container healthcheck and uptime probes.
// Intentionally does not touch the database — it answers "is the server up",
// not "is every dependency healthy".
export async function GET() {
  return Response.json({ status: "ok" });
}
