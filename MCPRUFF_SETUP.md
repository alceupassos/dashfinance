# 🔍 MCPRUFF MCP - Guia de Instalação

## ⚠️ Status Atual

**MCPRUFF MCP não foi encontrado** nos repositórios públicos. Possíveis razões:

1. **Nome diferente** - Pode ter outro nome no npm/GitHub
2. **Servidor privado** - Pode ser um servidor MCP customizado
3. **Ainda em desenvolvimento** - Pode não estar publicado ainda

## 🔧 Como Adicionar Quando Encontrar

### Opção 1: Via npm/npx

Se o MCPRUFF estiver no npm, adicione ao `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mcpruff": {
      "command": "npx",
      "args": ["-y", "@mcpruff/server"],
      "env": {}
    }
  }
}
```

### Opção 2: Via GitHub

Se estiver no GitHub, use:

```json
{
  "mcpServers": {
    "mcpruff": {
      "command": "npx",
      "args": ["-y", "github:mcpruff/mcp-server"],
      "env": {}
    }
  }
}
```

### Opção 3: Via Script Local

Se você tiver o código localmente:

```json
{
  "mcpServers": {
    "mcpruff": {
      "command": "node",
      "args": ["./path/to/mcpruff/server.js"],
      "env": {}
    }
  }
}
```

## 🔍 Onde Procurar

1. **npm**: https://www.npmjs.com/search?q=mcpruff
2. **GitHub**: https://github.com/search?q=mcpruff+mcp
3. **MCP Marketplace**: https://mcprocess.pro
4. **Documentação Cursor**: Verificar se há lista de servidores MCP

## 💡 Alternativas Disponíveis

Enquanto não encontramos o MCPRUFF, você pode usar:

- **@modelcontextprotocol/server-filesystem** - Acesso ao sistema de arquivos
- **@modelcontextprotocol/server-github** - Integração com GitHub
- **@modelcontextprotocol/server-postgres** - Acesso a banco de dados

## 📝 Próximos Passos

1. Verificar se você tem o link/repositório do MCPRUFF
2. Verificar se o nome está correto (pode ser "MCP Ruff", "mcp-ruff", etc.)
3. Se encontrar, atualizar este arquivo com as instruções corretas

## 🚀 Script de Instalação Automática

Execute quando encontrar o nome correto:

```bash
# Edite o script abaixo com o nome correto do pacote
./scripts/add-mcp-server.sh mcpruff "@mcpruff/server"
```

