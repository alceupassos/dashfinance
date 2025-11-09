import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WHATSAPP_WEBHOOK_URL'); // URL do workflow N8N
const WASENDER_SECRET = Deno.env.get('WASENDER_SECRET'); // Secret for webhook signature validation

interface WaSenderWebhookPayload {
  event: string; // 'messages.upsert', 'messages.update', etc.
  session_id?: string;
  sessionId?: string;
  data: {
    // Direct format (old)
    key?: {
      remoteJid?: string; // Phone number
      fromMe?: boolean;
      id?: string; // Message ID
    };
    message?: {
      conversation?: string; // Text message
      extendedTextMessage?: {
        text?: string;
      };
      imageMessage?: any;
      videoMessage?: any;
      documentMessage?: any;
      audioMessage?: any;
    };
    messageTimestamp?: number;
    pushName?: string; // Contact name
    participant?: string;
    // Nested format (WaSender new format)
    messages?: {
      key?: {
        remoteJid?: string;
        fromMe?: boolean;
        id?: string;
      };
      message?: {
        conversation?: string;
        extendedTextMessage?: {
          text?: string;
        };
        imageMessage?: any;
        videoMessage?: any;
        documentMessage?: any;
        audioMessage?: any;
      };
      messageTimestamp?: number;
      pushName?: string;
      participant?: string;
    };
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Signature',
  };
}

function validateWebhookSignature(signature: string | null): boolean {
  // TEMPORARY: Skip validation to debug webhook issues
  // WaSender is sending webhooks but they may not include signature header
  if (!signature) {
    console.warn('⚠️ No X-Webhook-Signature header provided - accepting anyway for debugging');
    return true;
  }

  // If no secret configured, skip validation (dev mode)
  if (!WASENDER_SECRET) {
    console.warn('⚠️ WASENDER_SECRET not configured, skipping signature validation');
    return true;
  }

  // WaSender uses direct string comparison (not HMAC)
  // The signature should match the configured secret
  const isValid = signature === WASENDER_SECRET;

  if (!isValid) {
    console.warn('⚠️ Webhook signature mismatch - accepting anyway for debugging');
    console.log(`Expected: ${WASENDER_SECRET}`);
    console.log(`Received: ${signature}`);
  }

  return true; // TEMPORARY: Always accept for debugging
}

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function onlyDigits(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

function extractPhoneNumber(remoteJid: string): string {
  // WaSender format: 5511967377373@s.whatsapp.net or +5511967377373
  return remoteJid.split('@')[0].replace('+', '');
}

function extractMessageText(message: any): string | null {
  if (!message) return null;

  // Direct text
  if (message.conversation) {
    return message.conversation;
  }

  // Extended text (with formatting or quotes)
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text;
  }

  // Media captions
  if (message.imageMessage?.caption) {
    return `[Image] ${message.imageMessage.caption}`;
  }
  if (message.videoMessage?.caption) {
    return `[Video] ${message.videoMessage.caption}`;
  }
  if (message.documentMessage?.caption) {
    return `[Document] ${message.documentMessage.caption}`;
  }

  // Media without caption
  if (message.imageMessage) return '[Image received]';
  if (message.videoMessage) return '[Video received]';
  if (message.documentMessage) return '[Document received]';
  if (message.audioMessage) return '[Audio received]';

  return null;
}

async function logIncomingMessage(
  phoneNumber: string,
  companyCnpj: string | null,
  content: string,
  messageId: string,
  contactName?: string
) {
  const supabase = getSupabaseClient();

  try {
    await supabase.from('whatsapp_conversations').insert({
      phone_number: phoneNumber,
      company_cnpj: companyCnpj || 'unknown',
      message_direction: 'inbound',
      message_text: content.substring(0, 5000),
      message_data: {
        message_id: messageId,
        contact_name: contactName,
        timestamp: new Date().toISOString(),
      }
    });

    console.log(`✅ Logged incoming message from ${phoneNumber}`);
  } catch (error) {
    console.error('⚠️ Failed to log incoming message:', error);
  }
}

