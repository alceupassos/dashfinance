# 📱 Comandos WhatsApp - iFinance

## 🎯 Visão Geral

Sistema de comandos curtos para acesso rápido a informações financeiras via WhatsApp.

**Formato**: `/comando [parametros]`

---

## 📋 Lista de Comandos

### 💰 Financeiro

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/saldo` | Saldo atual em caixa | `/saldo` |
| `/dre` | DRE do mês atual | `/dre` |
| `/dre 10` | DRE de outubro | `/dre 10` |
| `/fluxo` | Fluxo de caixa próximos 30 dias | `/fluxo` |
| `/pagar` | Contas a pagar vencendo | `/pagar` |
| `/receber` | Contas a receber vencendo | `/receber` |
| `/ebitda` | EBITDA do mês | `/ebitda` |
| `/lucro` | Lucro líquido do mês | `/lucro` |
| `/receita` | Receita total do mês | `/receita` |
| `/despesa` | Despesas do mês | `/despesa` |

### 📊 Relatórios

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/relatorio` | Relatório executivo completo | `/relatorio` |
| `/kpis` | KPIs principais do mês | `/kpis` |
| `/analise` | Análise financeira com IA | `/analise` |
| `/comparativo` | Comparar mês atual vs anterior | `/comparativo` |
| `/meta` | Status de metas do mês | `/meta` |
| `/alerta` | Ver alertas ativos | `/alerta` |

### 📈 Projeções

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/projecao` | Projeção 30 dias | `/projecao` |
| `/runway` | Runway (meses até zerar caixa) | `/runway` |
| `/burnrate` | Taxa de queima mensal | `/burnrate` |
| `/breakeven` | Ponto de equilíbrio | `/breakeven` |

### 👥 Gestão

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/empresas` | Listar minhas empresas | `/empresas` |
| `/trocar ABC123` | Trocar para empresa CNPJ | `/trocar 12345678000190` |
| `/perfil` | Meu perfil e permissões | `/perfil` |
| `/ajuda` | Lista de comandos | `/ajuda` |

### 🔔 Notificações

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/notif on` | Ativar notificações diárias | `/notif on` |
| `/notif off` | Desativar notificações | `/notif off` |
| `/agendar 9h` | Agendar relatório diário às 9h | `/agendar 9h` |
| `/lembrete` | Configurar lembretes | `/lembrete` |

### ⚙️ Configuração

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/vincular` | Vincular CNPJ ao meu WhatsApp | `/vincular` |
| `/desvincular` | Desvincular | `/desvincular` |
| `/idioma pt` | Trocar idioma (pt/en/es) | `/idioma en` |
| `/formato pdf` | Formato de relatório (pdf/excel/texto) | `/formato excel` |

---

## 🚀 Exemplos de Uso

### Exemplo 1: Consultar Saldo

**Usuário**:
```
/saldo
```

**iFinance**:
```
💰 Saldo Atual - Empresa XYZ

Total em Caixa: R$ 45.230,00
Disponível: R$ 38.450,00
Bloqueado: R$ 6.780,00

Bancos:
• Bradesco: R$ 32.120,00
• Itaú: R$ 13.110,00

Atualizado em: 07/11/2025 14:32
```

---

### Exemplo 2: DRE do Mês

**Usuário**:
```
/dre
```

**iFinance**:
```
📊 DRE - Outubro/2025
Empresa XYZ Ltda

Receita Líquida: R$ 280.500,00
(-) CMV: R$ 112.200,00 (40%)
= Lucro Bruto: R$ 168.300,00 (60%)

(-) Despesas Operacionais
  • Vendas: R$ 42.075,00 (15%)
  • Administrativas: R$ 28.050,00 (10%)
  • Financeiras: R$ 5.610,00 (2%)
= EBITDA: R$ 92.565,00 (33%)

(-) Deprec./Amort.: R$ 8.415,00
= EBIT: R$ 84.150,00 (30%)

(-) IR/CSLL: R$ 16.830,00 (6%)
= Lucro Líquido: R$ 67.320,00 (24%)

✅ Margem excelente! +8% vs mês anterior.

Quer ver análise detalhada? Digite /analise
```

---

### Exemplo 3: Vincular WhatsApp

**Usuário**:
```
/vincular
```

**iFinance**:
```
🔗 Vincular WhatsApp ao iFinance

Para sua segurança, envie:
1. CNPJ da empresa (14 dígitos)
2. Código de validação (enviamos por email)

Exemplo:
12345678000190
ABC123

⏳ Aguardando...
```

**Usuário**:
```
12345678000190
ABC123
```

**iFinance**:
```
✅ WhatsApp vinculado com sucesso!

Empresa: XYZ Consultoria Ltda
CNPJ: 12.345.678/0001-90
Permissões: Admin

Comandos disponíveis: /ajuda
```

---

### Exemplo 4: Alertas Ativos

**Usuário**:
```
/alerta
```

