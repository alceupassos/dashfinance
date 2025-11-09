# 📱 SISTEMA DE ONBOARDING AUTOMÁTICO VIA WHATSAPP

## 🎯 FLUXO COMPLETO

### 📋 PASSO A PASSO

#### 1️⃣ **ADMIN GERA TOKEN NO SISTEMA (Web)**

```
Admin acessa: /admin/tokens/novo

Preenche:
- CNPJ: 12.345.678/0001-90
- Razão Social: Volpe Diadema
- Grupo: Grupo Volpe (opcional)
- Nome do Contato: João Silva
- Email: joao@volpe.com (opcional)

Sistema gera:
- TOKEN: VLP-2024-A3F9K2
- Link WhatsApp: wa.me/5511999998888?text=TOKEN:%20VLP-2024-A3F9K2

Admin envia token para o cliente via:
- Email
- SMS
- Link direto do WhatsApp (pré-preenchido)
```

#### 2️⃣ **CLIENTE INICIA CONVERSA (WhatsApp)**

```
Cliente abre WhatsApp e manda:

"TOKEN: VLP-2024-A3F9K2"

ou clica no link que já vem preenchido
```

#### 3️⃣ **SISTEMA RESPONDE AUTOMATICAMENTE**

```
🔄 Verificando seu token...

✅ Token validado com sucesso!

👤 Olá! Bem-vindo ao DashFinance!

🏢 EMPRESA CADASTRADA:
━━━━━━━━━━━━━━━━━━━━━━
• Volpe Diadema
• CNPJ: 12.345.678/0001-90
• Grupo: Grupo Volpe

📱 Seu número foi vinculado automaticamente!

🔔 Configurei alertas padrão para você:
✓ Saldo baixo (< R$ 5.000)
✓ Inadimplência alta (> 10%)
✓ Contas vencendo (3 dias)

━━━━━━━━━━━━━━━━━━━━━━

📱 MENU PRINCIPAL
Digite o número da opção:

1️⃣ Ver meus alertas ativos
2️⃣ Configurar alertas
3️⃣ Adicionar outra empresa
4️⃣ Minhas preferências
5️⃣ Estatísticas
6️⃣ Ajuda

Digite: 1, 2, 3, 4, 5 ou 6
```

#### 4️⃣ **CLIENTE INTERAGE COM MENU**

**Exemplo: Cliente digita "1"**

```
📊 ALERTAS ATIVOS
━━━━━━━━━━━━━━━━━━━━━━

🔴 2 CRÍTICOS
🟠 5 ALTA PRIORIDADE
🟡 8 MÉDIA PRIORIDADE

━━━━━━━━━━━━━━━━━━━━━━

🔴 Saldo Baixo - Volpe Diadema
R$ 1.245,00 (abaixo de R$ 5.000)
há 30 minutos

🔴 Inadimplência 15,3% - Volpe Grajaú
Limite: 10% | 23 títulos vencidos
há 2 horas

🟠 5 contas vencendo amanhã
Total: R$ 15.340,00

━━━━━━━━━━━━━━━━━━━━━━

Digite:
• 0 para voltar ao menu
• Número do alerta para detalhes
```

**Exemplo: Cliente digita "2"**

```
⚙️ CONFIGURAR ALERTAS
━━━━━━━━━━━━━━━━━━━━━━

Escolha o que deseja configurar:

1️⃣ Tipos de alertas (ativar/desativar)
2️⃣ Horários de verificação
3️⃣ Valores e limites (thresholds)
4️⃣ Horário de silêncio
5️⃣ Formato das mensagens
6️⃣ Empresas monitoradas

0️⃣ Voltar

Digite a opção:
```

**Exemplo: Cliente digita "3"**

```
🏢 ADICIONAR EMPRESA
━━━━━━━━━━━━━━━━━━━━━━

Você já tem acesso a:
• Volpe Diadema (12.345.678/0001-90)

Para adicionar outra empresa, me envie
o TOKEN que você recebeu.

Exemplo:
TOKEN: VLP-2024-X9Y2K1

━━━━━━━━━━━━━━━━━━━━━━

Ou digite 0 para voltar ao menu.
```

---

## 🗄️ ESTRUTURA DE DADOS

