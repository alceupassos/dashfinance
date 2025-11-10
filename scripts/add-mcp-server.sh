#!/bin/bash

# 🔌 Script para adicionar servidor MCP ao projeto
# Uso: ./scripts/add-mcp-server.sh <nome> <pacote-npm>

if [ $# -lt 2 ]; then
  echo "❌ Uso: $0 <nome-servidor> <pacote-npm>"
  echo ""
  echo "Exemplos:"
  echo "  $0 mcpruff @mcpruff/server"
  echo "  $0 schemaflow @schemaflow/mcp-server"
  echo "  $0 json-validator @modelcontextprotocol/server-json-schema"
  exit 1
fi

SERVER_NAME=$1
PACKAGE=$2
MCP_FILE=".cursor/mcp.json"

echo "🔌 Adicionando servidor MCP: $SERVER_NAME"
echo "📦 Pacote: $PACKAGE"
echo ""

# Verificar se o arquivo existe
if [ ! -f "$MCP_FILE" ]; then
  echo "📝 Criando arquivo $MCP_FILE..."
  mkdir -p .cursor
  echo '{"mcpServers": {}}' > "$MCP_FILE"
fi

# Testar se o pacote existe
echo "🔍 Verificando se o pacote existe..."
if npx -y "$PACKAGE" --version > /dev/null 2>&1; then
  echo "✅ Pacote encontrado!"
else
  echo "⚠️  Pacote não encontrado no npm, mas continuando..."
fi

# Adicionar ao JSON (usando jq se disponível, senão manual)
if command -v jq &> /dev/null; then
  echo "📝 Adicionando ao $MCP_FILE usando jq..."
  jq ".mcpServers.\"$SERVER_NAME\" = {
    \"command\": \"npx\",
    \"args\": [\"-y\", \"$PACKAGE\"],
    \"env\": {}
  }" "$MCP_FILE" > "$MCP_FILE.tmp" && mv "$MCP_FILE.tmp" "$MCP_FILE"
  echo "✅ Servidor adicionado com sucesso!"
else
  echo "⚠️  jq não encontrado. Adicione manualmente ao $MCP_FILE:"
  echo ""
  echo "\"$SERVER_NAME\": {"
  echo "  \"command\": \"npx\","
  echo "  \"args\": [\"-y\", \"$PACKAGE\"],"
  echo "  \"env\": {}"
  echo "}"
fi

echo ""
echo "✅ Pronto! Reinicie o Cursor para carregar o novo servidor MCP."

