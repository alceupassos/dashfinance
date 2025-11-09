# RAG: Projeto F360 Token Generator - Memória Completa

## 📋 Contexto do Projeto

### Objetivo
Automatizar a geração de tokens da API F360 para 212 empresas, extraindo tokens do sistema web `https://financas.f360.com.br/Webservice` e salvando no banco de dados Supabase.

### Dados de Entrada
- **Arquivo CSV**: `/tmp/F360_Lista_Acessos_COMPLETA.csv`
- **Campos**: Login, Senha, CNPJ, Empresa
- **Total de registros**: 212 empresas

### Processo Manual a Automatizar
1. Acessar `https://financas.f360.com.br`
2. Fazer login (email + senha)
3. Navegar: Menu de Cadastros → Integrações → Webservices
4. Clicar no botão **"+ CRIAR"** (localizado no **menu lateral esquerdo, parte inferior**)
5. Selecionar "API Pública da F360" no dropdown
6. Preencher campo "Outros" com "TORRE"
7. Clicar em "Salvar"
8. **Extrair o token** (aparece apenas uma vez após salvar)
9. Salvar token no banco Supabase (`f360_config`)

## 🏗️ Arquitetura Implementada

### Estrutura de Arquivos
```
finance-oraculo-backend/automation/f360-token-generator/
├── generate-f360-tokens.js      # Agente Main (Puppeteer completo)
├── agents/
│   ├── agent-puppeteer-alt.js   # Agente Alt (Puppeteer simplificado)
│   └── agent-playwright.py      # Agente Py (Playwright Python)
├── run-main.sh                  # Script de execução Main
├── run-alt.sh                   # Script de execução Alt
├── run-py.sh                    # Script de execução Py
├── package.json                 # Dependências Node.js
└── output/                      # Logs e resultados
    ├── automation.log           # Log do Main
    ├── automation-alt.log       # Log do Alt
    ├── automation-py.log       # Log do Py
    ├── f360-tokens-progress.json
    ├── f360-tokens-extracted.json
    └── insert-f360-config.sql
```

### Infraestrutura
- **VPS**: `root@38.242.195.142`
- **Diretório**: `/tmp/f360-token-generator`
- **Banco de Dados**: Supabase PostgreSQL
  - Host: `db.xzrmzmcoslomtzkzgskn.supabase.co`
  - Tabela: `f360_config`
  - Campos: `company_cnpj`, `company_name`, `api_key`, `is_active`

## 🤖 Os 5 Agentes Implementados (CORRIGIDO)

### Agente 1: CODEX
**Arquivo**: `agents/agent-1-codex.js`

**Estratégia**: Técnica e direta - busca por seletores CSS precisos e coordenadas XY
**Foco**: Eficiência e precisão técnica
**Registros**: 0-49 (50 registros)

**Características**:
- XY primeiro (canto inferior esquerdo com múltiplos hotspots)
- Depois seletores CSS precisos
- `protocolTimeout: 300000` (5 minutos)
- Flags Chrome: `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`

**Estratégias**:
1. **XY direto primeiro**: Hotspots no canto inferior esquerdo (X: 24-152px, Y: vh-24 a vh-88)
2. Seletores CSS precisos: `button:contains("+ CRIAR")`, `button[aria-label*="criar"]`, `aside button:last-child`

**Logs**: `/tmp/f360-token-generator/output/automation-codex.log`
**Saída**: `/tmp/f360-token-generator/output/agents_codex/tokens_codex.json`

### Agente 2: DEEPSEEK
**Arquivo**: `agents/agent-2-deepseek.js`

**Estratégia**: Exploratória e recursiva - busca ampla em toda estrutura DOM
**Foco**: Encontrar o botão mesmo que esteja escondido ou aninhado
**Registros**: 50-99 (50 registros)

**Características**:
- Busca recursiva em profundidade (até 10 níveis)
- Filtra por texto, posição e tamanho
- Scroll automático para o elemento encontrado

**Estratégias**:
1. Busca recursiva em `document.body` (profundidade até 10)
2. Filtra por: texto inclui "CRIAR" ou "+", left < 40%, bottom > 60%, width > 20, height > 20

**Logs**: `/tmp/f360-token-generator/output/automation-deepseek.log`
**Saída**: `/tmp/f360-token-generator/output/agents_deepseek/tokens_deepseek.json`

### Agente 3: GEMINI
**Arquivo**: `agents/agent-3-gemini.js`

**Estratégia**: Múltiplas abordagens simultâneas - tenta várias estratégias em paralelo
**Foco**: Abrangência e redundância
**Registros**: 100-149 (50 registros)

**Características**:
- 4 abordagens diferentes tentadas sequencialmente
- Se uma falhar, tenta a próxima automaticamente

