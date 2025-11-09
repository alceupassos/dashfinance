# 🧪 GUIA DE TESTE: PRIMEIRO WORKFLOW N8N

## 🎯 Workflow: Resumo Executivo Diário

**Arquivo:** `n8n-workflows/01_resumo_executivo_diario.json`

---

## 📋 PRÉ-REQUISITOS

### 1. **Instalar n8n**

```bash
# Opção 1: Docker (Recomendado)
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n

# Opção 2: npm global
npm install n8n -g
n8n start

# Opção 3: npx (temporário)
npx n8n
```

**Acesse:** http://localhost:5678

---

### 2. **Configurar Credenciais no n8n**

#### A. **Supabase API**
1. No n8n, vá em: **Settings → Credentials → New**
2. Busque: **Supabase**
3. Configure:
   - **Name:** `Supabase DashFinance`
   - **Host:** `https://YOUR_PROJECT_ID.supabase.co`
   - **Service Role Key:** Sua service role key

#### B. **WASender (HTTP Header Auth)**
1. Crie credencial: **HTTP Header Auth**
2. Configure:
   - **Name:** `WASender Auth`
   - **Header Name:** `Authorization`
   - **Header Value:** `Bearer 09cfee8bccee1f9319b3eae0cfec5b07a41b0819eb5fddffd73df2ff599df979`

---

### 3. **Configurar Variáveis de Ambiente**

No n8n, adicione as seguintes environment variables:

```bash
# Método 1: Via Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co" \
  -e SUPABASE_ANON_KEY="your_anon_key" \
  -e SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" \
  -e WASENDER_API_URL="https://wasenderapi.com/api/send-message" \
  -e WASENDER_API_KEY="09cfee8bccee1f9319b3eae0cfec5b07a41b0819eb5fddffd73df2ff599df979" \
  -v ~/.n8n:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n

# Método 2: Arquivo .env (se rodando local)
# Crie arquivo ~/.n8n/.env:
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
WASENDER_API_URL=https://wasenderapi.com/api/send-message
WASENDER_API_KEY=09cfee8bccee1f9319b3eae0cfec5b07a41b0819eb5fddffd73df2ff599df979
```

---

## 🚀 IMPORTAR E TESTAR WORKFLOW

### **Passo 1: Importar Workflow**

1. Abra n8n: http://localhost:5678
2. Clique em: **Import from File**
3. Selecione: `n8n-workflows/01_resumo_executivo_diario.json`
4. Clique em: **Import**

### **Passo 2: Configurar Credenciais**

O workflow tem 3 nodes que precisam de credenciais:

1. **"Buscar Clientes Ativos"** (Supabase)
   - Selecione a credencial: `Supabase DashFinance`

2. **"Buscar Dados F360"** (HTTP Request)
   - Não precisa de credencial (usa env vars)

3. **"Enviar WhatsApp"** (HTTP Request)
   - Não precisa de credencial (usa env vars)

4. **"Registrar Envio"** (Supabase)
   - Selecione a credencial: `Supabase DashFinance`

### **Passo 3: Teste Manual (Antes de Ativar Cron)**

1. **Desative o trigger automático:**
   - Clique no node: **"Trigger: 08:00 diário"**
   - Desmarque: **"Execute Workflow"**

2. **Adicione um trigger manual temporário:**
   - Clique em: **+ Add Node**
   - Busque: **Manual Trigger**
   - Conecte ao node: **"Set Timezone Brasília"**

3. **Execute o teste:**
   - Clique em: **Execute Workflow**
   - Aguarde a execução completa
   - Verifique cada node (deve ficar verde ✅)

### **Passo 4: Validar Resultados**

#### A. **Verificar Dados Buscados**

Clique no node **"Buscar Clientes Ativos"**:
- Deve retornar Jessica Kenupp (VOLPE1)
- Verificar se `activated_by_phone` está correto: `5524998567466`

#### B. **Verificar Dados F360**

Clique no node **"Buscar Dados F360"**:
- Deve retornar dados do overview
- Verificar estrutura:
  ```json
  {
    "success": true,
    "data": {
      "balance": {...},
      "receivables": {...},
      "payables": {...},
      "net_position": ...
    }
  }
  ```

#### C. **Verificar Mensagem Formatada**

Clique no node **"Formatar Mensagem"**:
- Deve mostrar mensagem completa
- Verificar formatação WhatsApp
- Confirmar valores estão corretos

#### D. **Verificar Envio WhatsApp**

Clique no node **"Enviar WhatsApp"**:
- Deve retornar:
  ```json
  {
    "success": true,
    "data": {
      "msgId": "...",
      "jid": "5524998567466",
      "status": "in_progress"
    }
  }
  ```

#### E. **Confirmar com Jessica**

Pergunte para Jessica se ela recebeu a mensagem no WhatsApp! 📱

---

