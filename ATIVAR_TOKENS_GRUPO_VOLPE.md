# 🚀 COMO ATIVAR OS TOKENS GRUPO VOLPE

## 📱 PASSO A PASSO COMPLETO

### 1️⃣ CONFIGURAR NÚMERO DO WASENDER

**Primeiro, atualize o banco com o número REAL do WASender:**

```sql
-- Atualizar tokens com número real do WASender
-- SUBSTITUA +5511XXXXXXXXX pelo número real!

UPDATE onboarding_tokens 
SET 
  whatsapp_phone = '+5511XXXXXXXXX',  -- SEU NÚMERO WASENDER AQUI
  whatsapp_link = 'https://wa.me/5511XXXXXXXXX?text=' || token
WHERE token IN ('VLP1A', 'VLP2F');
```

**Exemplo com número real:**
```sql
UPDATE onboarding_tokens 
SET 
  whatsapp_phone = '+5511987654321',
  whatsapp_link = 'https://wa.me/5511987654321?text=' || token
WHERE token IN ('VLP1A', 'VLP2F');
```

---

### 2️⃣ TOKENS CRIADOS

| Token | Tipo | Para | Status |
|-------|------|------|--------|
| **VLP1A** | Master | Diretor/Gerente | ⏳ Pendente |
| **VLP2F** | Financeiro | Contador | ⏳ Pendente |

---

### 3️⃣ O QUE ENVIAR PARA O WASENDER?

**OPÇÃO A: Envio Manual (Simples)**

Cada usuário deve:
1. Adicionar o número do WASender no WhatsApp
2. Enviar APENAS o token:
   - `VLP1A` (para o Diretor)
   - `VLP2F` (para o Contador)

**Exemplo:**
```
Cliente abre WhatsApp
Cliente adiciona: +55 11 XXXX-XXXX (número WASender)
Cliente digita: VLP1A
Cliente pressiona ENVIAR
Sistema responde automaticamente!
```

---

**OPÇÃO B: Link Direto (Recomendado)**

Envie estes links para cada usuário:

**Para o Diretor/Gerente:**
```
https://wa.me/5511XXXXXXXXX?text=VLP1A
```

**Para o Contador:**
```
https://wa.me/5511XXXXXXXXX?text=VLP2F
```

*(Substitua 5511XXXXXXXXX pelo número real do WASender)*

**Como funciona:**
1. Cliente clica no link
2. WhatsApp abre automaticamente
3. Token já está digitado
4. Cliente só precisa pressionar ENVIAR
5. Recebe mensagem de boas-vindas!

---

### 4️⃣ VERIFICAR NO BANCO

Após enviar os tokens, verifique no banco:

```sql
-- Ver status dos tokens
SELECT 
  token,
  contact_name,
  status,
  activated_at,
  activated_by_phone,
  whatsapp_phone
FROM onboarding_tokens
WHERE token IN ('VLP1A', 'VLP2F')
ORDER BY token;
```

**Status esperado após ativação:**
- `status` deve mudar de `pending` para `activated`
- `activated_at` deve ter data/hora
- `activated_by_phone` deve ter o número do cliente

---

### 5️⃣ MENSAGEM QUE O CLIENTE RECEBERÁ

Ao enviar o token, o cliente recebe automaticamente:

```
🎉 BEM-VINDO(A) AO DASHFINANCE!

Olá, Diretor(a)! 👔

Seu acesso ao Grupo Volpe foi ativado com sucesso!

━━━━━━━━━━━━━━━━━━━━
📊 SEU ACESSO

🏢 5 empresas vinculadas
🔑 Token: VLP1A
👤 Perfil: Master

━━━━━━━━━━━━━━━━━━━━
📱 MENU RÁPIDO

1️⃣ Alertas - Ver pendências
2️⃣ Saldo - Consultar disponível
3️⃣ DRE - Relatório consolidado
4️⃣ Config - Preferências

━━━━━━━━━━━━━━━━━━━━
💬 CONVERSE COMIGO!

🤖 Powered by Claude Haiku 3.5

Você pode me fazer perguntas como:
• "Qual o saldo de todas empresas?"
• "Mostre alertas críticos"
• "Como está o faturamento?"
• "Preciso do DRE de novembro"

Ou use os números 1-4 acima.

━━━━━━━━━━━━━━━━━━━━

Digite MENU para ver opções novamente.

Assistente inteligente DashFinance ✨
```

---

## 🔧 CONFIGURAÇÃO RÁPIDA