**Estratégias**:
1. Por posição absoluta (left < 300, bottom > vh-100)
2. Por hierarquia DOM (nav/aside → buttons)
3. Por atributos data-* (`[data-action*="create"]`)
4. Último elemento do sidebar

**Logs**: `/tmp/f360-token-generator/output/automation-gemini.log`
**Saída**: `/tmp/f360-token-generator/output/agents_gemini/tokens_gemini.json`

### Agente 4: MISTRAL
**Arquivo**: `agents/agent-4-mistral.js`

**Estratégia**: Conservadora com validação rigorosa - múltiplos critérios antes de clicar
**Foco**: Precisão e confiabilidade
**Registros**: 150-199 (50 registros)

**Características**:
- Validação rigorosa de 6 critérios simultâneos
- Ordena candidatos por distância do canto inferior esquerdo
- Scroll suave antes de clicar

**Estratégias**:
1. Filtra candidatos por 6 critérios:
   - Texto inclui "CRIAR" ou "+ CRIAR"
   - Visível (display, visibility, opacity)
   - No menu esquerdo (left < 30%)
   - Na parte inferior (bottom > 70%)
   - Tamanho mínimo (width > 30, height > 20)
   - Clicável (não disabled, offsetParent !== null)
2. Ordena por distância do canto inferior esquerdo
3. Clica no mais próximo

**Logs**: `/tmp/f360-token-generator/output/automation-mistral.log`
**Saída**: `/tmp/f360-token-generator/output/agents_mistral/tokens_mistral.json`

### Agente 5: QWEN
**Arquivo**: `agents/agent-5-qwen.js`

**Estratégia**: Agressiva - tenta tudo, múltiplos métodos, sem filtros rígidos
**Foco**: Cobertura máxima, tentar todas as possibilidades
**Registros**: 200-211 (12 registros)

**Características**:
- Critérios amplos e flexíveis
- Busca em todos os elementos (`*`)
- Múltiplos métodos de clique (click + dispatchEvent)

**Estratégias**:
1. Busca em TODOS os elementos (`document.querySelectorAll('*')`)
2. Critérios amplos:
   - Texto, aria-label, className, id incluem "CRIAR", "CREATE", "ADD", "+"
   - left < 40% (mais flexível)
   - bottom > 60% (mais flexível)
   - Visível
3. Ordena por: match exato primeiro, depois distância do canto
4. Tenta `click()` e `dispatchEvent(new MouseEvent('click'))`

**Logs**: `/tmp/f360-token-generator/output/automation-qwen.log`
**Saída**: `/tmp/f360-token-generator/output/agents_qwen/tokens_qwen.json`

## 🔧 Problemas Enfrentados e Soluções

### Problema 1: "Session closed" / "Protocol error"
**Causa**: Páginas fechando prematuramente, tentativa de fechar página já fechada

**Solução**:
- Tratamento robusto no `finally`: verifica `page.isClosed()` antes de fechar
- Try-catch aninhados para ignorar erros de página fechada
- Screenshots apenas se página estiver aberta

### Problema 2: Botão "+ CRIAR" não encontrado
**Causa**: Botão está no menu lateral esquerdo (não na área central), seletores CSS não encontravam

**Solução**:
- Busca focada no sidebar (aside/nav/[class*="sidebar"])
- Heurística de posição (left < 30-35%, bottom > 65-70%)
- **Fallback por coordenadas XY** (clique direto no canto inferior esquerdo)
- Múltiplas estratégias de busca (5 sub-agentes no Main)

### Problema 3: Token não extraído
**Causa**: Token aparece apenas uma vez, pode estar em elementos genéricos

**Solução**:
- 5 tentativas com delays crescentes (2s, 4s, 6s, 8s, 10s)
- Busca em múltiplos tipos de elementos
- Fallback regex no texto completo da página
- Padrão regex: `/[a-zA-Z0-9]{24,}/`

### Problema 4: Navegação timeout
**Causa**: `waitUntil: 'networkidle2'` muito restritivo em SPAs

**Solução**:
- Mudado para `waitUntil: 'domcontentloaded'`
- Waits específicos por seletor após navegação
- Timeouts aumentados (60s navegação, 30s elementos)

### Problema 5: Múltiplos browsers causando crashes
**Causa**: Concorrência alta (5 browsers) causando OOM

**Solução**:
- Reduzido para 1 browser (estabilidade primeiro)
- Flags Chrome otimizadas para baixo consumo de memória
- Processamento sequencial estrito (não avança sem token)

### Problema 6: "tail: cannot open automation.log"
**Causa**: Log não criado antes de tentar ler

