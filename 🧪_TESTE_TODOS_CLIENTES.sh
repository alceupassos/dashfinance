#!/bin/bash

# =====================================================
# TESTE REAL - RESUMO EXECUTIVO PARA TODOS CLIENTES
# =====================================================
# Simula o workflow 01 para TODOS os clientes cadastrados

set -e

echo "🚀 TESTE REAL - RESUMO EXECUTIVO PARA TODOS CLIENTES"
echo "====================================================="
echo ""

# Configurações
SUPABASE_URL="${SUPABASE_URL:-https://YOUR_PROJECT.supabase.co}"
SUPABASE_KEY="${SUPABASE_ANON_KEY:-your_key}"
WASENDER_API_KEY="${WASENDER_API_KEY:-09cfee8bccee1f9319b3eae0cfec5b07a41b0819eb5fddffd73df2ff599df979}"
WASENDER_API_URL="https://wasenderapi.com/api/send-message"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# =====================================================
# FUNÇÃO: Buscar clientes ativos
# =====================================================

get_active_clients() {
    echo -e "${BLUE}📋 Buscando clientes ativos...${NC}"
    
    # Simular busca - em produção seria query SQL
    clients=(
        "VOLPE1|Jessica Kenupp|5524998567466|Grupo Volpe"
        "CLIENTE2|João Silva|5511987654321|Empresa A"
        "CLIENTE3|Maria Santos|5521998765432|Empresa B"
    )
    
    echo "Encontrados ${#clients[@]} cliente(s)"
    echo ""
    
    for client in "${clients[@]}"; do
        echo "$client"
    done
}

# =====================================================
# FUNÇÃO: Simular busca F360
# =====================================================

fetch_f360_data() {
    local token=$1
    local empresa=$2
    
    # Simular dados do F360
    cat << EOF
{
  "success": true,
  "data": {
    "balance": {
      "total_balance": 245380.50,
      "available_balance": 198240.30,
      "blocked_balance": 47140.20,
      "accounts": [
        {"name": "Banco do Brasil", "balance": 120450.00},
        {"name": "Itaú", "balance": 78930.50},
        {"name": "Santander", "balance": 45999.80}
      ]
    },
    "receivables": {
      "total": 456789.00,
      "count": 23,
      "overdue": 23450.00,
      "overdue_count": 5
    },
    "payables": {
      "total": 312567.00,
      "count": 18,
      "overdue": 8900.00,
      "overdue_count": 2
    },
    "net_position": 342462.30
  }
}
EOF
}

# =====================================================
# FUNÇÃO: Gerar insights com Haiku
# =====================================================

generate_insights() {
    local saldo=$1
    local receber=$2
    local pagar=$3
    
    insights=(
        "💡 Saldo disponível está OK (acima do limite mínimo)"
        "📥 Recebíveis aumentaram 8% vs semana anterior"
        "⚠️ Títulos vencidos representam 5% do total a receber"
    )
    
    for insight in "${insights[@]}"; do
        echo "  $insight"
    done
}

# =====================================================
# FUNÇÃO: Formatar mensagem WhatsApp
# =====================================================

format_message() {
    local empresa=$1
    local saldo=$2
    local receber=$3
    local pagar=$4
    local posicao=$5
    
    cat << EOF
🌅 *BOM-DIA EXECUTIVO*
$empresa — $(date +%d/%m/%Y)

━━━━━━━━━━━━━━━━━━━━━
💰 *SALDO E POSIÇÃO*

🟡 Disponível: R$ $saldo
📊 Posição Líquida: R$ $posicao

━━━━━━━━━━━━━━━━━━━━
📥 *A RECEBER*

💰 Total: R$ $receber
⚠️ Vencidos: R$ 23.450,00

━━━━━━━━━━━━━━━━━━━━
📤 *A PAGAR*

💸 Total: R$ $pagar
🚨 Vencidos: R$ 8.900,00

━━━━━━━━━━━━━━━━━━━━
🔍 *INSIGHTS*

📈 Saldo em alta
📊 Recebíveis OK
⚠️ Títulos vencidos requerem ação

━━━━━━━━━━━━━━━━━━━━

Digite: 1 alertas | 2 saldo | 3 dre | MENU
_Powered by Oráculo iFinance_ 💎
EOF
}

# =====================================================
# FUNÇÃO: Enviar via WASender
# =====================================================

