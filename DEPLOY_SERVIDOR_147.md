DEPLOY N8N - SERVIDOR 147
================================

1. SSH NO SERVIDOR 147
   $ ssh root@147.X.X.X

2. VERIFICAR SE N8N ESTÁ RODANDO
   $ curl -s http://n8n.angrax.com.br/health
   
   Se retornar 200 OK: N8N está ativo
   Se falhar: rodar docker-compose

3. SE N8N NÃO ESTIVER ATIVO
   $ cd /root/n8n (ou onde está o docker-compose.yml)
   $ docker-compose up -d
   $ sleep 10
   $ curl -s http://n8n.angrax.com.br/health

4. COPIAR WORKFLOWS PARA SERVIDOR
   Do seu PC:
   $ scp n8n-workflows/01_resumo_executivo_diario.json root@147.X.X.X:/root/dashfinance/n8n-workflows/
   $ scp n8n-workflows/02_detector_saldo_critico_realtime.json root@147.X.X.X:/root/dashfinance/n8n-workflows/

5. EXECUTAR SCRIPT DE DEPLOY
   No servidor 147:
   $ bash deploy-n8n-servidor147.sh

6. CONFIGURAR NO N8N
   - Acesse: http://n8n.angrax.com.br
   - Vá em: Settings → Credentials
   - Adicione:
     * Supabase (com API keys)
     * HTTP Header Auth para WASender

7. IMPORTAR WORKFLOWS MANUALMENTE (se script falhar)
   - No N8N: Import from File
   - Selecione os 2 JSONs
   - Configure credenciais para cada node
   - Teste com trigger manual

8. TESTAR
   - Clique em "Execute Workflow"
   - Verifique se Jessica recebeu mensagem no WhatsApp
   - Confirme em: docker logs n8n

RESUMO
======
Depois que N8N estiver rodando e workflows importados:
- Workflow 01: Roda às 08:00 diárias (Resumo)
- Workflow 02: Roda a cada 30min (Alerta crítico)
- Jessica receberá mensagens automaticamente

SUPORTE
=======
Se problema:
1. Verificar logs: docker logs n8n
2. Testar curl: curl -X POST http://n8n.angrax.com.br/api/v1/workflows
3. Verificar credenciais Supabase + WASender
4. Checar se Edge Functions estão deployadas

Pronto para executar?