**Solução**:
- Criação de diretórios e logs antes de iniciar
- Logs separados por agente
- Verificação de existência antes de `tail`

## 📊 Estado Atual do Projeto

### Processos Rodando
```bash
# Verificar processos
ssh root@38.242.195.142 "ps aux | grep -E 'generate-f360|agent-puppeteer-alt|agent-playwright'"

# Status esperado:
# - node generate-f360-tokens.js (PID variável)
# - node agents/agent-puppeteer-alt.js (PID variável)
# - python3 agents/agent-playwright.py (PID variável)
```

### Progresso
- **Total**: 212 registros
- **Processados**: ~50-60 (varia conforme execução)
- **Sucessos**: 0 tokens gerados até agora
- **Erros**: Principalmente "Botão + CRIAR não encontrado" e "Session closed"

### Logs para Monitoramento
```bash
# Main
tail -f /tmp/f360-token-generator/automation.log

# Alt
tail -f /tmp/f360-token-generator/output/automation-alt.log

# Py
tail -f /tmp/f360-token-generator/output/automation-py.log
```

## 🎯 Modo Estrito Implementado

### Regras
1. **Não avança para próximo login sem token**
2. **Retentativas**: Main (30x), Alt (10-20x), Py (5x)
3. **Backoff exponencial**: 2s, 4s, 8s, 16s...
4. **Abortar se falhar todas as tentativas**: não consome próximo registro

### Benefícios
- Foco total em resolver o problema atual
- Não desperdiça tentativas em logins que já funcionam
- Facilita debugging (sabe exatamente qual login está travando)

## 🔍 Estratégias de Busca do Botão "+ CRIAR"

### Localização Confirmada
- **Menu lateral esquerdo** (sidebar)
- **Parte inferior** do menu
- **Canto inferior esquerdo** da tela
- Botão azul com texto "+ CRIAR"

### Métodos Implementados

#### 1. Busca por Seletor CSS
```javascript
// Sidebar primeiro
const sidebar = document.querySelector('aside, nav, [class*="sidebar"]');
// Depois busca dentro do sidebar
sidebar.querySelectorAll('button, a, [role="button"]');
```

#### 2. Busca por Posição
```javascript
// left < 30-35% da largura
// bottom > 65-70% da altura
rect.left < window.innerWidth * 0.3
rect.bottom > window.innerHeight * 0.7
```

#### 3. Busca por Texto
```javascript
// Texto exato ou parcial
text.includes('CRIAR') || text.includes('+ CRIAR')
```

#### 4. **Fallback por Coordenadas XY** ⭐
```javascript
// Clique direto no canto inferior esquerdo
await page.mouse.click(50, window.innerHeight - 50);
// Ou
await page.evaluate(() => {
  document.elementFromPoint(50, window.innerHeight - 50).click();
});
```

#### 5. Busca por FAB (Floating Action Button)
```javascript
// Botão fixo ou absoluto no canto inferior esquerdo
style.position === 'fixed' || style.position === 'absolute'
```

## 💾 Persistência de Dados

### Banco de Dados (Supabase)
```sql
INSERT INTO f360_config (company_cnpj, company_name, api_key, is_active, created_at, updated_at)
VALUES ($1, $2, $3, true, NOW(), NOW())
ON CONFLICT (company_cnpj)
DO UPDATE SET
  api_key = EXCLUDED.api_key,
  company_name = EXCLUDED.company_name,
  is_active = true,
  updated_at = NOW();
```

### Arquivos JSON
- `f360-tokens-progress.json`: Progresso incremental
- `f360-tokens-extracted.json`: Resultados finais
- `errors.json`: Erros separados

### SQL Gerado
- `insert-f360-config.sql`: SQL para inserção manual se necessário

## 🚀 Comandos Úteis

### Iniciar Agentes
```bash
# TODOS OS 5 AGENTES EM PARALELO (RECOMENDADO)
cd /tmp/f360-token-generator && ./run-all-agents.sh

# Ou individualmente:
# CODEX (0-49)
cd /tmp/f360-token-generator && node agents/agent-1-codex.js OFFSET=0 LIMIT=50

# DEEPSEEK (50-99)
cd /tmp/f360-token-generator && node agents/agent-2-deepseek.js OFFSET=50 LIMIT=50

# GEMINI (100-149)
cd /tmp/f360-token-generator && node agents/agent-3-gemini.js OFFSET=100 LIMIT=50

# MISTRAL (150-199)
cd /tmp/f360-token-generator && node agents/agent-4-mistral.js OFFSET=150 LIMIT=50

# QWEN (200-211)
cd /tmp/f360-token-generator && node agents/agent-5-qwen.js OFFSET=200 LIMIT=12
```

