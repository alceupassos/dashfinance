# Instalação Manual - F360 Token Scraper

## Comandos para executar no seu terminal (fora do Cursor)

Copie e cole estes comandos no seu terminal macOS:

### 1. Navegar até o diretório do projeto
```bash
cd /Users/alceualvespasssosmac/dashfinance
```

### 2. Instalar dependências Python
```bash
python3 -m pip install --user playwright==1.40.0
```

### 3. Instalar navegadores Playwright
```bash
python3 -m playwright install chromium
```

### 4. Verificar instalação
```bash
python3 -c "import playwright; print('✅ Playwright instalado com sucesso!')"
```

## Executar o script

### Primeira execução (com interface gráfica para debug):
```bash
python3 automation/f360_token_scraper.py
```

### Execução em produção (headless - sem interface):
```bash
python3 automation/f360_token_scraper.py --headless
```

### Ver ajuda:
```bash
python3 automation/f360_token_scraper.py --help
```

## Arquivos que serão gerados:

- **Backup CSV**: `docs/F360 - Lista de acessos_backup_YYYYMMDD_HHMMSS.csv`
- **Log**: `automation/f360_token_scraper.log`
- **Relatório**: `automation/f360_results_YYYYMMDD_HHMMSS.txt`
- **CSV atualizado**: `docs/F360 - Lista de acessos.csv` (com coluna Token adicionada)

## Troubleshooting

### Se o pip não funcionar:
```bash
# Tentar com --user
python3 -m pip install --user playwright==1.40.0

# Ou criar um ambiente virtual
python3 -m venv venv
source venv/bin/activate
pip install playwright==1.40.0
playwright install chromium
```

### Se der erro de permissão:
```bash
# Usar --user para instalar no diretório do usuário
python3 -m pip install --user playwright==1.40.0
```

### Se o Playwright não encontrar o navegador:
```bash
# Reinstalar navegadores
python3 -m playwright install --force chromium
```

## Notas importantes:

1. **Execute os comandos no Terminal do macOS**, não no terminal do Cursor
2. O script vai processar **214 clientes** do CSV
3. Aguarde cerca de **3 segundos entre cada cliente** (total ~11 minutos)
4. Um **backup automático** é criado antes de modificar o CSV
5. Se algum cliente falhar, o script continua com os próximos
6. Todos os erros são registrados no arquivo de log

