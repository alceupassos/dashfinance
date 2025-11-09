import { NextResponse } from "next/server";

interface SimulatorRequest {
  action?: string;
}

export async function POST(request: Request) {
  let body: SimulatorRequest = {};
  try {
    body = (await request.json()) as SimulatorRequest;
  } catch {
    // ignore JSON parse errors – default body stays empty
  }

  const action = body.action ?? "generate_test_users";

  return NextResponse.json({
    success: true,
    action,
    generated_users: 12,
    generated_conversations: 48,
    generated_messages: 372,
    last_run_at: new Date().toISOString(),
    notes:
      "Fluxo mockado. Execute a função Supabase 'whatsapp-simulator' em produção para dados reais."
  });
}