### Parar Agentes
```bash
# Todos
ssh root@38.242.195.142 "pkill -f 'generate-f360'; pkill -f 'agent-puppeteer-alt'; pkill -f 'agent-playwright'"

# Específico
ssh root@38.242.195.142 "pkill -f 'agent-puppeteer-alt'"
```

### Verificar Progresso
```bash
ssh root@38.242.195.142 "cd /tmp/f360-token-generator && python3 << 'PY'
import json
with open('output/f360-tokens-progress.json') as f:
    data = json.load(f)
p = len(data)
s = sum(1 for r in data if r.get('status') == 'success' and r.get('token'))
print(f'Processados: {p}/212, Sucessos: {s}')
PY"
```

### Verificar Tokens no Banco
```bash
PGPASSWORD='B5b0dcf500@#' psql -h db.xzrmzmcoslomtzkzgskn.supabase.co -p 5432 -U postgres -d postgres -c "SELECT COUNT(*) FROM f360_config WHERE api_key IS NOT NULL;"
```

## 📝 Melhorias Implementadas

### 1. Tratamento de Erros Robusto
- Try-catch em todos os pontos críticos
- Verificação de página fechada antes de operações
- Screenshots apenas se página estiver aberta
- Logs detalhados de erros

### 2. Modo Estrito
- Não avança sem token
- Retentativas configuráveis
- Backoff exponencial
- Abortar após N tentativas

### 3. Múltiplas Estratégias
- 5 sub-agentes no Main
- 3 agentes diferentes (Main, Alt, Py)
- Fallback por coordenadas XY
- Busca heurística + posição + texto

### 4. Observabilidade
- Logs separados por agente
- Heartbeat a cada registro
- Progresso salvo incrementalmente
- Screenshots em pontos críticos

### 5. Persistência
- Salva no banco a cada lote
- JSON incremental
- SQL gerado automaticamente
- Campo `company_name` incluído

## ⚠️ Problemas Conhecidos

### 1. Taxa de Sucesso: 0%
- **Status**: Nenhum token gerado até agora
- **Causa provável**: Botão "+ CRIAR" ainda não sendo encontrado consistentemente
- **Ação**: Implementar fallback por coordenadas XY (já feito, aguardando teste)

### 2. Erros Frequentes
- "Botão + CRIAR não encontrado"
- "Session closed"
- "Navigation timeout"
- "Cannot read properties of null"

### 3. Performance
- Processamento lento (modo estrito = muitas retentativas)
- 1 browser apenas (estabilidade > velocidade)

## 🎯 Próximos Passos

### Curto Prazo
1. ✅ Implementar fallback por coordenadas XY
2. ✅ Modo estrito (não avança sem token)
3. ✅ 3 agentes rodando (Main, Alt, Py)
4. ⏳ **Aguardar primeiro token gerado**
5. ⏳ Validar estratégia de coordenadas XY

### Médio Prazo
1. Aumentar concorrência para 2-3 browsers após validação
2. Otimizar tempo de espera entre tentativas
3. Adicionar mais screenshots para debugging
4. Melhorar logs com mais contexto

### Longo Prazo
1. Refatorar código para melhor manutenibilidade
2. Adicionar testes automatizados
3. Criar dashboard de monitoramento
4. Documentar API/processo completo

## 📚 Tecnologias Utilizadas

- **Node.js**: Runtime principal
- **Puppeteer**: Automação browser (Main e Alt)
- **Playwright**: Automação browser (Py)
- **Python 3.12**: Runtime para agente Py
- **PostgreSQL**: Banco de dados Supabase
- **CSV Parser**: Leitura do arquivo CSV
- **Chalk**: Logs coloridos no terminal

## 🔐 Credenciais e Configurações

### VPS
- **Host**: `38.242.195.142`
- **User**: `root`
- **SSH**: `ssh -o StrictHostKeyChecking=no root@38.242.195.142`

### Banco de Dados
- **Host**: `db.xzrmzmcoslomtzkzgskn.supabase.co`
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: `B5b0dcf500@#`

### CSV
- **Path**: `/tmp/F360_Lista_Acessos_COMPLETA.csv`
- **Campos**: Login, Senha, CNPJ, Empresa

## 📞 Contatos e Referências

### Documentação
- Puppeteer: https://pptr.dev
- Playwright: https://playwright.dev/python
- Supabase: https://supabase.com/docs

### Arquivos Importantes
- Prompt original: `PROMPT_AUTOMACAO_F360.md`
- Scripts de execução: `run-*.sh`
- Agentes: `agents/agent-*.js` e `agents/agent-*.py`

---

**Última atualização**: 2024-12-XX
**Status**: Em execução - aguardando primeiro token
**Versão**: 1.0.0

