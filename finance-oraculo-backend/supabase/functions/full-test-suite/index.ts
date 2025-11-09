import type { ServeRequest } from "bun";

export async function POST(request: ServeRequest) {
  const { headers } = request;
  const auth = headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authorization required" }), { status: 401 });
  }

  const base = process.env.SUPABASE_FUNCTIONS_BASE?.replace(/\/$/, "") ?? "";
  const results: Record<string, { status: string; detail?: unknown }> = {};

  try {
    const seed = await fetch(`${base}/seed-realistic-data`, { headers: { Authorization: auth }, method: "POST" });
    results.seed = { status: seed.ok ? "ok" : "failed", detail: await seed.text() };
  } catch (error) {
    results.seed = { status: "error", detail: String(error) };
  }

  try {
    const simulator = await fetch(`${base}/whatsapp-simulator`, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ action: "generate_test_users" })
    });
    results.simulator = { status: simulator.ok ? "ok" : "failed", detail: await simulator.text() };
  } catch (error) {
    results.simulator = { status: "error", detail: String(error) };
  }

  try {
    const tokens = await fetch(`${base}/admin/tokens/validate`, { headers: { Authorization: auth }, method: "GET" });
    results.tokens = { status: tokens.ok ? "ok" : "failed", detail: await tokens.text() };
  } catch (error) {
    results.tokens = { status: "error", detail: String(error) };
  }

  return new Response(JSON.stringify({ summary: results }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
