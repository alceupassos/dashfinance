import { NextResponse } from "next/server";

export async function POST() {
  const now = Date.now();
  return NextResponse.json({
    success: true,
    message: "Seed executado com dados sintéticos (mock).",
    started_at: new Date(now - 120 * 1000).toISOString(),
    finished_at: new Date(now).toISOString(),
    inserted: {
      customers: 24,
      invoices: 186,
      whatsapp_messages: 512,
      llm_usage_records: 128,
      alerts: 42
    },
    notes: "Use supabase functions deploy seed-realistic-data para substituir pelo fluxo real."
  });
}