### 1. Tabela: `onboarding_tokens`

```sql
create table onboarding_tokens (
  id uuid primary key default gen_random_uuid(),
  
  -- Token único
  token text unique not null,
  token_display text not null, -- Formato amigável: VLP-2024-A3F9K2
  
  -- Dados da empresa
  company_cnpj text not null,
  company_name text not null,
  grupo_empresarial text,
  
  -- Contato
  contact_name text,
  contact_email text,
  
  -- Quem gerou (admin/vendedor)
  created_by uuid references users(id),
  created_by_name text,
  
  -- Status
  status text default 'pending', -- 'pending', 'activated', 'expired', 'revoked'
  activated_at timestamptz,
  activated_by_phone text, -- Número que ativou (com DDD)
  
  -- Configuração padrão ao ativar
  default_config jsonb default '{
    "alertas": [
      {
        "tipo": "saldo_baixo",
        "ativo": true,
        "config": {"saldo_minimo": 5000}
      },
      {
        "tipo": "inadimplencia_alta",
        "ativo": true,
        "config": {"limite_percentual": 10}
      },
      {
        "tipo": "contas_vencendo",
        "ativo": true,
        "config": {"dias_antecedencia": 3, "valor_minimo": 500}
      }
    ],
    "horarios_verificacao": ["08:00", "14:00", "18:00"],
    "horario_silencio": {
      "inicio": "22:00",
      "fim": "07:00",
      "fim_semana": true
    },
    "formato_mensagem": "detalhado",
    "frequencia_maxima": "1_por_hora"
  }',
  
  -- Validade
  expires_at timestamptz default (now() + interval '30 days'),
  
  -- Link direto WhatsApp
  whatsapp_link text, -- wa.me/5511999998888?text=TOKEN:%20VLP-2024-A3F9K2
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_onboarding_tokens_token on onboarding_tokens (token);
create index idx_onboarding_tokens_status on onboarding_tokens (status) where status = 'pending';
create index idx_onboarding_tokens_cnpj on onboarding_tokens (company_cnpj);
create index idx_onboarding_tokens_expires on onboarding_tokens (expires_at);

comment on table onboarding_tokens is 'Tokens para cadastro automático via WhatsApp';
```

### 2. Tabela: `whatsapp_sessions`

```sql
create table whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  
  -- Identificação
  phone_number text not null unique, -- +5511999999999
  user_id uuid references users(id),
  
  -- Estado da conversa
  current_menu text default 'main', 
  -- Valores: 'main', 'alertas_ativos', 'configurar_alertas', 
  --         'adicionar_empresa', 'preferencias', 'estatisticas'
  
  submenu text, -- Submenu atual, se houver
  
  -- Contexto temporário
  context jsonb default '{}',
  -- Exemplo: {"aguardando": "cnpj", "acao": "adicionar_empresa"}
  
  -- Última interação
  last_message_at timestamptz default now(),
  last_message_text text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_whatsapp_sessions_phone on whatsapp_sessions (phone_number);
create index idx_whatsapp_sessions_user on whatsapp_sessions (user_id);
create index idx_whatsapp_sessions_last_message on whatsapp_sessions (last_message_at desc);

comment on table whatsapp_sessions is 'Sessões ativas de conversas no WhatsApp';
```

### 3. Tabela: `whatsapp_messages`

```sql
create table whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  
  -- Identificação
  phone_number text not null,
  session_id uuid references whatsapp_sessions(id),
  user_id uuid references users(id),
  
  -- Direção
  direction text not null, -- 'inbound' (cliente -> sistema), 'outbound' (sistema -> cliente)
  
  -- Conteúdo
  message_text text,
  message_type text default 'text', -- 'text', 'image', 'document', 'audio', etc
  
  -- IDs externos (WASender)
  external_message_id text,
  
  -- Processamento
  processed boolean default false,
  processed_at timestamptz,
  
  -- Comando/Ação detectada
  detected_command text, -- 'token', 'menu_option', 'cancel', etc
  command_params jsonb,
  
  -- Dados brutos
  raw_data jsonb,
  
  created_at timestamptz default now()
);

create index idx_whatsapp_messages_phone on whatsapp_messages (phone_number);
create index idx_whatsapp_messages_session on whatsapp_messages (session_id);
create index idx_whatsapp_messages_created on whatsapp_messages (created_at desc);
create index idx_whatsapp_messages_direction on whatsapp_messages (direction);
create index idx_whatsapp_messages_processed on whatsapp_messages (processed) where processed = false;

comment on table whatsapp_messages is 'Log de todas as mensagens do WhatsApp';
```

