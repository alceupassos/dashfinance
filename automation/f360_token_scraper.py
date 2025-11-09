#!/usr/bin/env python3
"""
F360 Token Scraper - Automação de criação de tokens Webhook API Pública 360

Este script:
1. Lê credenciais do arquivo CSV
2. Faz login em cada cliente F360
3. Navega até Integrações > Criar > Webhook API Pública 360
4. Captura o token gerado
5. Atualiza o CSV com a coluna de token
"""

import csv
import os
import sys
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('f360_token_scraper.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# URLs e configurações
F360_URL = "https://financas.f360.com.br"
CSV_PATH = Path(__file__).parent.parent / "docs" / "F360 - Lista de acessos.csv"
CSV_BACKUP_PATH = Path(__file__).parent.parent / "docs" / f"F360 - Lista de acessos_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
LOG_FILE = Path(__file__).parent / "f360_token_scraper.log"
RESULTS_FILE = Path(__file__).parent / f"f360_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"

# Timeouts em milissegundos
TIMEOUT = 30000  # 30 segundos
WAIT_BETWEEN_CLIENTS = 3  # segundos


class F360TokenScraper:
    """Classe principal para automação de tokens F360"""
    
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.results: List[Dict] = []
        
    def setup_browser(self, playwright):
        """Inicializa o navegador"""
        logger.info("Inicializando navegador...")
        self.browser = playwright.chromium.launch(
            headless=self.headless,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        self.context = self.browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        self.page = self.context.new_page()
        
    def teardown_browser(self):
        """Fecha o navegador"""
        if self.page:
            self.page.close()
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
            
    def login(self, email: str, senha: str) -> bool:
        """
        Passo 1: Fazer login no F360
        """
        try:
            logger.info(f"  → Acessando página de login...")
            self.page.goto(F360_URL, wait_until="networkidle", timeout=TIMEOUT)
            
            # Aguardar campos de login aparecerem
            logger.info(f"  → Aguardando campos de login...")
            time.sleep(3)  # Aguardar página carregar completamente
            
            # Tentar encontrar campo de email com múltiplos seletores
            logger.info(f"  → Procurando campo de email...")
            email_selectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[id*="email"]',
                'input[placeholder*="e-mail" i]',
                'input[placeholder*="email" i]',
                'input.email',
                'input#email'
            ]
            
            email_input = None
            for selector in email_selectors:
                try:
                    email_input = self.page.wait_for_selector(selector, timeout=5000)
                    if email_input:
                        logger.info(f"  → Campo de email encontrado: {selector}")
                        break
                except:
                    continue
            
            if not email_input:
                logger.error(f"  ❌ Campo de email não encontrado!")
                return False
            
            # Preencher email
            logger.info(f"  → Preenchendo email...")
            email_input.fill(email)
            time.sleep(1)
            
            # Preencher senha
            logger.info(f"  → Procurando campo de senha...")
            senha_selectors = [
                'input[type="password"]',
                'input[name="password"]',
                'input[name="senha"]',
                'input[id*="password"]',
                'input[id*="senha"]',
                'input.password'
            ]
            
            senha_input = None
            for selector in senha_selectors:
                try:
                    senha_input = self.page.wait_for_selector(selector, timeout=5000)
                    if senha_input:
                        logger.info(f"  → Campo de senha encontrado: {selector}")
                        break
                except:
                    continue
            
            if not senha_input:
                logger.error(f"  ❌ Campo de senha não encontrado!")
                return False
            
            logger.info(f"  → Preenchendo senha...")
            senha_input.fill(senha)
            time.sleep(1)
            
            # Verificar se há reCAPTCHA
            logger.info(f"  → Verificando reCAPTCHA...")
            time.sleep(2)
            
            # Verificar se há iframe do reCAPTCHA ou elemento do reCAPTCHA
            recaptcha_exists = (
                self.page.query_selector('iframe[src*="recaptcha"]') or
                self.page.query_selector('iframe[title*="reCAPTCHA"]') or
                self.page.query_selector('.g-recaptcha') or
                self.page.query_selector('#recaptcha')
            )
            
            if recaptcha_exists:
                logger.warning(f"  ⚠️  reCAPTCHA detectado - aguardando 5 segundos...")
                time.sleep(5)  # Aguardar CAPTCHA carregar/resolver automaticamente
            
            # Clicar no botão de login
            logger.info(f"  → Procurando botão de login...")
            
            # Múltiplos seletores para o botão de login
            login_button_selectors = [
                'button:has-text("login")',
                'button:has-text("Login")',
                'button[type="submit"]',
                'button:has-text("Entrar")',
                'button:has-text("Acessar")',
                'button.login',
                'button#login',
                'input[type="submit"]',
                'a:has-text("login")',
                'a:has-text("Login")'
            ]
            
            login_button = None
            for selector in login_button_selectors:
                try:
                    login_button = self.page.wait_for_selector(selector, timeout=3000)
                    if login_button:
                        logger.info(f"  → Botão de login encontrado: {selector}")
                        break
                except:
                    continue
            
            if not login_button:
                logger.error(f"  ❌ Botão de login não encontrado!")
                logger.info(f"  → Tentando pressionar ENTER no campo de senha...")
                # Alternativa: pressionar Enter no campo de senha
                self.page.keyboard.press('Enter')
            else:
                logger.info(f"  → Clicando no botão de login...")
                login_button.click()
            
            time.sleep(2)
            
            # Aguardar navegação após login (timeout maior por causa do CAPTCHA)
            self.page.wait_for_load_state("networkidle", timeout=60000)  # 60 segundos
            
            # Verificar se login foi bem-sucedido (verificar se não está mais na página de login)
            current_url = self.page.url
            if "login" in current_url.lower():
                # Verificar se há mensagem de erro
                error_msg = self.page.query_selector('text=/credenciais inválidas|erro|falha/i')
                if error_msg:
                    logger.error(f"  ❌ Login falhou - credenciais inválidas")
                    return False
            
            logger.info(f"  ✅ Login realizado com sucesso")
            return True
            
        except Exception as e:
            logger.error(f"  ❌ Erro no login: {str(e)}")
            return False
    
    def navigate_to_integrations(self) -> bool:
        """
        Passo 2 e 3: Navegar até Menu Cadastro > Integrações
        """
        try:
            logger.info(f"  → Aguardando dashboard carregar...")
            time.sleep(3)
            
            # Primeiro, tentar ir direto para a URL de integrações
            logger.info(f"  → Tentando acessar diretamente /Webservice...")
            try:
                self.page.goto(f"{F360_URL}/Webservice", wait_until="networkidle", timeout=TIMEOUT)
                logger.info(f"  ✅ Acessou /Webservice diretamente")
                return True
            except:
                logger.info(f"  → URL /Webservice não funcionou, tentando /integracao...")
            
            # Tentar /integracao
            try:
                self.page.goto(f"{F360_URL}/integracao", wait_until="networkidle", timeout=TIMEOUT)
                logger.info(f"  ✅ Acessou /integracao diretamente")
                return True
            except:
                logger.info(f"  → URL /integracao não funcionou, tentando via menu...")
            
            # Se URLs diretas não funcionarem, tentar via menu
            logger.info(f"  → Procurando menu Cadastro...")
            
            cadastro_selectors = [
                'a:has-text("Cadastro")',
                'button:has-text("Cadastro")',
                'text=/cadastro/i',
                '[aria-label*="Cadastro"]',
                'nav a:has-text("Cadastro")',
                '[href*="cadastro"]'
            ]
            
            cadastro_element = None
            for selector in cadastro_selectors:
                try:
                    cadastro_element = self.page.wait_for_selector(selector, timeout=3000)
                    if cadastro_element:
                        logger.info(f"  → Menu Cadastro encontrado: {selector}")
                        cadastro_element.click()
                        time.sleep(2)
                        break
                except:
                    continue
            
            if not cadastro_element:
                logger.error(f"  ❌ Menu Cadastro não encontrado")
                return False
            
            # Procurar Integrações no submenu
            logger.info(f"  → Procurando Integrações no submenu...")
            
            integracao_selectors = [
                'a:has-text("Integração")',
                'a:has-text("Integrações")',
                'text=/integra[çc][ãa]o/i',
                '[href*="integracao"]',
                '[href*="Webservice"]',
                'button:has-text("Integração")'
            ]
            
            integracao_element = None
            for selector in integracao_selectors:
                try:
                    integracao_element = self.page.wait_for_selector(selector, timeout=3000)
                    if integracao_element:
                        logger.info(f"  → Integrações encontrado: {selector}")
                        integracao_element.click()
                        time.sleep(2)
                        break
                except:
                    continue
            
            if not integracao_element:
                logger.error(f"  ❌ Integrações não encontrado no menu")
                return False
            
            # Aguardar página carregar
            self.page.wait_for_load_state("networkidle", timeout=TIMEOUT)
            logger.info(f"  ✅ Navegação para Integrações concluída")
            return True
            
        except Exception as e:
            logger.error(f"  ❌ Erro na navegação: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def create_webhook(self) -> bool:
        """
        Passo 4 e 5: Clicar em CRIAR e selecionar Webhook API Pública 360
        """
        try:
            logger.info(f"  → Procurando botão CRIAR...")
            
            # Procurar botão CRIAR
            criar_selectors = [
                'button:has-text("CRIAR")',
                'button:has-text("Criar")',
                'a:has-text("CRIAR")',
                'a:has-text("Criar")',
                'button[class*="criar" i]',
                'button[class*="create" i]',
                '[aria-label*="criar" i]'
            ]
            
            criar_found = False
            for selector in criar_selectors:
                try:
                    element = self.page.wait_for_selector(selector, timeout=5000)
                    if element:
                        element.click()
                        criar_found = True
                        logger.info(f"  → Botão CRIAR clicado")
                        break
                except:
                    continue
            
            if not criar_found:
                logger.error(f"  ❌ Botão CRIAR não encontrado")
                return False
            
            # Aguardar modal/formulário aparecer
            time.sleep(2)
            self.page.wait_for_load_state("networkidle", timeout=TIMEOUT)
            
            logger.info(f"  → Selecionando Webhook API Pública 360...")
            
            # Procurar e selecionar "Webhook API Pública 360"
            # Pode ser um select, dropdown ou radio button
            webhook_selectors = [
                'select option:has-text("Webhook API Pública 360")',
                'select option:has-text("webhook API pública 360")',
                'select option:has-text("API Pública 360")',
                'text=/webhook.*api.*pública.*360/i',
                'text=/api.*pública.*360/i'
            ]
            
            webhook_found = False
            
            # Tentar via select
            try:
                select_element = self.page.query_selector('select')
                if select_element:
                    # Tentar selecionar a opção
                    self.page.select_option('select', label='Webhook API Pública 360')
                    webhook_found = True
                    logger.info(f"  → Webhook selecionado via select")
            except:
                pass
            
            # Se não encontrou via select, tentar outros métodos
            if not webhook_found:
                # Tentar clicar em elemento com texto
                for selector in webhook_selectors:
                    try:
                        element = self.page.wait_for_selector(selector, timeout=3000)
                        if element:
                            element.click()
                            webhook_found = True
                            logger.info(f"  → Webhook selecionado via clique")
                            break
                    except:
                        continue
            
            if not webhook_found:
                logger.error(f"  ❌ Webhook API Pública 360 não encontrado")
                return False
            
            # Aguardar token ser gerado
            time.sleep(2)
            self.page.wait_for_load_state("networkidle", timeout=TIMEOUT)
            
            logger.info(f"  ✅ Webhook criado")
            return True
            
        except Exception as e:
            logger.error(f"  ❌ Erro ao criar webhook: {str(e)}")
            return False
    
    def extract_token(self) -> Optional[str]:
        """
        Passo 6: Copiar o token gerado
        """
        try:
            logger.info(f"  → Procurando token...")
            
            # Aguardar token aparecer na página
            time.sleep(2)
            
            # Procurar token em vários lugares possíveis
            token_selectors = [
                'input[readonly][value*="-"]',
                'input[readonly]',
                'code',
                'pre',
                '[class*="token"]',
                '[id*="token"]',
                '[data-token]',
                'span[class*="token"]',
                'div[class*="token"]'
            ]
            
            token = None
            
            # Primeiro, tentar encontrar em inputs readonly (mais comum)
            for selector in token_selectors:
                try:
                    elements = self.page.query_selector_all(selector)
                    for element in elements:
                        text = element.get_attribute('value') or element.inner_text() or element.text_content()
                        if text:
                            # Procurar padrão de UUID/GUID (formato comum de tokens)
                            import re
                            # Padrão UUID: 8-4-4-4-12 caracteres hexadecimais
                            match = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', text, re.IGNORECASE)
                            if match:
                                token = match.group(0)
                                logger.info(f"  ✅ Token encontrado: {token[:8]}...{token[-8:]}")
                                return token
                            
                            # Também procurar tokens longos sem hífens
                            match = re.search(r'[0-9a-f]{32,}', text, re.IGNORECASE)
                            if match and len(match.group(0)) >= 32:
                                token = match.group(0)
                                logger.info(f"  ✅ Token encontrado (sem hífens): {token[:8]}...{token[-8:]}")
                                return token
                except:
                    continue
            
            # Se não encontrou, tentar buscar em todo o conteúdo da página
            if not token:
                try:
                    page_content = self.page.content()
                    import re
                    # Procurar UUID
                    match = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', page_content, re.IGNORECASE)
                    if match:
                        token = match.group(0)
                        logger.info(f"  ✅ Token encontrado no HTML: {token[:8]}...{token[-8:]}")
                        return token
                except:
                    pass
            
            logger.error(f"  ❌ Token não encontrado na página")
            return None
            
        except Exception as e:
            logger.error(f"  ❌ Erro ao extrair token: {str(e)}")
            return None
    
    def process_client(self, cliente_data: Dict) -> Tuple[bool, Optional[str]]:
        """
        Processa um cliente completo: login, navegação, criação de token e extração
        """
        email = cliente_data.get('Login', '').strip()
        senha = cliente_data.get('Senha', '').strip()
        razao_social = cliente_data.get('Razão Social', '').strip()
        cnpj = cliente_data.get('CNPJ', '').strip()
        
        if not email or not senha:
            logger.warning(f"  ⚠️  Cliente sem email ou senha: {razao_social}")
            return False, None
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Processando: {razao_social}")
        logger.info(f"CNPJ: {cnpj}")
        logger.info(f"Email: {email}")
        logger.info(f"{'='*60}")
        
        try:
            # Passo 1: Login
            if not self.login(email, senha):
                return False, None
            
            # Passo 2 e 3: Navegar até Integrações
            if not self.navigate_to_integrations():
                return False, None
            
            # Passo 4 e 5: Criar webhook
            if not self.create_webhook():
                return False, None
            
            # Passo 6: Extrair token
            token = self.extract_token()
            if not token:
                return False, None
            
            logger.info(f"  ✅ Cliente processado com sucesso!")
            return True, token
            
        except Exception as e:
            logger.error(f"  ❌ Erro ao processar cliente: {str(e)}")
            return False, None
    
    def read_csv(self) -> List[Dict]:
        """Lê o arquivo CSV e retorna lista de clientes"""
        clientes = []
        
        try:
            with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
                lines = f.readlines()
                
                # Encontrar a linha de cabeçalho (linha com "Login")
                header_line_idx = None
                for i, line in enumerate(lines):
                    if 'Login' in line and 'Senha' in line:
                        header_line_idx = i
                        break
                
                if header_line_idx is None:
                    logger.error("Cabeçalho do CSV não encontrado!")
                    return []
                
                # Ler a partir da linha de cabeçalho
                f.seek(0)
                reader = csv.DictReader(
                    f.readlines()[header_line_idx:],
                    delimiter=';',
                    fieldnames=None
                )
                
                # Ler novamente com o reader correto
                f.seek(0)
                all_lines = f.readlines()
                header_line = all_lines[header_line_idx].strip()
                header = [h.strip() for h in header_line.split(';')]
                
                # Processar linhas de dados
                for i in range(header_line_idx + 1, len(all_lines)):
                    line = all_lines[i].strip()
                    if not line or line.startswith('Infomações'):
                        continue
                    
                    values = [v.strip() for v in line.split(';')]
                    if len(values) < 2 or not values[1]:  # Login vazio
                        continue
                    
                    # Criar dicionário
                    cliente = {}
                    for j, key in enumerate(header):
                        if j < len(values):
                            cliente[key] = values[j]
                        else:
                            cliente[key] = ''
                    
                    # Normalizar nomes das colunas (case-insensitive)
                    normalized_cliente = {}
                    for key, value in cliente.items():
                        normalized_key = key.strip()
                        if 'login' in normalized_key.lower():
                            normalized_cliente['Login'] = value
                        elif 'senha' in normalized_key.lower():
                            normalized_cliente['Senha'] = value
                        elif 'razão' in normalized_key.lower() or 'razao' in normalized_key.lower():
                            normalized_cliente['Razão Social'] = value
                        elif 'cnpj' in normalized_key.lower():
                            normalized_cliente['CNPJ'] = value
                        elif 'unidade' in normalized_key.lower():
                            normalized_cliente['Unidade'] = value
                        elif 'grupo' in normalized_key.lower():
                            normalized_cliente['Grupo'] = value
                        else:
                            normalized_cliente[normalized_key] = value
                    
                    clientes.append(normalized_cliente)
            
            logger.info(f"Total de clientes encontrados: {len(clientes)}")
            return clientes
            
        except Exception as e:
            logger.error(f"Erro ao ler CSV: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    def update_csv(self, clientes: List[Dict], tokens: Dict[str, str]):
        """Atualiza o CSV com os tokens"""
        try:
            # Ler arquivo original mantendo estrutura
            lines = []
            header_line_idx = None
            
            with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
                lines = f.readlines()
                
                # Encontrar linha de cabeçalho
                for i, line in enumerate(lines):
                    if 'Login' in line and 'Senha' in line:
                        header_line_idx = i
                        break
                
                if header_line_idx is None:
                    logger.error("Cabeçalho não encontrado para atualização!")
                    return
            
            # Processar cabeçalho
            header_line = lines[header_line_idx].strip()
            header = [h.strip() for h in header_line.split(';')]
            
            # Adicionar coluna Token se não existir
            if 'Token' not in header:
                header.append('Token')
                header_line = ';'.join(header)
            
            # Criar mapeamento de login para índice de linha
            login_to_line_idx = {}
            for i, cliente in enumerate(clientes):
                login = cliente.get('Login', '').strip()
                if login:
                    login_to_line_idx[login] = i + header_line_idx + 1  # +1 porque header_line_idx é 0-based
            
            # Atualizar linhas de dados
            updated_lines = lines[:header_line_idx]  # Manter linhas antes do cabeçalho
            updated_lines.append(header_line + '\n')  # Adicionar cabeçalho atualizado
            
            # Processar linhas de dados
            for i in range(header_line_idx + 1, len(lines)):
                line = lines[i].strip()
                if not line:
                    updated_lines.append('\n')
                    continue
                
                values = [v.strip() for v in line.split(';')]
                
                # Buscar token correspondente
                token = ''
                if len(values) > 1:  # Tem pelo menos Login
                    login = values[1] if len(values) > 1 else ''
                    token = tokens.get(login, '')
                
                # Adicionar/atualizar coluna Token
                if len(values) == len(header) - 1:
                    # Adicionar token
                    values.append(token)
                elif len(values) >= len(header):
                    # Atualizar token na última posição
                    values[-1] = token
                else:
                    # Preencher colunas faltantes
                    while len(values) < len(header) - 1:
                        values.append('')
                    values.append(token)
                
                updated_lines.append(';'.join(values) + '\n')
            
            # Escrever arquivo atualizado
            with open(CSV_PATH, 'w', encoding='utf-8-sig', newline='') as f:
                f.writelines(updated_lines)
            
            logger.info(f"CSV atualizado com sucesso!")
            
        except Exception as e:
            logger.error(f"Erro ao atualizar CSV: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    def save_results(self):
        """Salva relatório de resultados"""
        try:
            with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
                f.write("="*60 + "\n")
                f.write("RELATÓRIO DE PROCESSAMENTO F360 TOKENS\n")
                f.write("="*60 + "\n\n")
                f.write(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                
                sucessos = sum(1 for r in self.results if r['success'])
                falhas = len(self.results) - sucessos
                
                f.write(f"Total processado: {len(self.results)}\n")
                f.write(f"Sucessos: {sucessos}\n")
                f.write(f"Falhas: {falhas}\n\n")
                
                f.write("="*60 + "\n")
                f.write("DETALHES POR CLIENTE\n")
                f.write("="*60 + "\n\n")
                
                for result in self.results:
                    status = "✅ SUCESSO" if result['success'] else "❌ FALHA"
                    f.write(f"{status} - {result['razao_social']}\n")
                    f.write(f"  CNPJ: {result['cnpj']}\n")
                    f.write(f"  Login: {result['login']}\n")
                    if result['success']:
                        f.write(f"  Token: {result['token']}\n")
                    else:
                        f.write(f"  Erro: {result.get('error', 'Desconhecido')}\n")
                    f.write("\n")
            
            logger.info(f"Relatório salvo em: {RESULTS_FILE}")
            
        except Exception as e:
            logger.error(f"Erro ao salvar resultados: {str(e)}")
    
    def run(self):
        """Executa o processo completo"""
        logger.info("="*60)
        logger.info("F360 TOKEN SCRAPER - INICIANDO")
        logger.info("="*60)
        
        # Ler clientes do CSV
        clientes = self.read_csv()
        if not clientes:
            logger.error("Nenhum cliente encontrado no CSV!")
            return
        
        # Criar backup do CSV
        try:
            import shutil
            shutil.copy2(CSV_PATH, CSV_BACKUP_PATH)
            logger.info(f"Backup criado: {CSV_BACKUP_PATH}")
        except Exception as e:
            logger.warning(f"Não foi possível criar backup: {str(e)}")
        
        # Inicializar navegador
        with sync_playwright() as playwright:
            self.setup_browser(playwright)
            
            tokens = {}
            
            try:
                # Processar cada cliente
                for i, cliente in enumerate(clientes, 1):
                    logger.info(f"\n[{i}/{len(clientes)}] Processando cliente...")
                    
                    success, token = self.process_client(cliente)
                    
                    login = cliente.get('Login', '').strip()
                    razao_social = cliente.get('Razão Social', '').strip()
                    cnpj = cliente.get('CNPJ', '').strip()
                    
                    self.results.append({
                        'success': success,
                        'login': login,
                        'razao_social': razao_social,
                        'cnpj': cnpj,
                        'token': token if success else None,
                        'error': None if success else 'Falha no processamento'
                    })
                    
                    if success and token:
                        tokens[login] = token
                    
                    # Aguardar entre clientes (exceto o último)
                    if i < len(clientes):
                        logger.info(f"  ⏳ Aguardando {WAIT_BETWEEN_CLIENTS} segundos antes do próximo cliente...")
                        time.sleep(WAIT_BETWEEN_CLIENTS)
                
            finally:
                self.teardown_browser()
        
        # Atualizar CSV com tokens
        if tokens:
            logger.info(f"\nAtualizando CSV com {len(tokens)} tokens...")
            self.update_csv(clientes, tokens)
        
        # Salvar relatório
        self.save_results()
        
        # Resumo final
        logger.info("\n" + "="*60)
        logger.info("PROCESSAMENTO CONCLUÍDO")
        logger.info("="*60)
        sucessos = sum(1 for r in self.results if r['success'])
        falhas = len(self.results) - sucessos
        logger.info(f"Total: {len(self.results)}")
        logger.info(f"Sucessos: {sucessos}")
        logger.info(f"Falhas: {falhas}")
        logger.info(f"Relatório salvo em: {RESULTS_FILE}")


def main():
    """Função principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description='F360 Token Scraper')
    parser.add_argument('--headless', action='store_true', help='Executar em modo headless (sem interface gráfica)')
    parser.add_argument('--csv', type=str, help='Caminho para o arquivo CSV (opcional)')
    
    args = parser.parse_args()
    
    # Atualizar caminho do CSV se fornecido
    if args.csv:
        global CSV_PATH
        CSV_PATH = Path(args.csv)
    
    scraper = F360TokenScraper(headless=args.headless)
    scraper.run()


if __name__ == "__main__":
    main()

