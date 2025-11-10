# 🔌 Configuração MCP (Model Context Protocol)

## 📦 Servidores MCP Solicitados

Você mencionou estes servidores MCP:
1. **SchemaFlow** - Validação e geração de schemas
2. **MCPRUFF MCP** (Gratuito) - Análise de código
3. **JSON Schema Validator** - Validação de JSON schemas

## ⚠️ Status

Os pacotes npm exatos para esses servidores não foram encontrados. Você precisa:

1. **Verificar os nomes corretos dos pacotes** nos repositórios GitHub ou documentação
2. **Ou fornecer os comandos corretos** para iniciar esses servidores

## 🔧 Como Adicionar Servidores MCP

### Opção 1: Via Arquivo de Configuração

Edite `.cursor/mcp.json` e adicione:

```json
{
  "mcpServers": {
    "schemaflow": {
      "command": "npx",
      "args": ["-y", "@schemaflow/mcp-server"],
      "env": {}
    },
    "mcpruff": {
      "command": "npx",
      "args": ["-y", "@mcpruff/server"],
      "env": {}
    },
    "json-schema-validator": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-json-schema"],
      "env": {}
    }
  }
}
```

### Opção 2: Via Cursor Settings

1. Abra Cursor Settings (Cmd+,)
2. Procure por "MCP" ou "Model Context Protocol"
3. Adicione os servidores manualmente

### Opção 3: Via Configuração Global do Cursor

O Cursor também lê configurações de `~/.cursor/mcp.json` ou `~/.config/cursor/mcp.json`

## 🚀 Servidor MCP Atual Configurado

- ✅ **filesystem** - Acesso ao sistema de arquivos do projeto

## 📚 Recursos

- [Model Context Protocol Docs](https://modelcontextprotocol.io)
- [Cursor MCP Documentation](https://cursor.sh/docs/mcp)

## 💡 Próximos Passos

Se você tiver os links/repositórios dos servidores SchemaFlow, MCPRUFF e JSON Schema Validator, posso ajudar a configurá-los corretamente!
