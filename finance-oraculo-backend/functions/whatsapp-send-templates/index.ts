// ===================================================
// Edge Function: whatsapp-send-templates
// Envia templates WhatsApp com imagens SVG elegantes
// ===================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Gerador de SVG moderno (dark mode + neon accents + mobile-first 2025)
function generateTemplateSVG(template: any, data: any): string {
  const width = 1080; // Mobile-optimized (Instagram story size)
  const height = 1920;

  // Dark mode colors (trend 2025: dark + neon)
  const colors = {
    bg: '#0a0a0b', // deep black
    card: '#1a1a1f', // dark card
    cardLight: '#25252d', // lighter card
    neonCyan: '#00f0ff', // neon cyan
    neonPurple: '#b000ff', // neon purple
    neonGreen: '#00ff94', // neon green
    neonOrange: '#ff6b00', // neon orange
    neonPink: '#ff00ff', // neon pink
    text: '#ffffff',
    textMuted: '#a0a0b0',
    textDim: '#606070',
  };

  // Escolher cor neon baseada na categoria
  const categoryColor =
    template.category === 'utility' ? colors.neonCyan :
    template.category === 'marketing' ? colors.neonPurple :
    colors.neonGreen;

  // Ícone baseado no nome do template
  const icon =
    template.name.includes('saldo') ? '💰' :
    template.name.includes('runway') ? '⚠️' :
    template.name.includes('resumo') ? '📊' :
    template.name.includes('vencimento') ? '📅' :
    template.name.includes('meta') ? '🎯' :
    template.name.includes('cashflow') ? '📈' :
    template.name.includes('dica') ? '💡' :
    template.name.includes('ebitda') ? '💼' :
    template.name.includes('checklist') ? '✅' :
    '📊';

  // Parse body lines
  const bodyLines = (template.content.body || '').split('\\n').filter(l => l.trim());
  const header = template.content.header || template.name;

  // Template SVG moderno (dark + neon + mobile-first)
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradiente dark -->
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${colors.card};stop-opacity:0.9" />
          <stop offset="100%" style="stop-color:${colors.bg};stop-opacity:1" />
        </linearGradient>

        <!-- Neon glow effect -->
        <filter id="neon-glow">
          <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- Card shadow -->
        <filter id="card-shadow">
          <feDropShadow dx="0" dy="20" stdDeviation="30" flood-color="${categoryColor}" flood-opacity="0.3"/>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bg-gradient)"/>

      <!-- Decorative neon circles (abstract) -->
      <circle cx="100" cy="200" r="150" fill="${categoryColor}" opacity="0.1" filter="url(#neon-glow)"/>
      <circle cx="980" cy="1700" r="200" fill="${colors.neonPink}" opacity="0.08" filter="url(#neon-glow)"/>

      <!-- Main Card -->
      <rect x="60" y="200" width="960" height="1520" rx="40"
            fill="${colors.card}" filter="url(#card-shadow)"/>

      <!-- Neon accent line top -->
      <rect x="60" y="200" width="960" height="12" rx="6" fill="${categoryColor}"/>

      <!-- Header section -->
      <text x="540" y="350" font-family="Inter, system-ui, -apple-system, sans-serif"
            font-size="120" font-weight="700" fill="${categoryColor}" text-anchor="middle"
            filter="url(#neon-glow)">
        ${icon}
      </text>

      <text x="540" y="500" font-family="Inter, system-ui, -apple-system, sans-serif"
            font-size="64" font-weight="800" fill="${colors.text}" text-anchor="middle"
            letter-spacing="2">
        ${header.toUpperCase().substring(0, 20)}
      </text>

      <!-- Divider neon line -->
      <line x1="160" y1="580" x2="920" y2="580"
            stroke="${categoryColor}" stroke-width="3" opacity="0.5"/>

      <!-- Body content -->
      ${bodyLines.slice(0, 12).map((line: string, i: number) => {
        const y = 700 + i * 90;
        const isHeader = line.includes(':') && !line.includes('R$');
        const fontSize = isHeader ? 52 : 46;
        const fontWeight = isHeader ? '700' : '500';
        const fillColor = isHeader ? colors.neonCyan :
                         line.includes('R$') ? colors.neonGreen :
                         line.includes('•') ? colors.textMuted :
                         colors.text;

        // Limitar tamanho da linha para mobile
        const displayLine = line.length > 35 ? line.substring(0, 32) + '...' : line;

        return `
        <text x="140" y="${y}" font-family="Inter, system-ui, -apple-system, sans-serif"
              font-size="${fontSize}" font-weight="${fontWeight}" fill="${fillColor}">
          ${displayLine.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </text>`;
      }).join('')}

      <!-- Footer section -->
      <rect x="60" y="1708" width="960" height="12" rx="6" fill="${categoryColor}" opacity="0.3"/>

      <text x="540" y="1650" font-family="Inter, system-ui, -apple-system, sans-serif"
            font-size="36" font-weight="600" fill="${colors.textDim}" text-anchor="middle">
        Finance Oráculo
      </text>

      <text x="540" y="1800" font-family="Inter, system-ui, -apple-system, sans-serif"
            font-size="32" fill="${colors.textDim}" text-anchor="middle">
        ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
      </text>

      <!-- Neon accent dots -->
      <circle cx="200" cy="1650" r="8" fill="${colors.neonPurple}" filter="url(#neon-glow)"/>
      <circle cx="880" cy="1650" r="8" fill="${colors.neonPink}" filter="url(#neon-glow)"/>
    </svg>
  `.trim();
}

// Converter SVG para PNG usando resvg (Deno FFI)
async function svgToPng(svgString: string): Promise<Uint8Array> {
  // Por enquanto, retornar SVG como base64 (Evolution aceita)
  // TODO: Implementar conversão real para PNG se necessário
  const encoder = new TextEncoder();
  return encoder.encode(svgString);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL') || 'http://localhost:8080';
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY') || 'D7BED4328F0C-4EA8-AD7A-08F72F6777E9';
    const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'iFinance';

    // 1. Buscar template a ser enviado (round-robin)
    const { data: templates, error: templatesError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('status', 'approved')
      .order('name');

    if (templatesError || !templates || templates.length === 0) {
      return new Response(JSON.stringify({
        error: 'Nenhum template aprovado encontrado',
        details: templatesError?.message
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Selecionar template (round-robin via timestamp)
    const now = new Date();
    const minutesSinceEpoch = Math.floor(now.getTime() / 1000 / 600); // 10min intervals
    const templateIndex = minutesSinceEpoch % templates.length;
    const template = templates[templateIndex];

    console.log(`Enviando template: ${template.name} (${templateIndex + 1}/${templates.length})`);

    // 3. Buscar empresa de teste (primeira ativa)
    const { data: empresa } = await supabase
      .from('clientes')
      .select('cnpj, razao_social, status')
      .eq('status', 'Ativo')
      .limit(1)
      .single();

    if (!empresa) {
      return new Response(JSON.stringify({ error: 'Nenhuma empresa ativa encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Buscar dados reais para preencher template
    let templateData: any = {};

    try {
      const { data: cards } = await supabase.rpc('get_cached_cards', {
        p_cnpj: empresa.cnpj,
        p_cards: ['total_caixa', 'disponivel', 'runway', 'receitas_mes', 'despesas_mes']
      });

      templateData = {
        razao_social: empresa.razao_social,
        saldo_total: cards?.total_caixa?.formatted || 'R$ 0,00',
        disponivel: cards?.disponivel?.formatted || 'R$ 0,00',
        contas_pagar: 'R$ 0,00', // TODO: buscar real
        timestamp: new Date().toLocaleString('pt-BR'),
        runway_meses: cards?.runway?.value?.toFixed(1) || '0',
        status: cards?.runway?.alert || 'ok',
        receitas: cards?.receitas_mes?.formatted || 'R$ 0,00',
        despesas: cards?.despesas_mes?.formatted || 'R$ 0,00',
        resultado: 'R$ 0,00',
        margem: '0',
        top_categoria: 'Geral',
        qtd: '0',
        lista_contas: 'Nenhuma',
        total: 'R$ 0,00',
        percentual: '100',
        tipo_meta: 'receitas',
        valor_atingido: 'R$ 100.000',
        valor_meta: 'R$ 100.000',
        entradas: 'R$ 50.000',
        saidas: 'R$ 40.000',
        saldo_projetado: 'R$ 10.000',
        status_cashflow: 'Positivo',
        dica_texto: 'Mantenha sempre uma reserva de emergência de 3-6 meses de despesas operacionais.',
        mes_atual: new Date().toLocaleString('pt-BR', { month: 'long' }),
        mes_anterior: new Date(Date.now() - 30*24*60*60*1000).toLocaleString('pt-BR', { month: 'long' }),
        variacao_receitas: '+5%',
        variacao_despesas: '+2%',
        variacao_lucro: '+15%',
        destaque: 'Redução de custos fixos',
        ebitda: 'R$ 50.000',
        margem_ebitda: '25',
        despesas_op: 'R$ 30.000',
        checklist_items: '☑️ Conciliação bancária\\n☑️ Lançamentos manuais\\n☐ Fechamento DRE',
        concluidas: '2',
      };
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      // Usar dados mock
    }

    // 5. Interpolar variáveis no template
    let messageText = template.content.body || '';
    for (const [key, value] of Object.entries(templateData)) {
      messageText = messageText.replaceAll(`{{${key}}}`, String(value));
    }

    // 6. Gerar SVG
    const svg = generateTemplateSVG(template, templateData);

    // 7. Upload SVG para Supabase Storage
    const fileName = `template_${template.name}_${Date.now()}.svg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(fileName, svg, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      throw uploadError;
    }

    // 8. Obter URL pública
    const { data: urlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    const mediaUrl = urlData.publicUrl;

    // 9. Buscar número de destino (de whatsapp_chat_sessions ou usar número teste)
    const { data: sessions } = await supabase
      .from('whatsapp_chat_sessions')
      .select('phone_number')
      .eq('company_cnpj', empresa.cnpj)
      .eq('status', 'active')
      .limit(1);

    const phoneNumber = sessions?.[0]?.phone_number || Deno.env.get('TEST_PHONE_NUMBER');

    if (!phoneNumber) {
      return new Response(JSON.stringify({
        error: 'Nenhum número de destino configurado',
        details: 'Configure TEST_PHONE_NUMBER ou adicione sessão em whatsapp_chat_sessions'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 10. Enviar via Evolution API
    const evolutionResponse = await fetch(`${evolutionUrl}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey
      },
      body: JSON.stringify({
        number: phoneNumber,
        mediatype: 'image',
        media: mediaUrl,
        caption: messageText
      })
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      throw new Error(`Evolution API error: ${errorText}`);
    }

    const evolutionResult = await evolutionResponse.json();

    // 11. Log no banco
    await supabase.from('whatsapp_conversations').insert({
      phone_number: phoneNumber,
      message_type: 'image',
      message_text: messageText,
      media_url: mediaUrl,
      media_type: 'image/svg+xml',
      direction: 'outgoing',
      company_cnpj: empresa.cnpj,
      status: 'sent',
      metadata: {
        template_name: template.name,
        evolution_response: evolutionResult
      }
    });

    return new Response(JSON.stringify({
      success: true,
      template: template.name,
      phone: phoneNumber,
      empresa: empresa.razao_social,
      media_url: mediaUrl,
      evolution_response: evolutionResult,
      next_template_in: '10 minutos',
      next_template_index: (templateIndex + 1) % templates.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao enviar template:', error);
    return new Response(JSON.stringify({
      error: 'Erro ao enviar template WhatsApp',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