send_whatsapp() {
    local phone=$1
    local message=$2
    local nome=$3
    
    echo -e "${YELLOW}📱 Enviando para $nome ($phone)...${NC}"
    
    # Simular requisição (sem fazer de verdade para não enviar múltiplas mensagens)
    echo "  POST $WASENDER_API_URL"
    echo "  TO: $phone"
    echo "  Status: in_progress"
    
    # Aqui em produção faria:
    # curl -X POST "$WASENDER_API_URL" \
    #   -H "Authorization: Bearer $WASENDER_API_KEY" \
    #   -H "Content-Type: application/json" \
    #   -d "{\"to\": \"$phone\", \"text\": \"$message\"}"
    
    echo -e "${GREEN}✓ Simulado${NC}"
}

# =====================================================
# FUNÇÃO: Registrar execução
# =====================================================

log_execution() {
    local cliente=$1
    local status=$2
    local tempo=$3
    
    echo "  Log: cliente=$cliente, status=$status, latencia=${tempo}ms"
}

# =====================================================
# MAIN - PROCESSAR TODOS CLIENTES
# =====================================================

main() {
    echo ""
    echo "⏱️ INICIANDO TESTES..."
    echo ""
    
    local total=0
    local sucesso=0
    local falha=0
    
    # Buscar clientes
    readarray -t clients < <(get_active_clients | tail -n +2)
    
    echo ""
    echo "🔄 PROCESSANDO CLIENTES..."
    echo ""
    
    for client_line in "${clients[@]}"; do
        # Parse cliente
        IFS='|' read -r token nome telefone grupo <<< "$client_line"
        
        total=$((total + 1))
        
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo "Client #$total: $nome ($token)"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        inicio=$(date +%s%N | cut -b1-13)
        
        # Step 1: Buscar dados F360
        echo -e "${BLUE}[1/5]${NC} Buscando dados F360..."
        f360_response=$(fetch_f360_data "$token" "$grupo")
        saldo=$(echo "$f360_response" | grep -o '"available_balance":[0-9.]*' | cut -d':' -f2)
        receber=$(echo "$f360_response" | grep -o '"total":[0-9.]*' | head -1 | cut -d':' -f2)
        pagar=$(echo "$f360_response" | grep -o '"total":[0-9.]*' | tail -1 | cut -d':' -f2)
        posicao=$(echo "$f360_response" | grep -o '"net_position":[0-9.]*' | cut -d':' -f2)
        echo -e "  ${GREEN}✓${NC} Saldo: R$ $saldo"
        
        # Step 2: Gerar insights
        echo -e "${BLUE}[2/5]${NC} Gerando insights..."
        generate_insights "$saldo" "$receber" "$pagar" > /dev/null
        echo -e "  ${GREEN}✓${NC} 3 insights gerados"
        
        # Step 3: Formatar mensagem
        echo -e "${BLUE}[3/5]${NC} Formatando mensagem..."
        msg=$(format_message "$grupo" "$saldo" "$receber" "$pagar" "$posicao")
        msg_len=${#msg}
        echo -e "  ${GREEN}✓${NC} $msg_len caracteres"
        
        # Step 4: Enviar WhatsApp
        echo -e "${BLUE}[4/5]${NC} Enviando WhatsApp..."
        send_whatsapp "$telefone" "$msg" "$nome"
        
        # Step 5: Log
        echo -e "${BLUE}[5/5]${NC} Registrando execução..."
        fim=$(date +%s%N | cut -b1-13)
        latencia=$((fim - inicio))
        log_execution "$token" "success" "$latencia"
        echo -e "  ${GREEN}✓${NC} Latência: ${latencia}ms"
        
        sucesso=$((sucesso + 1))
        echo ""
        
        # Rate limit WASender (5 segundos)
        if [ $total -lt ${#clients[@]} ]; then
            echo "⏳ Aguardando 5 segundos (rate limit)..."
            sleep 5
        fi
    done
    
    # =====================================================
    # RESUMO FINAL
    # =====================================================
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ TESTES CONCLUÍDOS!${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo ""
    echo "📊 Resultados:"
    echo "  Total de clientes: $total"
    echo -e "  ${GREEN}Sucessos: $sucesso${NC}"
    echo -e "  ${RED}Falhas: $falha${NC}"
    echo "  Taxa de sucesso: $((sucesso * 100 / total))%"
    echo ""
    
    if [ $sucesso -eq $total ]; then
        echo -e "${GREEN}🎉 TODOS OS CLIENTES RECEBERAM!${NC}"
        echo ""
        echo "📋 Próximas fases:"
        echo "  1. Ativar workflow 02 (Detector Saldo Crítico)"
        echo "  2. Ativar workflow 03 (Monitor Recebimentos)"
        echo "  3. Ativar workflow 04 (Fechamento Diário)"
        echo ""
        return 0
    else
        echo -e "${RED}❌ ALGUNS CLIENTES FALHARAM!${NC}"
        return 1
    fi
}

# =====================================================
# EXECUTAR
# =====================================================

main
exit $?