### Script SQL Completo

```sql
-- 1. ATUALIZAR NÚMERO WASENDER (IMPORTANTE!)
UPDATE onboarding_tokens 
SET 
  whatsapp_phone = '+5511XXXXXXXXX',  -- SEU NÚMERO AQUI
  whatsapp_link = 'https://wa.me/5511XXXXXXXXX?text=' || token
WHERE grupo_empresarial = 'Grupo Volpe';

-- 2. VERIFICAR TOKENS
SELECT 
  token,
  contact_name,
  whatsapp_phone,
  whatsapp_link,
  status
FROM onboarding_tokens
WHERE token IN ('VLP1A', 'VLP2F');

-- 3. LISTAR EMPRESAS VINCULADAS
SELECT 
  cnpj,
  cliente_nome
FROM integration_f360
WHERE grupo_empresarial = 'Grupo Volpe'
ORDER BY cliente_nome;
```

---

## 📋 CHECKLIST DE ATIVAÇÃO

### Antes de Enviar
- [ ] Número WASender configurado no banco
- [ ] Tokens criados (VLP1A, VLP2F)
- [ ] Edge Functions deployadas
- [ ] API Key Anthropic configurada
- [ ] Webhook WASender configurado

### Durante Ativação
- [ ] Token VLP1A enviado para Diretor
- [ ] Token VLP2F enviado para Contador
- [ ] Mensagens de boas-vindas recebidas
- [ ] Menu visualizado corretamente

### Após Ativação
- [ ] Status mudou para "activated" no banco
- [ ] Usuários criados na tabela users
- [ ] Empresas vinculadas na tabela user_companies
- [ ] Sessões criadas na tabela whatsapp_sessions
- [ ] Teste comando "1" (Alertas)
- [ ] Teste comando "2" (Saldo)

---

## ⚠️ TROUBLESHOOTING

### Problema: Token não ativa
**Solução:**
```sql
-- Verificar token existe e está pending
SELECT * FROM onboarding_tokens WHERE token = 'VLP1A';

-- Verificar se não expirou
SELECT token, expires_at FROM onboarding_tokens 
WHERE token = 'VLP1A' AND expires_at > now();
```

### Problema: Mensagem não chega
**Verificar:**
1. Webhook WASender está configurado?
2. Edge Function está deployada?
3. Número WASender está correto?

```sql
-- Ver mensagens enviadas
SELECT * FROM whatsapp_messages 
WHERE direction = 'outbound' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Problema: IA não responde
**Verificar:**
1. ANTHROPIC_API_KEY configurada?
2. Edge Function whatsapp-ai-handler deployada?
3. Saldo na conta Anthropic?

---

## 🎯 RESUMO EXECUTIVO

### O QUE FAZER AGORA:

1. **Atualizar banco com número WASender:**
   ```sql
   UPDATE onboarding_tokens 
   SET whatsapp_phone = '+5511XXXXXXXXX'
   WHERE grupo_empresarial = 'Grupo Volpe';
   ```

2. **Gerar links personalizados:**
   ```
   Link Diretor: https://wa.me/5511XXXXXXXXX?text=VLP1A
   Link Contador: https://wa.me/5511XXXXXXXXX?text=VLP2F
   ```

3. **Enviar links para os usuários**

4. **Aguardar ativação** (< 10 segundos)

5. **Verificar no banco:**
   ```sql
   SELECT * FROM onboarding_tokens WHERE status = 'activated';
   ```

---

## 📞 EXEMPLO PRÁTICO

### Cenário Real:
```
Número WASender: +55 11 98765-4321

Link Diretor:
https://wa.me/5511987654321?text=VLP1A

Link Contador:
https://wa.me/5511987654322?text=VLP2F
```

### Fluxo Completo:
```
1. Diretor clica no link
   ↓
2. WhatsApp abre com "VLP1A" já digitado
   ↓
3. Diretor pressiona ENVIAR
   ↓
4. Sistema processa em < 5 segundos
   ↓
5. Mensagem de boas-vindas chega
   ↓
6. Diretor vê menu e pode começar a usar
   ↓
7. Status muda para "activated" no banco
```

---

## ✅ TOKENS PRONTOS!

**Token 1:** `VLP1A` (Master - Diretor)  
**Token 2:** `VLP2F` (Financeiro - Contador)  

**Próximo passo:** Atualizar número WASender no banco e enviar links!

---

_Documento criado em 09/11/2025_  
_Sistema 100% pronto para ativação!_ 🚀