### 4. Tabela: `user_companies` (relação N:N)

```sql
create table user_companies (
  id uuid primary key default gen_random_uuid(),
  
  user_id uuid references users(id) on delete cascade,
  company_cnpj text not null,
  company_name text not null,
  grupo_empresarial text,
  
  -- Permissões (futuro)
  role text default 'owner', -- 'owner', 'manager', 'viewer'
  
  -- Como foi adicionada
  added_via text default 'token', -- 'token', 'manual', 'invitation'
  token_used text,
  
  active boolean default true,
  
  created_at timestamptz default now(),
  
  unique(user_id, company_cnpj)
);

create index idx_user_companies_user on user_companies (user_id);
create index idx_user_companies_cnpj on user_companies (company_cnpj);
create index idx_user_companies_active on user_companies (active) where active = true;

comment on table user_companies is 'Empresas que cada usuário tem acesso';
```

---

## 🤖 EDGE FUNCTIONS

### 1. **`whatsapp-webhook`** - Recebe mensagens do cliente

```typescript
// supabase/functions/whatsapp-webhook/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(...);
  
  // WASender envia webhook assim:
  const webhook = await req.json();
  
  const {
    number, // Número do cliente (ex: 5511999999999)
    text,   // Texto da mensagem
    messageId,
    timestamp,
  } = webhook;
  
  console.log(`📥 Mensagem de ${number}: "${text}"`);
  
  // 1. Salvar mensagem no log
  const { data: message } = await supabase
    .from('whatsapp_messages')
    .insert({
      phone_number: `+${number}`,
      direction: 'inbound',
      message_text: text,
      external_message_id: messageId,
      raw_data: webhook,
    })
    .select()
    .single();
  
  // 2. Processar mensagem
  await processarMensagem(supabase, `+${number}`, text, message.id);
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

/**
 * Processa mensagem do cliente
 */
async function processarMensagem(
  supabase: any,
  phone: string,
  text: string,
  messageId: string
) {
  const textoLimpo = text.trim();
  
  // 1️⃣ COMANDO: TOKEN
  if (/^TOKEN:\s*\S+/i.test(textoLimpo)) {
    return await processarToken(supabase, phone, textoLimpo);
  }
  
  // 2️⃣ COMANDO: Opção de menu (1-9 ou 0)
  if (/^[0-9]$/.test(textoLimpo)) {
    return await processarOpcaoMenu(supabase, phone, textoLimpo);
  }
  
  // 3️⃣ COMANDO: Cancelar
  if (/^(cancelar|sair|voltar|menu)$/i.test(textoLimpo)) {
    return await voltarMenuPrincipal(supabase, phone);
  }
  
  // 4️⃣ COMANDO: Ajuda
  if (/^(ajuda|help|\?)$/i.test(textoLimpo)) {
    return await enviarAjuda(supabase, phone);
  }
  
  // 5️⃣ Verificar se há contexto ativo (aguardando resposta)
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone_number', phone)
    .single();
  
  if (session?.context?.aguardando) {
    return await processarContexto(supabase, phone, textoLimpo, session);
  }
  
  // 6️⃣ Mensagem não reconhecida
  await enviarMensagemWhatsApp(supabase, phone, `
❓ Desculpe, não entendi sua mensagem.

Para começar, envie seu TOKEN:
*TOKEN: seu-token-aqui*

Ou digite:
• *MENU* - Ver menu principal
• *AJUDA* - Ver comandos disponíveis
  `);
}
```

### 2. **`process-whatsapp-token`** - Processa token

```typescript
async function processarToken(supabase: any, phone: string, text: string) {
  // Extrair token do texto
  const match = text.match(/TOKEN:\s*(\S+)/i);
  if (!match) {
    return await enviarMensagemWhatsApp(supabase, phone, `
❌ Formato inválido.