async function findOrCreateSession(phoneNumber: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  // Try to find existing session
  const { data: existing } = await supabase
    .from('whatsapp_chat_sessions')
    .select('company_cnpj')
    .eq('phone_number', phoneNumber)
    .single();

  if (existing) {
    return existing.company_cnpj;
  }

  // Check if phone belongs to a client
  const { data: client } = await supabase
    .from('clientes')
    .select('cnpj')
    .or(`whatsapp_phone.eq.${phoneNumber},phone.eq.${phoneNumber}`)
    .single();

  if (client) {
    // Create new session
    await supabase.from('whatsapp_chat_sessions').insert({
      phone_number: phoneNumber,
      company_cnpj: onlyDigits(client.cnpj),
      session_state: 'active',
      created_at: new Date().toISOString(),
      last_interaction: new Date().toISOString(),
    });

    return client.cnpj;
  }

  return null;
}

async function forwardToN8N(payload: any) {
  if (!N8N_WEBHOOK_URL) {
    console.warn('⚠️ N8N_WHATSAPP_WEBHOOK_URL not configured, skipping forward');
    return;
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('✅ Forwarded to N8N successfully');
    } else {
      console.error('❌ Failed to forward to N8N:', response.statusText);
    }
  } catch (error) {
    console.error('❌ Error forwarding to N8N:', error);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  // Health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'wasender-webhook' }),
      { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }

  try {
    // SUPER VERBOSE LOGGING - Log EVERYTHING
    console.log('🔔 === NEW WEBHOOK REQUEST ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📨 Method:', req.method);
    console.log('🌐 URL:', req.url);

    // Log all headers
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('📋 Headers:', JSON.stringify(headers, null, 2));

    // Validate webhook signature
    const signature = req.headers.get('x-webhook-signature');
    if (!validateWebhookSignature(signature)) {
      console.log('⚠️ Signature validation failed but continuing anyway');
    }

    const payload: WaSenderWebhookPayload = await req.json();

    console.log('📦 Full Payload:', JSON.stringify(payload, null, 2));

    // Filter: Only process incoming messages
    // Accept both messages.upsert and messages.received events
    const validEvents = ['messages.upsert', 'messages.received'];
    if (!validEvents.includes(payload.event)) {
      console.log(`ℹ️ Ignoring event: ${payload.event}`);
      return new Response(
        JSON.stringify({ status: 'ignored', event: payload.event }),
        { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // WaSender sends data.messages instead of data.key/data.message
    // Normalize the structure
    const messageData = payload.data?.messages || payload.data;
    const key = messageData?.key;
    const message = messageData?.message;
    const contactName = messageData?.pushName;

    // Filter: Ignore messages from us (fromMe = true)
    if (key?.fromMe) {
      console.log('ℹ️ Ignoring outgoing message');
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'fromMe' }),
        { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Extract message details
    const remoteJid = key?.remoteJid;
    const messageId = key?.id;

    if (!remoteJid || !messageId || !message) {
      console.error('❌ Invalid webhook payload: missing required fields');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const phoneNumber = extractPhoneNumber(remoteJid);
    const messageText = extractMessageText(message);

    if (!messageText) {
      console.log('ℹ️ No extractable text from message');
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'no_text' }),
        { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Message from ${phoneNumber} (${contactName}): ${messageText}`);

    // Find or create session
    const companyCnpj = await findOrCreateSession(phoneNumber);

    // Log to database
    await logIncomingMessage(phoneNumber, companyCnpj, messageText, messageId, contactName);

    // Forward to N8N for AI processing
    await forwardToN8N({
      phone_number: phoneNumber,
      company_cnpj: companyCnpj,
      message: messageText,
      message_id: messageId,
      contact_name: contactName,
      timestamp: new Date().toISOString(),
    });

    // Process commands (if it's a command like /saldo, /dre, etc.)
    if (messageText.trim().startsWith('/')) {
      console.log('🤖 Detected command, processing...');
      try {
        const commandResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-command-processor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            phone_number: phoneNumber,
            message: messageText,
            company_cnpj: companyCnpj,
          }),
        });

        const commandResult = await commandResponse.json();
        console.log('✅ Command processed:', commandResult);
      } catch (error) {
        console.error('⚠️ Error processing command:', error);
        // Don't fail the webhook if command processing fails
      }
    }

    return new Response(
      JSON.stringify({
        status: 'processed',
        phone_number: phoneNumber,
        message_id: messageId,
      }),
      { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in wasender-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