**iFinance**:
```
⚠️ Alertas Ativos - 3 itens

🔴 CRÍTICO
• Fluxo de caixa negativo em 15 dias
  Ação: Antecipar recebíveis ou reduzir despesas

🟡 ATENÇÃO
• 5 contas vencem em 3 dias (R$ 12.450,00)
  Ação: Revisar e agendar pagamentos

• Meta de receita: 78% atingido
  Faltam R$ 22.000 para bater 100%

Ver detalhes: /alerta 1
Resolver: /resolver 1
```

---

### Exemplo 5: Projeção 30 Dias

**Usuário**:
```
/projecao
```

**iFinance**:
```
🔮 Projeção 30 Dias
Empresa XYZ | 07/11 - 07/12/2025

Cenário Base:
📈 Receita Esperada: R$ 95.000,00
📉 Despesas Fixas: R$ 48.200,00
📉 Despesas Variáveis: R$ 19.000,00
= Resultado: +R$ 27.800,00

Saldo Inicial: R$ 45.230,00
Saldo Final: R$ 73.030,00
Variação: +61%

🟢 Cenário saudável

Gráfico completo: https://ifin.app.br/projecao/xyz
```

---

## 🤖 Comandos Inteligentes (IA)

Além dos comandos estruturados, você pode fazer perguntas em linguagem natural:

**Exemplos**:
```
"Qual minha margem líquida?"
"Posso fazer uma compra de R$ 50 mil?"
"Como está meu fluxo de caixa?"
"Quais os 3 maiores custos do mês?"
"Comparar receita out/24 vs out/25"
"Sugerir melhorias para reduzir despesas"
```

**iFinance** vai entender e responder baseado no contexto da sua empresa.

---

## 🔐 Segurança

1. **Vinculação Obrigatória**: Apenas números vinculados podem usar comandos
2. **Validação 2FA**: Código enviado por email para vincular
3. **Permissões**: Comandos restritos por role (admin, user, viewer)
4. **Session Timeout**: 24h de inatividade desvincula automaticamente
5. **Auditoria**: Todos os comandos são logados

---

## 🎨 Formato de Resposta

### Texto Simples
```
Saldo: R$ 45.230,00
Disponível: R$ 38.450,00
```

### Com Emojis (default)
```
💰 Saldo: R$ 45.230,00
✅ Disponível: R$ 38.450,00
🔒 Bloqueado: R$ 6.780,00
```

### Com Imagem (gráficos)
```
[Imagem: Gráfico DRE Outubro]
📊 DRE - Outubro/2025
...
```

### Com PDF/Excel (relatórios)
```
[Documento: relatorio_outubro_2025.pdf]
📄 Relatório Executivo - Outubro/2025
...
```

---

## 📱 Fluxo de Onboarding

### Primeira Interação

**Usuário** (novo, sem vínculo):
```
Olá
```

**iFinance**:
```
👋 Bem-vindo ao iFinance!

Seu assistente financeiro inteligente via WhatsApp.

Para começar, precisamos vincular seu WhatsApp:
• Digite /vincular
• Informe seu CNPJ
• Confirme com código enviado por email

Dúvidas? Digite /ajuda
```

---

## 🛠️ Implementação Técnica

### Edge Function: whatsapp-admin-commands

**Arquivo**: `supabase/functions/whatsapp-admin-commands/index.ts`

**Responsabilidades**:
1. Parse do comando (`/saldo`, `/dre`, etc)
2. Validar permissões do usuário
3. Buscar dados no banco
4. Formatar resposta
5. Chamar `wasender-send-message`

**Exemplo**:
```typescript
// Parse comando
const [cmd, ...args] = message.trim().split(' ');

switch(cmd) {
  case '/saldo':
    return await handleSaldoCommand(companyCnpj);
  case '/dre':
    const month = args[0] ? parseInt(args[0]) : new Date().getMonth() + 1;
    return await handleDreCommand(companyCnpj, month);
  case '/alerta':
    return await handleAlertaCommand(companyCnpj);
  // ...
}
```

---

## 📊 Comandos por Categoria

### Tier 1: Essenciais (uso diário)
- `/saldo`
- `/dre`
- `/alerta`
- `/ajuda`

### Tier 2: Importantes (uso semanal)
- `/fluxo`
- `/pagar`
- `/receber`
- `/kpis`

### Tier 3: Avançados (uso mensal)
- `/analise`
- `/projecao`
- `/relatorio`
- `/comparativo`

### Tier 4: Admin (uso eventual)
- `/vincular`
- `/trocar`
- `/notif`
- `/formato`

---

## 🚀 Roadmap

- [x] Comandos básicos financeiros
- [ ] Comandos de relatórios
- [ ] Comandos de projeção
- [ ] Comandos de gestão
- [ ] Comandos de notificação
- [ ] Comandos de configuração
- [ ] IA conversacional (fallback)
- [ ] Multi-idioma
- [ ] Comandos por voz
- [ ] Comandos agendados

---

**Última atualização**: 07/11/2025