Use: *TOKEN: seu-token-aqui*

Exemplo: TOKEN: VLP-2024-A3F9K2
    `);
  }
  
  const token = match[1].toUpperCase();
  
  console.log(`🔑 Processando token: ${token} para ${phone}`);
  
  // Buscar token no banco
  const { data: tokenData, error } = await supabase
    .from('onboarding_tokens')
    .select('*')
    .eq('token_display', token)
    .single();
  
  if (error || !tokenData) {
    return await enviarMensagemWhatsApp(supabase, phone, `
❌ Token não encontrado ou inválido.

Verifique se digitou corretamente:
*${token}*

Se o problema persistir, entre em contato
com quem lhe forneceu o token.
    `);
  }
  
  // Verificar status
  if (tokenData.status === 'activated') {
    return await enviarMensagemWhatsApp(supabase, phone, `
⚠️ Este token já foi ativado anteriormente.

Se você é o dono desta empresa e perdeu
o acesso, entre em contato com o suporte.
    `);
  }
  
  if (tokenData.status === 'expired' || tokenData.status === 'revoked') {
    return await enviarMensagemWhatsApp(supabase, phone, `
❌ Este token expirou ou foi revogado.

Solicite um novo token ao administrador.
    `);
  }
  
  // Verificar validade
  if (new Date(tokenData.expires_at) < new Date()) {
    await supabase
      .from('onboarding_tokens')
      .update({ status: 'expired' })
      .eq('id', tokenData.id);
    
    return await enviarMensagemWhatsApp(supabase, phone, `
❌ Token expirado.

Este token era válido até ${formatarData(tokenData.expires_at)}.

Solicite um novo token ao administrador.
    `);
  }
  
  // ✅ TOKEN VÁLIDO - Iniciar onboarding
  await realizarOnboarding(supabase, phone, tokenData);
}

/**
 * Realiza onboarding completo do usuário
 */
async function realizarOnboarding(supabase: any, phone: string, tokenData: any) {
  console.log(`✅ Iniciando onboarding para ${phone}`);
  
  // 1. Buscar ou criar usuário
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('telefone_whatsapp', phone)
    .single();
  
  if (!user) {
    // Criar novo usuário
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        email: tokenData.contact_email || `${phone.replace(/\D/g, '')}@temp.com`,
        nome: tokenData.contact_name || 'Usuário',
        telefone_whatsapp: phone,
        role: 'client',
      })
      .select()
      .single();
    
    user = newUser;
    console.log(`✅ Usuário criado: ${user.id}`);
  }
  
  // 2. Adicionar empresa ao usuário
  await supabase.from('user_companies').insert({
    user_id: user.id,
    company_cnpj: tokenData.company_cnpj,
    company_name: tokenData.company_name,
    grupo_empresarial: tokenData.grupo_empresarial,
    added_via: 'token',
    token_used: tokenData.token_display,
  });
  
  // 3. Criar regras de alerta padrão
  const defaultAlerts = tokenData.default_config.alertas || [];
  
  for (const alert of defaultAlerts) {
    if (!alert.ativo) continue;
    
    await supabase.from('alert_rules').insert({
      user_id: user.id,
      company_cnpj: tokenData.company_cnpj,
      tipo_alerta: alert.tipo,
      categoria: getCategoriaAlerta(alert.tipo),
      nome: getNomeAlerta(alert.tipo),
      ativo: true,
      config: alert.config,
      notify_whatsapp: true,
      notify_email: false,
      notify_sistema: true,
      horarios_verificacao: tokenData.default_config.horarios_verificacao,
      frequencia_maxima: tokenData.default_config.frequencia_maxima,
      horario_silencio_inicio: tokenData.default_config.horario_silencio?.inicio,
      horario_silencio_fim: tokenData.default_config.horario_silencio?.fim,
      silencio_fim_semana: tokenData.default_config.horario_silencio?.fim_semana,
      formato_mensagem: tokenData.default_config.formato_mensagem,
    });
  }
  
  // 4. Criar/Atualizar sessão WhatsApp
  await supabase.from('whatsapp_sessions').upsert({
    phone_number: phone,
    user_id: user.id,
    current_menu: 'main',
    context: {},
    last_message_at: new Date().toISOString(),
  });
  
  // 5. Marcar token como ativado
  await supabase
    .from('onboarding_tokens')
    .update({
      status: 'activated',
      activated_at: new Date().toISOString(),
      activated_by_phone: phone,
    })
    .eq('id', tokenData.id);
  
  // 6. Enviar mensagem de boas-vindas + Menu
  await enviarBoasVindas(supabase, phone, user, tokenData);
}

/**
 * Envia mensagem de boas-vindas completa
 */
async function enviarBoasVindas(supabase: any, phone: string, user: any, tokenData: any) {
  const alertasCriados = tokenData.default_config.alertas.filter((a: any) => a.ativo);
  
  let mensagem = `🎉 *BEM-VINDO AO DASHFINANCE!*\n\n`;
  mensagem += `✅ Token validado com sucesso!\n\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `🏢 *EMPRESA CADASTRADA*\n\n`;
  mensagem += `• ${tokenData.company_name}\n`;
  mensagem += `• CNPJ: ${formatarCNPJ(tokenData.company_cnpj)}\n`;
  
  if (tokenData.grupo_empresarial) {
    mensagem += `• Grupo: ${tokenData.grupo_empresarial}\n`;
  }
  
  mensagem += `\n📱 Seu número foi vinculado automaticamente!\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  mensagem += `🔔 *ALERTAS CONFIGURADOS*\n\n`;
  
  alertasCriados.forEach((alert: any, idx: number) => {
    mensagem += `✓ ${getNomeAlerta(alert.tipo)}\n`;
  });
  
  mensagem += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `📱 *MENU PRINCIPAL*\n`;
  mensagem += `Digite o número da opção:\n\n`;
  mensagem += `1️⃣ Ver meus alertas ativos\n`;
  mensagem += `2️⃣ Configurar alertas\n`;
  mensagem += `3️⃣ Adicionar outra empresa\n`;
  mensagem += `4️⃣ Minhas preferências\n`;
  mensagem += `5️⃣ Estatísticas\n`;
  mensagem += `6️⃣ Ajuda\n\n`;
  mensagem += `Digite: 1, 2, 3, 4, 5 ou 6`;
  
  await enviarMensagemWhatsApp(supabase, phone, mensagem);
}
```

