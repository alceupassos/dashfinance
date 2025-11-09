import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient, onlyDigits, corsHeaders } from '../common/db.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

interface KPIData {
  month: string;
  receita: number;
  custos: number;
  despesas: number;
  outras: number;
  ebitda: number;
  margem_bruta: number;
}

interface AnalysisResult {
  cnpj: string;
  company_name?: string;
  period: {
    from: string;
    to: string;
  };
  kpis: KPIData[];
  analysis: {
    text: string;
    highlights: string[];
    recommendations: string[];
  };
  charts_metadata: {
    type: string;
    title: string;
    data_keys: string[];
  }[];
}

async function getKPIData(cnpj: string, from: string, to: string): Promise<KPIData[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_kpi_monthly_enriched')
    .select('*')
    .eq('company_cnpj', onlyDigits(cnpj))
    .gte('month', from)
    .lte('month', to)
    .order('month', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch KPI data: ${error.message}`);
  }

  return data || [];
}

async function analyzeWithOpenAI(kpis: KPIData[]): Promise<string> {
  const prompt = `Você é um analista financeiro especializado. Analise os seguintes dados financeiros mensais e forneça insights estratégicos:

${JSON.stringify(kpis, null, 2)}

Forneça uma análise completa incluindo:
1. Tendências de receita e margem
2. Eficiência operacional
3. Saúde financeira geral
4. Recomendações estratégicas

Seja específico com números e percentuais.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é um CFO experiente e consultor financeiro.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

async function analyzeWithAnthropic(kpis: KPIData[]): Promise<string> {
  const prompt = `Você é um analista financeiro técnico. Analise os seguintes dados financeiros mensais com rigor técnico:

${JSON.stringify(kpis, null, 2)}

Forneça uma análise técnica incluindo:
1. Métricas e indicadores financeiros
2. Análise de variações percentuais
3. Comparação entre períodos
4. Alertas e pontos de atenção

Seja preciso e objetivo com dados quantitativos.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

function extractHighlights(kpis: KPIData[]): string[] {
  const highlights: string[] = [];

  if (kpis.length < 2) {
    return ['Dados insuficientes para análise comparativa'];
  }

  const latest = kpis[kpis.length - 1];
  const previous = kpis[kpis.length - 2];

  const receitaGrowth = ((latest.receita - previous.receita) / previous.receita) * 100;
  const margemChange = latest.margem_bruta - previous.margem_bruta;

  if (receitaGrowth > 0) {
    highlights.push(`Receita cresceu ${receitaGrowth.toFixed(1)}% no último mês`);
  } else {
    highlights.push(`Receita caiu ${Math.abs(receitaGrowth).toFixed(1)}% no último mês`);
  }

  if (margemChange > 0) {
    highlights.push(`Margem bruta melhorou ${(margemChange * 100).toFixed(1)}pp`);
  } else if (margemChange < 0) {
    highlights.push(`Margem bruta caiu ${Math.abs(margemChange * 100).toFixed(1)}pp`);
  }

  const avgEbitda = kpis.reduce((sum, k) => sum + k.ebitda, 0) / kpis.length;
  if (latest.ebitda > avgEbitda * 1.1) {
    highlights.push('EBITDA acima da média do período');
  } else if (latest.ebitda < avgEbitda * 0.9) {
    highlights.push('EBITDA abaixo da média do período');
  }

  return highlights;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const style = url.searchParams.get('style') || 'technical';
    const cnpj = url.searchParams.get('cnpj');
    const from = url.searchParams.get('from') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = url.searchParams.get('to') || new Date().toISOString().split('T')[0];

    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'CNPJ is required' }),
        {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      );
    }

    const kpis = await getKPIData(cnpj, from, to);

    if (kpis.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data found for the specified period' }),
        {
          status: 404,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      );
    }

    let analysisText: string;

    if (style === 'creative' && OPENAI_API_KEY) {
      analysisText = await analyzeWithOpenAI(kpis);
    } else if (style === 'technical' && ANTHROPIC_API_KEY) {
      analysisText = await analyzeWithAnthropic(kpis);
    } else {
      analysisText = 'Análise automática não disponível. Configure as chaves de API.';
    }

    const highlights = extractHighlights(kpis);

    const result: AnalysisResult = {
      cnpj,
      period: { from, to },
      kpis,
      analysis: {
        text: analysisText,
        highlights,
        recommendations: [
          'Monitore a margem bruta mensalmente',
          'Revise estrutura de custos se EBITDA < 15%',
          'Analise sazonalidade de receitas',
        ],
      },
      charts_metadata: [
        {
          type: 'line',
          title: 'Evolução de Receita e EBITDA',
          data_keys: ['month', 'receita', 'ebitda'],
        },
        {
          type: 'bar',
          title: 'Composição de Custos e Despesas',
          data_keys: ['month', 'custos', 'despesas'],
        },
        {
          type: 'line',
          title: 'Margem Bruta (%)',
          data_keys: ['month', 'margem_bruta'],
        },
      ],
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  }
});
