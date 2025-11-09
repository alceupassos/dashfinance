# Quick Start - F360 Token Scraper

## Instalação Rápida

```bash
# 1. Instalar dependências
pip install -r automation/requirements.txt

# 2. Instalar navegadores do Playwright
playwright install chromium
```

## Execução

### Primeira vez (recomendado - com interface gráfica para debug):
```bash
cd /Users/alceualvespasssosmac/dashfinance
python automation/f360_token_scraper.py
```

### Execução em produção (headless):
```bash
python automation/f360_token_scraper.py --headless
```

## O que o script faz:

1. ✅ Cria backup automático do CSV
2. ✅ Lê credenciais do arquivo `docs/F360 - Lista de acessos.csv`
3. ✅ Para cada cliente:
   - Faz login no F360
   - Navega até Integrações
   - Cria Webhook API Pública 360
   - Extrai o token
4. ✅ Atualiza o CSV com a coluna "Token"
5. ✅ Gera relatório de resultados

## Arquivos importantes:

- **Script principal**: `automation/f360_token_scraper.py`
- **CSV de entrada**: `docs/F360 - Lista de acessos.csv`
- **Backup CSV**: `docs/F360 - Lista de acessos_backup_*.csv`
- **Log de execução**: `automation/f360_token_scraper.log`
- **Relatório**: `automation/f360_results_*.txt`

## Troubleshooting

Se o script não encontrar elementos na página:
1. Execute em modo não-headless primeiro para ver o que está acontecendo
2. Verifique os logs em `automation/f360_token_scraper.log`
3. Os seletores podem precisar ser ajustados baseados nas imagens `passo*.png`

## Notas

- O script aguarda 3 segundos entre cada cliente
- Clientes sem login/senha são pulados automaticamente
- Erros são registrados mas não interrompem o processamento dos demais clientes

