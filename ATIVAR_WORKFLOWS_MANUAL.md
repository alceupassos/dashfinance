ATIVAR WORKFLOWS NO N8N - MANUAL
================================

Acesse: https://n8n.angrax.com.br/home/workflows

Procure por:
1. "01 - Resumo Executivo Diário"
2. "02 - Detector Saldo Crítico (Real-Time)"

Para cada workflow:
1. Clique no workflow
2. No canto superior direito, há um toggle "Active"
3. Clique para ATIVAR (deve ficar verde/azul)
4. Salve (Ctrl+S ou menu Save)

Se os workflows não aparecerem na lista:

OPÇÃO A: Importar via Interface
================================
1. Clique: "+ Create Workflow"
2. Menu: "Import from File"
3. Selecione: /dashfinance/n8n-workflows/01_resumo_executivo_diario.json
4. Repita para: /dashfinance/n8n-workflows/02_detector_saldo_critico_realtime.json

OPÇÃO B: Executar via Script (automático)
==========================================
Execute no servidor:

ssh root@147.93.183.55 << 'EOF'
cd /dashfinance
docker exec n8n n8n import:workflow --input=/dashfinance/n8n-workflows/01_resumo_executivo_diario.json
docker exec n8n n8n import:workflow --input=/dashfinance/n8n-workflows/02_detector_saldo_critico_realtime.json
docker exec n8n n8n update:workflow --id=WORKFLOW_ID --active=true
EOF

VERIFICAR STATUS
================

No N8N:
1. Clique em: "Executions" (aba)
2. Veja se há execuções dos workflows
3. Ou clique em cada workflow e veja "Runs"

Via Terminal:
docker logs n8n | tail -50

RESUMO
======

Status Esperado:
✓ Workflow 01: Ativo (executa diariamente 08:00)
✓ Workflow 02: Ativo (executa a cada 30min)
✓ Jessica recebe mensagens automaticamente

Próximos passos:
1. Importar/Ativar os workflows
2. Aguardar Jessica mandar mensagem
3. Sistema ativa automações automaticamente
4. Mensagens começam a ser entregues