### 3. **`process-menu-option`** - Processa opções do menu

```typescript
async function processarOpcaoMenu(supabase: any, phone: string, opcao: string) {
  // Buscar sessão
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone_number', phone)
    .single();
  
  if (!session || !session.user_id) {
    return await enviarMensagemWhatsApp(supabase, phone, `
❌ Você precisa se cadastrar primeiro.

Envie seu TOKEN:
*TOKEN: seu-token-aqui*
    `);
  }
  
  const menuAtual = session.current_menu;
  
  // Processar baseado no menu atual
  if (menuAtual === 'main') {
    switch (opcao) {
      case '1':
        return await mostrarAlertasAtivos(supabase, phone, session);
      case '2':
        return await mostrarConfiguracao(supabase, phone, session);
      case '3':
        return await mostrarAdicionarEmpresa(supabase, phone, session);
      case '4':
        return await mostrarPreferencias(supabase, phone, session);
      case '5':
        return await mostrarEstatisticas(supabase, phone, session);
      case '6':
        return await enviarAjuda(supabase, phone);
      case '0':
        return await voltarMenuPrincipal(supabase, phone);
      default:
        return await enviarMensagemWhatsApp(supabase, phone, `
❌ Opção inválida.

Digite um número de 1 a 6, ou 0 para menu.
        `);
    }
  }
  
  // Outros menus...
  // TO DO: Implementar submenus
}
```

---

## 📱 EXEMPLOS DE INTERAÇÃO

### Cenário 1: Cliente ativa primeira empresa

```
CLIENTE:
TOKEN: VLP-2024-A3F9K2

SISTEMA:
🔄 Verificando seu token...

✅ Token validado!

🎉 BEM-VINDO AO DASHFINANCE!

🏢 EMPRESA CADASTRADA
• Volpe Diadema
• CNPJ: 12.345.678/0001-90
• Grupo: Grupo Volpe

[... resto da mensagem de boas-vindas ...]

CLIENTE:
1

SISTEMA:
📊 ALERTAS ATIVOS
━━━━━━━━━━━━━━━━━━━━━━

Você não tem alertas no momento! ✅

Seu sistema está sendo monitorado e você
será notificado automaticamente caso algo
precise de sua atenção.

Digite 0 para voltar ao menu.
```

