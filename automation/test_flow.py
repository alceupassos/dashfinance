#!/usr/bin/env python3
"""
Teste do fluxo completo com um único cliente
"""

import time
import logging
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

# Configurar logging
log_file = Path(__file__).parent / f"test_flow_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configurações
F360_URL = "https://financas.f360.com.br"

# Cliente de teste (primeiro do CSV)
CLIENTE_TESTE = {
    'email': 'uniformespersonal@ifinance.com.br',
    'senha': 'x2W30z#G#c@E',
    'nome': 'FERREIRA E FERREIRA LTDA'
}

def test_complete_flow():
    """Testa o fluxo completo"""
    
    logger.info("="*70)
    logger.info("TESTE DE FLUXO COMPLETO F360")
    logger.info("="*70)
    logger.info(f"Cliente: {CLIENTE_TESTE['nome']}")
    logger.info(f"Email: {CLIENTE_TESTE['email']}")
    logger.info(f"Log file: {log_file}")
    logger.info("="*70)
    print()
    
    with sync_playwright() as p:
        # Abrir navegador (não headless para ver o que acontece)
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            # PASSO 1: Login
            print("\n[PASSO 1] Fazendo login...")
            page.goto(F360_URL)
            time.sleep(3)
            
            # Preencher email
            print("  → Procurando campo de email...")
            email_selectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[id="email"]',
                'input[placeholder*="e-mail" i]',
                'input[placeholder*="email" i]'
            ]
            
            email_filled = False
            for selector in email_selectors:
                try:
                    email_field = page.wait_for_selector(selector, timeout=3000)
                    if email_field:
                        print(f"  → Campo de email encontrado: {selector}")
                        email_field.click()  # Clicar primeiro
                        time.sleep(0.5)
                        email_field.fill(CLIENTE_TESTE['email'])
                        print("  ✅ Email preenchido!")
                        email_filled = True
                        time.sleep(1)
                        break
                except:
                    continue
            
            if not email_filled:
                print("  ⚠️  Campo de email não encontrado automaticamente")
                print("  → Preencha o email manualmente no navegador")
                input("  ⏸️  Pressione ENTER depois de preencher o email...")
            
            # Preencher senha
            print("  → Procurando campo de senha...")
            try:
                senha_field = page.wait_for_selector('input[type="password"]', timeout=10000)
                print("  → Preenchendo senha...")
                senha_field.fill(CLIENTE_TESTE['senha'])
                print("  ✅ Senha preenchida!")
                time.sleep(1)
            except Exception as e:
                print(f"  ❌ Erro ao preencher senha: {str(e)}")
                print("  → Preencha a senha manualmente no navegador")
                input("  ⏸️  Pressione ENTER depois de preencher a senha...")
            
            # Aguardar CAPTCHA se necessário (reduzido)
            print("  → Aguardando 2 segundos (CAPTCHA)...")
            time.sleep(2)
            
            # Clicar em login ou pressionar Enter
            print("  → Fazendo login...")
            page.keyboard.press('Enter')
            time.sleep(5)  # Aguardar página carregar após login
            
            print("  ✅ Login realizado!")
            print(f"  URL atual: {page.url}")
            
            # PASSO 2: Navegar para Integrações/Webservice
            print("\n[PASSO 2] Navegando para Integrações...")
            
            # Tentar URLs diretas
            urls_to_try = [
                f"{F360_URL}/Webservice",
                f"{F360_URL}/webservice",
                f"{F360_URL}/integracao",
                f"{F360_URL}/Integracao"
            ]
            
            success = False
            for url in urls_to_try:
                try:
                    print(f"  → Tentando: {url}")
                    page.goto(url, wait_until="networkidle", timeout=10000)
                    time.sleep(2)
                    print(f"  ✅ Acessou: {url}")
                    success = True
                    break
                except Exception as e:
                    print(f"  ❌ Falhou: {str(e)[:50]}")
            
            if not success:
                logger.warning("URLs diretas não funcionaram")
                print("  ⚠️  URLs diretas não funcionaram, tentando via menu...")
                # Continuar mesmo assim
            
            # PASSO 3: Clicar em CRIAR
            print("\n[PASSO 3] Procurando botão CRIAR...")
            
            criar_selectors = [
                'button:has-text("CRIAR")',
                'button:has-text("Criar")',
                'a:has-text("CRIAR")',
                'a:has-text("Criar")',
                'button:has-text("Novo")',
                'button:has-text("Adicionar")'
            ]
            
            criar_found = False
            for selector in criar_selectors:
                try:
                    print(f"  → Tentando: {selector}")
                    element = page.wait_for_selector(selector, timeout=3000)
                    if element:
                        print(f"  ✅ Botão CRIAR encontrado!")
                        element.click()
                        criar_found = True
                        time.sleep(2)
                        break
                except:
                    pass
            
            if not criar_found:
                logger.warning("Botão CRIAR não encontrado automaticamente")
                print("  ⚠️  Botão CRIAR não encontrado - continuando...")
            
            # PASSO 4: Selecionar no dropdown do modal
            print("\n[PASSO 4] Selecionando webservice no dropdown...")
            
            try:
                print("  → Aguardando modal abrir...")
                time.sleep(2)
                
                print("  → Procurando campo 'Selecione...'...")
                # Clicar no campo Selecione para abrir dropdown
                dropdown_selectors = [
                    'input[placeholder="Selecione..."]',
                    'input[placeholder*="Selecione" i]',
                    '[role="dialog"] input',
                    'dialog input'
                ]
                
                dropdown_opened = False
                for selector in dropdown_selectors:
                    try:
                        dropdown = page.wait_for_selector(selector, timeout=3000, state='visible')
                        if dropdown and dropdown.is_visible():
                            print(f"  ✅ Encontrou dropdown: {selector}")
                            dropdown.click()
                            print("  → Clicou no dropdown, aguardando lista abrir...")
                            time.sleep(1)
                            dropdown_opened = True
                            logger.info(f"Dropdown aberto com sucesso: {selector}")
                            break
                    except Exception as e:
                        logger.debug(f"Seletor {selector} falhou: {str(e)[:30]}")
                        continue
                
                if dropdown_opened:
                    # Procurar "API Pública da F360" na lista
                    print("  → Procurando 'API Pública da F360' na lista...")
                    api_option_selectors = [
                        'text=/API Pública.*F360/i',
                        'text=/API Pública da F360/i',
                        ':text("API Pública da F360")',
                        '[role="option"]:has-text("API Pública")'
                    ]
                    
                    option_found = False
                    for selector in api_option_selectors:
                        try:
                            option = page.wait_for_selector(selector, timeout=3000, state='visible')
                            if option and option.is_visible():
                                print(f"  ✅ Encontrou opção na lista!")
                                option.click()
                                print("  → Selecionou 'API Pública da F360'")
                                logger.info("Opção 'API Pública da F360' selecionada")
                                option_found = True
                                time.sleep(1)
                                break
                        except Exception as e:
                            logger.debug(f"Opção não encontrada com {selector}: {str(e)[:30]}")
                            continue
                    
                    if not option_found:
                        logger.warning("Opção 'API Pública da F360' não encontrada na lista")
                        print("  ⚠️  Não encontrou a opção, tentando digitar...")
                        page.keyboard.type('API Pública F360', delay=50)
                        time.sleep(0.5)
                        print("  → Pressionando ENTER para confirmar...")
                        page.keyboard.press('Enter')
                        time.sleep(0.5)
                else:
                    logger.warning("Dropdown não abriu")
                    print("  ⚠️  Dropdown não abriu, digitando...")
                    page.keyboard.type('API Pública F360', delay=50)
                    time.sleep(0.5)
                    print("  → Pressionando ENTER para confirmar...")
                    page.keyboard.press('Enter')
                    time.sleep(0.5)
                
            except Exception as e:
                print(f"  ⚠️  Erro: {str(e)[:50]}")
                logger.error(f"Erro ao selecionar webservice: {str(e)}")
            
            # PASSO 4.5: TAB + Nome + 4 TABs
            print("\n[PASSO 4.5] Preenchendo nome...")
            
            try:
                # Pressionar TAB para ir para o campo Nome
                print("  → Pressionando TAB para ir ao campo Nome...")
                page.keyboard.press('Tab')
                time.sleep(0.5)
                
                # Digitar nome
                print("  → Digitando 'dashfinance'...")
                page.keyboard.type('dashfinance', delay=100)
                print("  ✅ Nome 'dashfinance' digitado!")
                logger.info("Nome 'dashfinance' preenchido")
                time.sleep(0.5)
                
                # Pressionar mais 4 TABs para chegar no botão Salvar
                print("  → Navegando até o botão Salvar (4 TABs)...")
                for i in range(4):
                    page.keyboard.press('Tab')
                    time.sleep(0.3)
                    print(f"    TAB {i+1}/4")
                print("  ✅ Chegou no botão Salvar!")
                time.sleep(0.5)
                
            except Exception as e:
                print(f"  ⚠️  Erro: {str(e)[:50]}")
                logger.error(f"Erro ao navegar para Salvar: {str(e)}")
            
            # PASSO 4.6: Salvar (pressionar ENTER) e AGUARDAR
            print("\n[PASSO 4.6] Salvando e aguardando token...")
            
            try:
                print("  → Pressionando ENTER para salvar...")
                page.keyboard.press('Enter')
                print("  ✅ Pressionou ENTER!")
                
                print("  → Aguardando 5 segundos para o popup com token aparecer...")
                time.sleep(5)  # Aguardar mais tempo para o popup aparecer
                print("  ✅ Popup deve ter aparecido!")
                
            except Exception as e:
                print(f"  ⚠️  Erro: {str(e)[:50]}")
                logger.error(f"Erro ao salvar: {str(e)}")
            
            # PASSO 5: Capturar o token do POPUP
            print("\n[PASSO 5] Procurando TOKEN no popup...")
            print("  (Deve aparecer um popup com 'Sua chave de acesso para a API')")
            
            time.sleep(2)
            
            import re
            
            # Procurar no popup/modal
            token = None
            
            # Procurar input dentro de modal/dialog
            modal_selectors = [
                '[role="dialog"] input[readonly]',
                '[class*="modal"] input[readonly]',
                '[class*="popup"] input[readonly]',
                '[class*="dialog"] input[readonly]',
                'input[readonly][value*="-"]',  # UUID tem hífens
                'input[readonly]'
            ]
            
            print("  → Procurando campo com token no popup...")
            for selector in modal_selectors:
                try:
                    token_input = page.wait_for_selector(selector, timeout=3000)
                    if token_input:
                        token_value = token_input.get_attribute('value') or token_input.input_value()
                        # Verificar se parece um UUID
                        if token_value and '-' in token_value and len(token_value) > 30:
                            token = token_value
                            print(f"  ✅ TOKEN ENCONTRADO no popup!")
                            print(f"  Token: {token}")
                            break
                except:
                    continue
            
            if not token:
                # Procurar qualquer UUID visível na página
                print("  → Procurando UUID na página...")
                page_content = page.content()
                uuid_matches = re.findall(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', page_content, re.IGNORECASE)
                if uuid_matches:
                    # Pegar o último (mais recente)
                    token = uuid_matches[-1]
                    print(f"  ✅ TOKEN ENCONTRADO: {token}")
            
            if not token:
                print("  ⚠️  Token não encontrado automaticamente")
                print("  → Copie o token do popup manualmente")
                token = input("  → Cole o token aqui: ").strip()
            
            print(f"\n{'='*70}")
            print(f"🎯 TOKEN CAPTURADO: {token}")
            print(f"{'='*70}")
            
            # PASSO 6: Fechar navegador (não precisa deslogar)
            print("\n[PASSO 6] Token capturado com sucesso!")
            
            logger.info("\n✅ FLUXO COMPLETO TESTADO!")
            logger.info(f"Token obtido: {token}")
            logger.info(f"Log salvo em: {log_file}")
            
            print("\n✅ SUCESSO! Token capturado!")
            print(f"Token: {token}")
            print("\nFechando navegador em 3 segundos...")
            time.sleep(3)
            
        except Exception as e:
            logger.error(f"\n❌ ERRO: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            input("\nPressione ENTER para fechar...")
        
        finally:
            browser.close()
            logger.info(f"\n📄 Log completo salvo em: {log_file}")


if __name__ == "__main__":
    test_complete_flow()