## 🐛 TROUBLESHOOTING

### **Problema 1: Erro ao buscar clientes**
```
ERROR: 42P01: relation "onboarding_tokens" does not exist
```

**Solução:**
- Verificar se migrations foram aplicadas
- Executar: `supabase db push`

---

### **Problema 2: Erro ao buscar dados F360**
```
ERROR: 404 Not Found - Edge Function não existe
```

**Solução:**
- Deploy da Edge Function: `fetch-f360-realtime`
- Executar: `supabase functions deploy fetch-f360-realtime`

---

### **Problema 3: Erro ao enviar WhatsApp**
```
ERROR: Invalid API key
```

**Solução:**
- Verificar variável de ambiente `WASENDER_API_KEY`
- Confirmar que está usando o Bearer token correto

---

### **Problema 4: Rate limit do WASender**
```
ERROR: You can only send 1 message every 5 seconds
```

**Solução:**
- Aguardar 5 segundos entre testes
- Workflow produção já tem delay automático no loop

---

## 📊 MÉTRICAS DE SUCESSO DO TESTE

### ✅ **Critérios de Aprovação:**

- [ ] Workflow executa sem erros
- [ ] Busca correta de clientes ativos
- [ ] Consulta F360 retorna dados
- [ ] Mensagem formatada corretamente
- [ ] WhatsApp enviado com sucesso
- [ ] Jessica confirma recebimento
- [ ] Registro gravado no banco
- [ ] Tempo de execução < 30 segundos

---

## 🎯 PRÓXIMOS PASSOS APÓS SUCESSO

### **1. Ativar Workflow para Produção**

1. Remova o **Manual Trigger** temporário
2. Ative o **Cron Trigger** (08:00 diário)
3. Clique em: **Active** (switch no topo)
4. Workflow rodará automaticamente às 08:00 todos os dias

### **2. Monitorar Primeiras Execuções**

1. Acompanhe nos primeiros 3 dias
2. Verifique logs de execução
3. Confirme com Jessica se está recebendo
4. Ajuste formatação se necessário

### **3. Criar Segundo Workflow**

Após sucesso do primeiro, criar:
- **02 - Fechamento Diário (17:00)**

---

## 🧪 DADOS MOCKADOS PARA TESTE (Opcional)

Se quiser testar sem consultar F360 real, adicione um node **Function** após "Loop Over Clients":

```javascript
return [{
  json: {
    data: {
      balance: {
        total_balance: 245380.50,
        available_balance: 198240.30,
        blocked_balance: 47140.20
      },
      receivables: {
        total: 456789.00,
        count: 23,
        overdue: 23450.00,
        overdue_count: 5
      },
      payables: {
        total: 312567.00,
        count: 18,
        overdue: 8900.00,
        overdue_count: 2
      },
      net_position: 342462.30
    }
  }
}];
```

---

## 📝 EXEMPLO DE MENSAGEM ESPERADA

```
🌅 BOM DIA!

📊 RESUMO FINANCEIRO
Grupo Volpe

━━━━━━━━━━━━━━━━━━━━
💰 SALDO

🟡 Disponível: R$ 198.240,30
💵 Total: R$ 245.380,50

━━━━━━━━━━━━━━━━━━━━
📥 A RECEBER

💰 Total: R$ 456.789,00
📋 Títulos: 23
⚠️ Vencido: R$ 23.450,00
   (5 título(s))

━━━━━━━━━━━━━━━━━━━━
📤 A PAGAR

💸 Total: R$ 312.567,00
📋 Títulos: 18
⚠️ Vencido: R$ 8.900,00
   (2 título(s))

━━━━━━━━━━━━━━━━━━━━
📊 POSIÇÃO LÍQUIDA

✅ R$ 342.462,30

━━━━━━━━━━━━━━━━━━━━

📞 AÇÃO: Cobrar títulos vencidos
Valor em atraso: R$ 23.450,00

🚨 URGENTE: Regularizar pagamentos
Evite juros e multas!

Atualizado em: 09/11/2025, 08:00:15

Powered by Oráculo IFinance 💎
```

---

## 🎉 CHECKLIST FINAL

Antes de considerar o teste completo:

- [ ] n8n instalado e rodando
- [ ] Credenciais configuradas
- [ ] Variáveis de ambiente definidas
- [ ] Workflow importado
- [ ] Teste manual executado
- [ ] Todos nodes em verde ✅
- [ ] Jessica recebeu mensagem
- [ ] Mensagem está bem formatada
- [ ] Dados estão corretos
- [ ] Registro no banco confirmado
- [ ] Workflow ativado em produção
- [ ] Documentação atualizada

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verificar logs do n8n
2. Verificar logs do Supabase
3. Testar cada node individualmente
4. Usar dados mockados para isolar o problema

---

**🚀 PRONTO PARA TESTAR! VAMOS LÁ!**

