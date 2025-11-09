# F360 Token Scraper

Script Python para automação de criação de tokens Webhook API Pública 360 no sistema F360.

## Descrição

Este script automatiza o processo de:
1. Leitura de credenciais do arquivo CSV (`docs/F360 - Lista de acessos.csv`)
2. Login em cada cliente F360
3. Navegação até Menu Cadastro > Integrações
4. Criação de Webhook API Pública 360
5. Extração do token gerado
6. Atualização do CSV com a coluna de tokens

## Requisitos

- Python 3.8 ou superior
- Playwright instalado

## Instalação

1. Instalar dependências Python:
```bash
pip install -r requirements.txt
```

2. Instalar navegadores do Playwright:
```bash
playwright install chromium
```

## Uso

### Modo básico (com interface gráfica):
```bash
python automation/f360_token_scraper.py
```

### Modo headless (sem interface gráfica):
```bash
python automation/f360_token_scraper.py --headless
```

### Especificar arquivo CSV customizado:
```bash
python automation/f360_token_scraper.py --csv caminho/para/arquivo.csv
```

## Estrutura do CSV

O arquivo CSV deve ter as seguintes colunas (separadas por `;`):
- Unidade
- Login
- Senha
- Grupo
- Razão Social
- CNPJ
- Token (será adicionada automaticamente)

## Processo de Execução

O script segue os seguintes passos para cada cliente:

1. **Passo 0**: Ler dados do CSV
2. **Passo 1**: Fazer login em `http://financas.f360.com.br` com Login e Senha
3. **Passo 2**: Navegar até Menu de Cadastro
4. **Passo 3**: Clicar em Integrações
5. **Passo 4**: Clicar no botão CRIAR
6. **Passo 5**: Selecionar "Webhook API Pública 360" e criar o token
7. **Passo 6**: Copiar o token gerado
8. **Passo 7**: Atualizar o CSV com o token

## Arquivos Gerados

- **Backup do CSV**: `docs/F360 - Lista de acessos_backup_YYYYMMDD_HHMMSS.csv`
- **Log de execução**: `automation/f360_token_scraper.log`
- **Relatório de resultados**: `automation/f360_results_YYYYMMDD_HHMMSS.txt`

## Tratamento de Erros

O script possui tratamento de erros robusto:
- Falhas de login são registradas e o script continua com o próximo cliente
- Timeouts são configuráveis (padrão: 30 segundos)
- Cada erro é registrado no log com detalhes

## Configurações

Você pode ajustar as seguintes constantes no script:

- `TIMEOUT`: Timeout padrão em milissegundos (padrão: 30000)
- `WAIT_BETWEEN_CLIENTS`: Tempo de espera entre clientes em segundos (padrão: 3)
- `F360_URL`: URL base do F360 (padrão: `http://financas.f360.com.br`)

## Notas Importantes

1. **Primeira execução**: Execute em modo não-headless para verificar se os seletores estão corretos
2. **Rate limiting**: O script aguarda 3 segundos entre cada cliente para evitar bloqueios
3. **Backup automático**: Um backup do CSV original é criado antes de qualquer modificação
4. **Logs detalhados**: Todos os passos são registrados em `f360_token_scraper.log`

## Troubleshooting

### Token não encontrado
- Verifique se o webhook foi criado com sucesso
- Execute em modo não-headless para visualizar o que está acontecendo
- Verifique os logs para mais detalhes

### Login falha
- Verifique se as credenciais estão corretas no CSV
- Alguns clientes podem ter senhas vazias (serão pulados automaticamente)

### Seletores não encontrados
- O F360 pode ter mudado a interface
- Execute em modo não-headless e ajuste os seletores conforme necessário
- Os seletores são flexíveis e tentam múltiplas variações

## Exemplo de Saída

```
============================================================
F360 TOKEN SCRAPER - INICIANDO
============================================================
Total de clientes encontrados: 214

============================================================
Processando: FERREIRA E FERREIRA LTDA
CNPJ: 34.133.705/0001-07
Email: uniformespersonal@ifinance.com.br
============================================================
  → Acessando página de login...
  → Preenchendo credenciais...
  → Fazendo login...
  ✅ Login realizado com sucesso
  → Navegando para Menu Cadastro...
  → Clicando em Integrações...
  ✅ Navegação para Integrações concluída
  → Procurando botão CRIAR...
  → Botão CRIAR clicado
  → Selecionando Webhook API Pública 360...
  ✅ Webhook criado
  → Procurando token...
  ✅ Token encontrado: a1b2c3d4...e5f6g7h8
  ✅ Cliente processado com sucesso!
```

## Suporte

Para problemas ou dúvidas, verifique:
1. O arquivo de log: `automation/f360_token_scraper.log`
2. O relatório de resultados: `automation/f360_results_*.txt`
3. Execute em modo não-headless para visualizar o processo

