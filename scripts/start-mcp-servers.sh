#!/bin/bash

# 🚀 Script para iniciar servidores MCP
# Uso: ./scripts/start-mcp-servers.sh

echo "🔌 Iniciando servidores MCP..."
echo ""

# SchemaFlow MCP
echo "📊 Iniciando SchemaFlow MCP..."
npx -y @schemaflow/mcp-server &
SCHEMAFLOW_PID=$!
echo "   PID: $SCHEMAFLOW_PID"

# MCPRUFF MCP
echo "🔍 Iniciando MCPRUFF MCP..."
npx -y @mcpruff/server &
MCPRUFF_PID=$!
echo "   PID: $MCPRUFF_PID"

# JSON Schema Validator MCP
echo "✅ Iniciando JSON Schema Validator MCP..."
npx -y @modelcontextprotocol/server-json-schema &
JSON_VALIDATOR_PID=$!
echo "   PID: $JSON_VALIDATOR_PID"

echo ""
echo "✅ Servidores MCP iniciados!"
echo ""
echo "Para parar os servidores, execute:"
echo "  kill $SCHEMAFLOW_PID $MCPRUFF_PID $JSON_VALIDATOR_PID"
echo ""
echo "Ou salve os PIDs:"
echo "echo '$SCHEMAFLOW_PID $MCPRUFF_PID $JSON_VALIDATOR_PID' > /tmp/mcp-pids.txt"

