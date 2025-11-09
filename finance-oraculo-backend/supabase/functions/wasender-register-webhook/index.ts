import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Personal Token = full permissions (create webhook, manage sessions, etc)
const WASENDER_PERSONAL_TOKEN = Deno.env.get('WASENDER_PERSONAL_TOKEN');
const WASENDER_BASE_URL = 'https://wasenderapi.com/api';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'register';

    if (!WASENDER_PERSONAL_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'WASENDER_PERSONAL_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // REGISTER WEBHOOK
    // ========================================
    if (action === 'register') {
      const webhookUrl = url.searchParams.get('url') ||
                        'https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook';

      const response = await fetch(`${WASENDER_BASE_URL}/webhook`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WASENDER_PERSONAL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          events: ['message.in', 'message.out', 'status'],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: 'Failed to register webhook',
            details: data
          }),
          { status: response.status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook registered successfully',
          webhook_url: webhookUrl,
          events: ['message.in', 'message.out', 'status'],
          response: data,
        }),
        { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // LIST WEBHOOKS
    // ========================================
    if (action === 'list') {
      const response = await fetch(`${WASENDER_BASE_URL}/webhook`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WASENDER_PERSONAL_TOKEN}`,
        },
      });

      const data = await response.json();

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // DELETE WEBHOOK
    // ========================================
    if (action === 'delete') {
      const response = await fetch(`${WASENDER_BASE_URL}/webhook`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${WASENDER_PERSONAL_TOKEN}`,
        },
      });

      const data = await response.json();

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook deleted successfully',
          response: data,
        }),
        { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // INVALID ACTION
    // ========================================
    return new Response(
      JSON.stringify({
        error: 'Invalid action',
        valid_actions: ['register', 'list', 'delete']
      }),
      { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in wasender-register-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
