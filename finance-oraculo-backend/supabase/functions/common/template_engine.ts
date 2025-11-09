// =====================================================
// TEMPLATE ENGINE - Processa templates WhatsApp
// =====================================================

import Mustache from 'https://deno.land/x/mustache@v0.3.0/mod.ts';

export interface TemplateData {
  [key: string]: any;
}

export interface InfographicBarData {
  label: string;
  valor: number;
  max: number;
  emoji?: string;
}

export interface InfographicTableData {
  headers: string[];
  rows: string[][];
}

/**
 * Renderiza template com dados
 */
export function renderTemplate(
  template: string,
  data: TemplateData
): string {
  return Mustache.render(template, data);
}

/**
 * Gera barra de progresso ASCII
 */
export function generateProgressBar(
  valor: number,
  max: number,
  width: number = 20
): string {
  const percentual = (valor / max) * 100;
  const filled = Math.round((percentual / 100) * width);
  const empty = width - filled;

  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${percentual.toFixed(0)}%`;
}

/**
 * Gera gráfico de barras ASCII
 */
export function generateBarChart(
  dados: InfographicBarData[],
  width: number = 20
): string {
  let chart = '╔═══════════════════════════════════╗\n';

  dados.forEach((item, index) => {
    const bar = generateProgressBar(item.valor, item.max, width);
    const label = item.label.padEnd(12);
    const emoji = item.emoji || '█';
    
    chart += `║ ${emoji} ${label} ${bar} ║\n`;
  });

  chart += '╚═══════════════════════════════════╝';

  return chart;
}

/**
 * Gera tabela ASCII
 */
export function generateTable(
  data: InfographicTableData,
  colWidths?: number[]
): string {
  if (!data.headers || data.headers.length === 0) {
    return '';
  }

  // Calcular largura das colunas
  const widths = colWidths || data.headers.map(h => Math.max(h.length, 10));

  // Cabeçalho
  let table = '┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐\n';
  table += '│ ' + data.headers.map((h, i) => h.padEnd(widths[i])).join(' │ ') + ' │\n';
  table += '├' + widths.map(w => '─'.repeat(w + 2)).join('┼') + '┤\n';

  // Linhas
  if (data.rows && data.rows.length > 0) {
    data.rows.forEach(row => {
      table += '│ ' + row.map((v, i) => (v || '').padEnd(widths[i])).join(' │ ') + ' │\n';
    });
  }

  // Rodapé
  table += '└' + widths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

  return table;
}

/**
 * Gera heatmap com emojis
 */
export function generateHeatmap(
  dados: { label: string; valores: number[] }[],
  max: number = 100
): string {
  let heatmap = '';

  dados.forEach(item => {
    const label = item.label.padEnd(15);
    const cores = item.valores.map(v => {
      const pct = (v / max) * 100;
      if (pct >= 75) return '🟩';
      if (pct >= 50) return '🟨';
      if (pct >= 25) return '🟧';
      return '🟥';
    });

    heatmap += `${label} ${cores.join('')}\n`;
  });

  heatmap += '\n🟩 Ótimo (75-100%) • 🟨 Bom (50-74%) • 🟧 Atenção (25-49%) • 🟥 Crítico (0-24%)';

  return heatmap;
}

/**
 * Gera gauge de percentual
 */
export function generateGauge(
  valor: number,
  max: number = 100,
  titulo: string = 'Percentual'
): string {
  const pct = Math.round((valor / max) * 100);
  const barWidth = 24;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  return `╔════════════════════════════╗
║ ${titulo}
║ ${bar} ${pct}%
╚════════════════════════════╝`;
}

/**
 * Formata valor monetário para template
 */
export function formatCurrency(valor: number, simbolo: string = 'R$ '): string {
  return (
    simbolo +
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor)
  );
}

/**
 * Formata percentual
 */
export function formatPercent(valor: number, casas: number = 1): string {
  return valor.toFixed(casas) + '%';
}

/**
 * Formata data
 */
export function formatDate(data: string | Date, formato: 'br' | 'en' = 'br'): string {
  const d = typeof data === 'string' ? new Date(data) : data;

  if (formato === 'br') {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(d);
  }

  return d.toISOString();
}

/**
 * Seleciona emoji baseado em valor
 */
export function getEmoji(
  valor: number,
  tipo: 'saldo' | 'tendencia' | 'performance' | 'alerta'
): string {
  switch (tipo) {
    case 'saldo':
      if (valor > 100000) return '🟢';
      if (valor > 50000) return '🟡';
      if (valor > 10000) return '🟠';
      return '🔴';

    case 'tendencia':
      if (valor > 20) return '📈';
      if (valor > 0) return '↗️';
      if (valor < -20) return '📉';
      return '↘️';

    case 'performance':
      if (valor >= 90) return '⭐⭐⭐';
      if (valor >= 70) return '⭐⭐';
      if (valor >= 50) return '⭐';
      return '⚠️';

    case 'alerta':
      if (valor >= 80) return '🔴';
      if (valor >= 60) return '🟠';
      if (valor >= 40) return '🟡';
      return '🟢';

    default:
      return '•';
  }
}

/**
 * Compila template com dados complexos
 */
export function compileTemplate(
  templateName: string,
  data: TemplateData,
  templateContent?: string
): string {
  // Se não fornecer conteúdo, buscar do path padrão (em n8n, será passado)
  const template = templateContent || getTemplateContent(templateName);

  // Enriquecer dados com funções helper
  const enrichedData = {
    ...data,
    // Helpers
    formatCurrency: () => (valor) => formatCurrency(parseFloat(valor)),
    formatPercent: () => (valor) => formatPercent(parseFloat(valor)),
    formatDate: () => (data) => formatDate(data),
    getEmoji: () => (tipo, valor) => getEmoji(parseFloat(valor), tipo),
  };

  return Mustache.render(template, enrichedData);
}

/**
 * Busca conteúdo do template (stub - em n8n isso virá de arquivo)
 */
function getTemplateContent(templateName: string): string {
  const templates: Record<string, string> = {
    'resumo_diario': `🌅 *BOM-DIA EXECUTIVO*\n{{grupo_empresarial}} — {{data_br}}`,
    'alerta_critico': `🚨 *ALERTA CRÍTICO*`,
    'analise_complexa': `📊 *ANÁLISE COMPLEXA*`,
  };

  return templates[templateName] || '';
}

/**
 * Valida template antes de enviar
 */
export function validateTemplate(template: string, requiredFields: string[]): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields = requiredFields.filter(field => !template.includes(`{{${field}}}`));

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Trunca texto para WhatsApp (limite aprox 4096 caracteres)
 */
export function truncateForWhatsApp(text: string, maxChars: number = 4096): string {
  if (text.length <= maxChars) {
    return text;
  }

  return text.substring(0, maxChars - 3) + '...';
}

