import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Use API KEY for sending messages (connected session)
const WASENDER_API_KEY = Deno.env.get('WASENDER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const WASENDER_BASE_URL = 'https://wasenderapi.com/api';

interface SendMessageRequest {
  to: string; // Phone number with country code (e.g., +5511967377373)
  text?: string;
  image?: string; // URL for image
  video?: string; // URL for video
  document?: string; // URL for document
  audio?: string; // URL for audio
  caption?: string; // Caption for media
  quotedMessageId?: string; // ID of message to reply to
}

interface WaSenderResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function onlyDigits(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

async function sendMessage(payload: SendMessageRequest): Promise<WaSenderResponse> {
  if (!WASENDER_API_KEY) {
    throw new Error('WASENDER_API_KEY not configured');
  }

  try {
    // Build request payload
    const requestBody: any = {
      to: payload.to,
    };

    // Text message
    if (payload.text) {
      requestBody.text = payload.text;
    }

    // Media messages
    if (payload.image) {
      requestBody.image = { url: payload.image };
      if (payload.caption) requestBody.caption = payload.caption;
    }
    if (payload.video) {
      requestBody.video = { url: payload.video };
      if (payload.caption) requestBody.caption = payload.caption;
    }
    if (payload.document) {
      requestBody.document = { url: payload.document };
      if (payload.caption) requestBody.caption = payload.caption;
    }
    if (payload.audio) {
      requestBody.audio = { url: payload.audio };
    }

    // Quoted message (reply)
    if (payload.quotedMessageId) {
      requestBody.quotedMessageId = payload.quotedMessageId;
    }

    console.log('📤 Sending message to WaSender:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${WASENDER_BASE_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WASENDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ WaSender API error:', responseData);
      return {
        success: false,
        error: responseData.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    console.log('✅ Message sent successfully:', responseData);

    return {
      success: true,
      messageId: responseData.id || responseData.messageId,
    };
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function logMessage(
  phoneNumber: string,
  companyCnpj: string | null,
  messageDirection: 'inbound' | 'outbound',
  content: string,
  messageId?: string
) {
  const supabase = getSupabaseClient();

  try {
    await supabase.from('whatsapp_conversations').insert({
      phone_number: phoneNumber,
      company_cnpj: companyCnpj ? onlyDigits(companyCnpj) : 'unknown',
      message_direction: messageDirection,
      message_text: content.substring(0, 5000), // Limit to 5000 chars
      message_data: {
        message_id: messageId,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('⚠️ Failed to log message:', error);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const payload: SendMessageRequest = await req.json();

    // Validate required fields
    if (!payload.to) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: to' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.text && !payload.image && !payload.video && !payload.document && !payload.audio) {
      return new Response(
        JSON.stringify({ error: 'Must provide at least one of: text, image, video, document, audio' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Send message via WaSender
    const result = await sendMessage(payload);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Log message to database
    const logContent = payload.text ||
                       (payload.image ? `[Image: ${payload.image}]` : '') ||
                       (payload.video ? `[Video: ${payload.video}]` : '') ||
                       (payload.document ? `[Document: ${payload.document}]` : '') ||
                       (payload.audio ? `[Audio: ${payload.audio}]` : '');

    // Extract CNPJ from phone if exists (lookup in database)
    const supabase = getSupabaseClient();
    const { data: session } = await supabase
      .from('whatsapp_chat_sessions')
      .select('company_cnpj')
      .eq('phone_number', payload.to)
      .single();

    await logMessage(
      payload.to,
      session?.company_cnpj || null,
      'outbound',
      logContent,
      result.messageId
    );

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in wasender-send-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
