# RAG: Cursor 2.0 Multi-Agent System

## 📋 Contexto e Definição

**Cursor 2.0** é um IDE (Integrated Development Environment) que integra IA generativa para assistência em programação. O recurso **Multi-Agent** permite criar e gerenciar múltiplos "agentes" (personas/configurações de IA) que podem trabalhar em paralelo ou sequencialmente em diferentes tarefas.

## 🎯 Conceito de "Agente" no Cursor

No contexto do Cursor, um **"Agent"** não é um processo separado rodando na VPS, mas sim uma **configuração/persona de IA** dentro da interface do Cursor que pode:

- Ter seu próprio modelo de IA (GPT-4, GPT-5, Claude, etc.)
- Ter instruções de sistema (system prompts) específicas
- Trabalhar em arquivos/projetos específicos
- Ser acionado manualmente ou via comandos
- Manter contexto separado de outros agentes

## 🔍 Diferença: Agents (Cursor UI) vs Processos (VPS)

### Agents no Cursor (Interface)
- **Localização**: Painel lateral esquerdo → "Agents"
- **Tipo**: Configurações de IA dentro do Cursor
- **Função**: Personas especializadas para diferentes tarefas
- **Exemplo**: 
  - Agent 1: "Frontend Specialist" (GPT-4)
  - Agent 2: "Backend Expert" (Claude)
  - Agent 3: "Code Reviewer" (GPT-5)

### Processos na VPS (Execução)
- **Localização**: Servidor remoto (38.242.195.142)
- **Tipo**: Processos Node.js/Python rodando scripts
- **Função**: Automação real (Puppeteer/Playwright)
- **Exemplo**:
  - `node generate-f360-tokens.js` (PID 3602237)
  - `node agents/agent-puppeteer-alt.js` (PID 3608728)
  - `python3 agents/agent-playwright.py` (PID 3604282)

## 📚 Como Criar Múltiplos Agents no Cursor

### Passo 1: Acessar o Painel de Agents
1. Abra o Cursor
2. No painel esquerdo, clique em **"Agents"** (ao lado de "Editor")
3. Você verá a lista de agents existentes

### Passo 2: Criar Novo Agent
1. Clique em **"New Agent"** (botão no topo do painel)
2. Configure:
   - **Name**: Nome descritivo (ex: "F360 Puppeteer Alt")
   - **Model**: Escolha o modelo (GPT-5, GPT-4, Claude, etc.)
   - **System Prompt**: Instruções específicas para este agent
   - **Tools**: Ferramentas que o agent pode usar
   - **Files/Context**: Arquivos que o agent deve focar

### Passo 3: Usar o Agent
- Selecione o agent na lista
- Faça perguntas/comandos específicos para aquele agent
- Cada agent mantém seu próprio contexto

## 🎨 Caso de Uso: F360 Token Generator

### Situação Atual
- **1 Agent no Cursor**: "Automation prompt for F360" (orquestrando tudo)
- **3 Processos na VPS**: Main, Alt, Py (rodando automação)

### Proposta: 3 Agents no Cursor

#### Agent 1: "F360 Main Orchestrator"
- **Model**: GPT-5 High
- **System**: "Orquestra os 3 processos na VPS, monitora logs, reporta progresso"
- **Tools**: SSH, SCP, file reading
- **Context**: `generate-f360-tokens.js`, logs principais

#### Agent 2: "F360 Puppeteer Alt"
- **Model**: GPT-5 Codex
- **System**: "Foca no agente Alt (Puppeteer simplificado), analisa erros específicos, sugere melhorias"
- **Tools**: SSH, log analysis
- **Context**: `agents/agent-puppeteer-alt.js`, `output/automation-alt.log`

#### Agent 3: "F360 Playwright Python"
- **Model**: GPT-5 Codex
- **System**: "Foca no agente Python (Playwright), analisa performance, debug de erros Python"
- **Tools**: SSH, Python debugging
- **Context**: `agents/agent-playwright.py`, `output/automation-py.log`

## 🔧 Comandos Úteis para Agents

### Verificar Status dos Processos
```bash
ssh root@38.242.195.142 "ps aux | grep -E 'generate-f360|agent-puppeteer-alt|agent-playwright'"
```

### Monitorar Logs
```bash
# Main
tail -f /tmp/f360-token-generator/automation.log

# Alt
tail -f /tmp/f360-token-generator/output/automation-alt.log

# Py
tail -f /tmp/f360-token-generator/output/automation-py.log
```

### Reiniciar Agente Específico
```bash
# Alt
ssh root@38.242.195.142 "cd /tmp/f360-token-generator && pkill -f 'agent-puppeteer-alt' && LIMIT=106 OFFSET=0 RETRIES=20 ./run-alt.sh"

# Py
ssh root@38.242.195.142 "cd /tmp/f360-token-generator && pkill -f 'agent-playwright' && LIMIT=106 OFFSET=106 ./run-py.sh"
```

## 📊 Benefícios do Multi-Agent no Cursor

1. **Especialização**: Cada agent foca em uma área específica
2. **Paralelismo**: Múltiplos agents podem trabalhar simultaneamente
3. **Contexto Isolado**: Cada agent mantém seu próprio histórico
4. **Debugging Focado**: Mais fácil identificar problemas em agentes específicos
5. **Escalabilidade**: Fácil adicionar novos agents para novas funcionalidades

## ⚠️ Limitações e Considerações

- **Recursos**: Cada agent consome tokens/API calls
- **Coordenação**: Agents não se comunicam automaticamente (precisa orquestração manual)
- **Sincronização**: Mudanças em arquivos precisam ser sincronizadas entre agents
- **Custo**: Múltiplos agents = múltiplas chamadas de API

## 🚀 Próximos Passos Recomendados

1. **Criar os 3 Agents no Cursor** conforme descrito acima
2. **Atribuir responsabilidades claras** para cada agent
3. **Monitorar performance** de cada agent separadamente
4. **Ajustar system prompts** baseado em resultados
5. **Documentar padrões** de uso para futuros projetos

## 📝 Notas Finais

- O recurso Multi-Agent do Cursor é relativamente novo e pode ter mudanças frequentes
- A documentação oficial pode estar desatualizada - sempre testar na prática
- A interface pode variar entre versões do Cursor
- Para informações mais atualizadas, consultar: https://cursor.sh/docs ou comunidade do Cursor

---

**Última atualização**: 2024-12-XX
**Versão do Cursor**: 2.0+
**Status**: Em desenvolvimento ativo

