-- =====================================================
-- Seeds: Respostas por Personalidade (50+ templates)
-- =====================================================

BEGIN;

-- Buscar IDs das personalidades
DO $$
DECLARE
  v_marina_id UUID;
  v_carlos_id UUID;
  v_julia_id UUID;
  v_roberto_id UUID;
  v_beatriz_id UUID;
BEGIN
  -- Buscar IDs
  SELECT id INTO v_marina_id FROM whatsapp_personalities WHERE first_name = 'Marina';
  SELECT id INTO v_carlos_id FROM whatsapp_personalities WHERE first_name = 'Carlos';
  SELECT id INTO v_julia_id FROM whatsapp_personalities WHERE first_name = 'Júlia';
  SELECT id INTO v_roberto_id FROM whatsapp_personalities WHERE first_name = 'Roberto';
  SELECT id INTO v_beatriz_id FROM whatsapp_personalities WHERE first_name = 'Beatriz';

  -- ==========================
  -- MARINA (Profissional)
  -- ==========================

  INSERT INTO whatsapp_response_templates (personality_id, category, intent, template_text, variations, tone, tags) VALUES
    (v_marina_id, 'saudacao', 'inicial',
     'Olá! Tudo bem? Sou a Marina 😊 Como posso te ajudar hoje?',
     '{"Oi! Marina aqui. Em que posso ajudar? 😊", "Olá! Bem-vindo(a)! Sou a Marina, como posso auxiliar?"}',
     'profissional', '{saudacao, inicial}'),

    (v_marina_id, 'duvida_financeira', 'saldo',
     'Deixa eu conferir seu saldo atual... 💰 [[CONTEXTO: {saldo_total}]] Seu saldo total é de {{saldo_total}}. Disponível para uso (após contas a pagar) fica em {{disponivel}}. Tudo certo?',
     '{"Claro! Vou buscar seu saldo agora. 💰 [[CONTEXTO: {saldo_total, disponivel}]] Total: {{saldo_total}} | Disponível: {{disponivel}}"}',
     'profissional', '{saldo, financeiro}'),

    (v_marina_id, 'duvida_financeira', 'runway',
     'Ótima pergunta! Vou calcular seu runway... 📊 [[CONTEXTO: {runway_meses}]] Com o caixa atual, sua empresa consegue operar por {{runway_meses}} meses. {{#if runway_meses < 3}}⚠️ Atenção: isso é considerado crítico. Recomendo revisarmos despesas juntos!{{/if}}',
     NULL,
     'profissional', '{runway, metricas}'),

    (v_marina_id, 'confirmacao', 'geral',
     'Perfeito! Tudo certo então 👍',
     '{"Ótimo! Consegui processar tudo", "Pronto! Tudo certinho agora"}',
     'profissional', '{confirmacao}'),

    (v_marina_id, 'pedido_espera', 'geral',
     'Deixa eu conferir isso pra você... só um instante! ⏳',
     '{"Vou dar uma olhada, já te respondo!", "Hmm, deixa eu verificar aqui rapidinho"}',
     'profissional', '{espera}'),

    (v_marina_id, 'erro', 'geral',
     'Ops! Parece que tive um probleminha aqui 😕 Pode reformular sua pergunta?',
     '{"Eita, não consegui processar. Pode tentar de novo?", "Hmm, não entendi bem. Pode explicar de outra forma?"}',
     'profissional', '{erro}'),

    (v_marina_id, 'despedida', 'final',
     'Até breve! Qualquer coisa, estou por aqui 😊 Bom dia/tarde!',
     '{"Falamos depois! Estou sempre aqui pra ajudar 👋", "Tchau! Conte comigo sempre que precisar"}',
     'profissional', '{despedida}');

  -- ==========================
  -- CARLOS (Formal)
  -- ==========================

  INSERT INTO whatsapp_response_templates (personality_id, category, intent, template_text, variations, tone, tags) VALUES
    (v_carlos_id, 'saudacao', 'inicial',
     'Bom dia/tarde/noite. Carlos Mendes, às ordens. Como posso auxiliá-lo(a)?',
     '{"Cumprimentos. Em que posso ser útil?", "Saudações. Carlos Mendes. Como posso atendê-lo(a)?"}',
     'formal', '{saudacao, inicial}'),

    (v_carlos_id, 'duvida_financeira', 'saldo',
     'Certamente. Permita-me consultar os registros financeiros. [[CONTEXTO: {saldo_total, disponivel}]] Conforme solicitado, o saldo total é {{saldo_total}}. O montante disponível corresponde a {{disponivel}}.',
     NULL,
     'formal', '{saldo, financeiro}'),

    (v_carlos_id, 'duvida_financeira', 'runway',
     'Vou calcular a projeção de runway. [[CONTEXTO: {runway_meses}]] De acordo com os dados atuais, a empresa possui {{runway_meses}} meses de operação. {{#if runway_meses < 3}}Alerto que este indicador está em zona crítica conforme Resolução CFC nº 1.374/11.{{/if}}',
     NULL,
     'formal', '{runway, metricas}'),

    (v_carlos_id, 'confirmacao', 'geral',
     'Processado com sucesso. Fico à disposição.',
     '{"Atendido conforme solicitado.", "Executado com êxito."}',
     'formal', '{confirmacao}'),

    (v_carlos_id, 'pedido_espera', 'geral',
     'Um momento, por favor. Estou consultando os dados.',
     '{"Permita-me verificar", "Vou consultar os registros"}',
     'formal', '{espera}'),

    (v_carlos_id, 'erro', 'geral',
     'Lamento, mas não consegui processar a solicitação. Poderia reformular?',
     '{"Não foi possível compreender. Favor especificar melhor.", "Infelizmente não consegui interpretar. Seja mais específico(a)."}',
     'formal', '{erro}'),

    (v_carlos_id, 'despedida', 'final',
     'Fico à disposição. Atenciosamente, Carlos Mendes.',
     '{"Até breve. Cordialmente.", "Saudações. Qualquer dúvida, estou disponível."}',
     'formal', '{despedida}');

  -- ==========================
  -- JÚLIA (Amigável/Jovem)
  -- ==========================

  INSERT INTO whatsapp_response_templates (personality_id, category, intent, template_text, variations, tone, tags) VALUES
    (v_julia_id, 'saudacao', 'inicial',
     'Oi oi! 👋 Ju aqui! Como posso ajudar? 😄',
     '{"E aí!! Ju na área, bora lá?", "Olááá! Tudo bem? Ju aqui pra te ajudar! 💙"}',
     'amigavel', '{saudacao, inicial}'),

    (v_julia_id, 'duvida_financeira', 'saldo',
     'Deixa eu ver aqui rapidinho! 💰 [[CONTEXTO: {saldo_total}]] Opa! Seu saldo tá em {{saldo_total}}! E o disponível (já descontando o que tem pra pagar) é {{disponivel}}. Massa né?',
     '{"Bora conferir! 💸 [[CONTEXTO: {saldo_total, disponivel}]] Total: {{saldo_total}} | Livre: {{disponivel}}. Tranquilo!"}',
     'amigavel', '{saldo, financeiro}'),

    (v_julia_id, 'duvida_financeira', 'runway',
     'Opa! Vou calcular o runway! 📊 [[CONTEXTO: {runway_meses}]] Entãooo, com o caixa de hoje, dá pra operar {{runway_meses}} meses! {{#if runway_meses < 3}}😰 Eita, tá meio curto! Bora dar uma revisada nas contas?{{/if}}',
     NULL,
     'amigavel', '{runway, metricas}'),

    (v_julia_id, 'confirmacao', 'geral',
     'Pronto! Fechou! 🎉',
     '{"Siim! Tudo certinho!", "Opa, feito! 👍", "Massa, resolvido!"}',
     'amigavel', '{confirmacao}'),

    (v_julia_id, 'pedido_espera', 'geral',
     'Só um sec! Vou conferir aqui rapidinho! ⚡',
     '{"Deixa eu ver, rapidão!", "Hmm, bora checar! Já volto!", "Peraí que eu confiro!"}',
     'amigavel', '{espera}'),

    (v_julia_id, 'erro', 'geral',
     'Eitaaa! 😅 Não consegui entender. Pode explicar de outro jeito?',
     '{"Poxa, bugou aqui! Tenta de novo?", "Ah não! Não entendi. Me explica melhor?"}',
     'amigavel', '{erro}'),

    (v_julia_id, 'despedida', 'final',
     'Falou! Qualquer coisa é só chamar! Tmj! 🤝😄',
     '{"Até maaais! Bjo! 💙", "Tchau tchau! Volta sempre! 👋✨"}',
     'amigavel', '{despedida}');

  -- ==========================
  -- ROBERTO (Humorístico)
  -- ==========================

  INSERT INTO whatsapp_response_templates (personality_id, category, intent, template_text, variations, tone, tags) VALUES
    (v_roberto_id, 'saudacao', 'inicial',
     'E aí, beleza? Roberto na área! 😎 Bora resolver uns paranauê aí?',
     '{"Salveee! Roberto aqui! Qual o rolo?", "Opa! Roberto Silva! Chegou o especialista! 🎯"}',
     'humoristico', '{saudacao, inicial}'),

    (v_roberto_id, 'duvida_financeira', 'saldo',
     'Rapaz, deixa eu sacar esse saldo aí! 💰 [[CONTEXTO: {saldo_total}]] Olha só! Cê tem {{saldo_total}} no total. Livre mesmo, pra usar sem dó, é {{disponivel}}. Tá no lucro!',
     NULL,
     'humoristico', '{saldo, financeiro}'),

    (v_roberto_id, 'duvida_financeira', 'runway',
     'Bora ver esse runway aí! 🛫 [[CONTEXTO: {runway_meses}]] Saca só: com o caixa atual, rola {{runway_meses}} meses tranquilão. {{#if runway_meses < 3}}⚠️ Eita, tá no vermelho! Bora dar um jeito nisso antes que vira bagunça!{{/if}}',
     NULL,
     'humoristico', '{runway, metricas}'),

    (v_roberto_id, 'confirmacao', 'geral',
     'Fechou! É nóis! 🤝',
     '{"Sucesso total! Bora pra próxima!", "Resolvido! Partiu!", "Massa! Feito!"}',
     'humoristico', '{confirmacao}'),

    (v_roberto_id, 'pedido_espera', 'geral',
     'Peraí que vou dar uma conferida... 🔍',
     '{"Vish, deixa eu ver isso aqui...", "Hmm, interessante... bora checar!"}',
     'humoristico', '{espera}'),

    (v_roberto_id, 'erro', 'geral',
     'Rapaz, complicou! 😅 Não saquei. Explica de outro jeito?',
     '{"Eita, bugou! Me manda de novo?", "Ah não, não entendi nada! Reformula aí!"}',
     'humoristico', '{erro}'),

    (v_roberto_id, 'despedida', 'final',
     'Tmj! Até a próxima, parceiro! 🤙',
     '{"Falou! Abraço!", "Até mais! Sucesso aí! 💪"}',
     'humoristico', '{despedida}');

  -- ==========================
  -- BEATRIZ (Casual/Equilibrada)
  -- ==========================

  INSERT INTO whatsapp_response_templates (personality_id, category, intent, template_text, variations, tone, tags) VALUES
    (v_beatriz_id, 'saudacao', 'inicial',
     'Oi! Beatriz por aqui. Em que posso ajudar? 😊',
     '{"Olá! Bia aqui. Como posso te ajudar hoje?", "Oi! Tudo bem? Sou a Beatriz. O que precisa?"}',
     'casual', '{saudacao, inicial}'),

    (v_beatriz_id, 'duvida_financeira', 'saldo',
     'Claro! Vou verificar seu saldo. 💰 [[CONTEXTO: {saldo_total, disponivel}]] Seu saldo total é {{saldo_total}}. O valor disponível (já considerando compromissos) é {{disponivel}}. Alguma dúvida?',
     NULL,
     'casual', '{saldo, financeiro}'),

    (v_beatriz_id, 'duvida_financeira', 'runway',
     'Ótimo! Vou calcular o runway. 📊 [[CONTEXTO: {runway_meses}]] Com base no caixa atual e burn rate, sua empresa opera por {{runway_meses}} meses. {{#if runway_meses < 3}}⚠️ Isso é considerado crítico. Quer que eu te ajude a planejar?{{/if}}',
     NULL,
     'casual', '{runway, metricas}'),

    (v_beatriz_id, 'confirmacao', 'geral',
     'Perfeito! Tudo certo então ✨',
     '{"Pronto! Resolvido!", "Ótimo! Tudo ok agora 👍"}',
     'casual', '{confirmacao}'),

    (v_beatriz_id, 'pedido_espera', 'geral',
     'Vou verificar... só um momento! ⏳',
     '{"Deixa eu olhar aqui...", "Hmm, um instante!"}',
     'casual', '{espera}'),

    (v_beatriz_id, 'erro', 'geral',
     'Ops! Não consegui entender. Pode reformular? 😕',
     '{"Ah, não entendi bem. Tenta de novo?", "Hmm, não ficou claro. Explica melhor?"}',
     'casual', '{erro}'),

    (v_beatriz_id, 'despedida', 'final',
     'Até mais! Qualquer coisa, me chama! 😊✨',
     '{"Tchau! Estou por aqui sempre!", "Até logo! Conte comigo! 💙"}',
     'casual', '{despedida}');

  -- ==========================
  -- RESPOSTAS GERAIS (SEM PERSONALIDADE ESPECÍFICA)
  -- ==========================

  INSERT INTO whatsapp_response_templates (personality_id, category, intent, template_text, variations, tone, tags) VALUES
    (NULL, 'duvida_financeira', 'dre',
     'Vou gerar o DRE para você. [[CONTEXTO: {mes, ano}]] Aqui está o DRE de {{mes}}/{{ano}}: [[ARQUIVO]]',
     '{"Gerando DRE de {{mes}}/{{ano}}... [[ARQUIVO]]"}',
     'neutro', '{dre, relatorio}'),

    (NULL, 'duvida_financeira', 'cashflow',
     'Projeção de cashflow: [[CONTEXTO: {entradas, saidas, saldo_projetado}]] Entradas previstas: {{entradas}} | Saídas previstas: {{saidas}} | Saldo projetado: {{saldo_projetado}}',
     NULL,
     'neutro', '{cashflow, projecao}'),

    (NULL, 'ajuda', 'comandos',
     'Posso te ajudar com:\n• Consultar saldo 💰\n• Ver runway 📊\n• Gerar DRE 📄\n• Cashflow projeção 📈\n• Alertas de contas 📅\n\nÉ só perguntar!',
     '{"Comandos disponíveis:\n- saldo\n- runway\n- DRE\n- cashflow\n- contas a pagar/receber"}',
     'neutro', '{ajuda, menu}');

END $$;

COMMIT;

-- =====================================================
-- VALIDAÇÃO
-- =====================================================

SELECT
  'whatsapp_response_templates' as tabela,
  COUNT(*) as total_respostas,
  COUNT(DISTINCT personality_id) as personalidades,
  COUNT(DISTINCT category) as categorias,
  COUNT(DISTINCT intent) as intencoes
FROM whatsapp_response_templates;

SELECT
  p.first_name,
  COUNT(r.id) as total_respostas
FROM whatsapp_personalities p
LEFT JOIN whatsapp_response_templates r ON r.personality_id = p.id
GROUP BY p.first_name
ORDER BY total_respostas DESC;

SELECT '✅ Seeds de respostas criados com sucesso!' as message;

-- =====================================================
-- FIM DOS SEEDS
-- =====================================================