### Cenário 2: Cliente adiciona segunda empresa

```
CLIENTE:
3

SISTEMA:
🏢 ADICIONAR EMPRESA
━━━━━━━━━━━━━━━━━━━━━━

Você já tem acesso a:
• Volpe Diadema (12.345.678/0001-90)

Para adicionar outra empresa, me envie
o TOKEN que você recebeu.

Exemplo:
TOKEN: VLP-2024-X9Y2K1

Digite 0 para voltar ao menu.

CLIENTE:
TOKEN: VLP-2024-B8C3L5

SISTEMA:
🔄 Verificando token...

✅ Nova empresa adicionada!

🏢 Volpe Grajaú
CNPJ: 98.765.432/0001-10
Grupo: Grupo Volpe

Alertas padrão configurados ✓

Agora você monitora 2 empresas:
• Volpe Diadema
• Volpe Grajaú

Digite 0 para voltar ao menu.
```

### Cenário 3: Cliente configura alertas

```
CLIENTE:
2

SISTEMA:
⚙️ CONFIGURAR ALERTAS
━━━━━━━━━━━━━━━━━━━━━━

1️⃣ Ver alertas ativos
2️⃣ Ativar/Desativar alertas
3️⃣ Alterar limites (thresholds)
4️⃣ Horários de verificação
5️⃣ Horário de silêncio
6️⃣ Formato das mensagens

0️⃣ Voltar

Digite a opção:

CLIENTE:
5

SISTEMA:
🔕 HORÁRIO DE SILÊNCIO
━━━━━━━━━━━━━━━━━━━━━━

Configuração atual:
• Silêncio: 22:00 às 07:00
• Fins de semana: SIM

━━━━━━━━━━━━━━━━━━━━━━

O que deseja fazer?

1️⃣ Alterar horário início
2️⃣ Alterar horário fim
3️⃣ Ligar/Desligar fim de semana
4️⃣ Desativar silêncio

0️⃣ Voltar

Digite a opção:
```

---

## 🎨 TELA DE ADMIN (Web) - Gerar Tokens

### Rota: `/admin/tokens`

```typescript
// Componente React
function GerarTokenPage() {
  return (
    <div>
      <h1>Gerar Token de Onboarding</h1>
      
      <form onSubmit={handleSubmit}>
        <input name="cnpj" placeholder="CNPJ" />
        <input name="razao_social" placeholder="Razão Social" />
        <input name="grupo" placeholder="Grupo (opcional)" />
        <input name="contato" placeholder="Nome do Contato" />
        <input name="email" placeholder="Email (opcional)" />
        
        <h3>Alertas Padrão</h3>
        <checkbox name="saldo_baixo" checked />
        <input name="saldo_minimo" value="5000" />
        
        <checkbox name="inadimplencia" checked />
        <input name="limite_percentual" value="10" />
        
        <button type="submit">Gerar Token</button>
      </form>
      
      {token && (
        <div className="token-gerado">
          <h2>Token Gerado!</h2>
          <code>{token.display}</code>
          
          <h3>Enviar para cliente:</h3>
          
          <button onClick={() => copy(token.display)}>
            📋 Copiar Token
          </button>
          
          <button onClick={() => window.open(token.whatsapp_link)}>
            💬 Abrir WhatsApp
          </button>
          
          <button onClick={() => enviarEmail(token)}>
            📧 Enviar por Email
          </button>
          
          <QRCode value={token.whatsapp_link} />
        </div>
      )}
    </div>
  );
}
```

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Criar migrations (tabelas acima)
2. ✅ Criar Edge Function `whatsapp-webhook`
3. ✅ Configurar webhook no WASender
4. ✅ Criar tela de admin para gerar tokens
5. ✅ Implementar menus interativos
6. ✅ Testar fluxo completo

---

**Isso faz sentido? O cliente começa mandando o TOKEN e a partir daí tudo é automático!** 🚀

Quer que eu implemente agora?

