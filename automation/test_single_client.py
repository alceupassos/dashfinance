#!/usr/bin/env python3
"""
Teste com um único cliente - para debug
"""

import sys
import time
from pathlib import Path

# Adicionar o diretório pai ao path para importar o módulo principal
sys.path.insert(0, str(Path(__file__).parent))

from f360_token_scraper import F360TokenScraper

def test_single_client(email: str, senha: str):
    """Testa com um único cliente"""
    
    print("="*70)
    print("TESTE COM CLIENTE ÚNICO")
    print("="*70)
    print(f"Email: {email}")
    print(f"Senha: {'*' * len(senha)}")
    print("="*70)
    print()
    
    # Criar cliente de teste
    cliente_teste = {
        'Login': email,
        'Senha': senha,
        'Razão Social': 'TESTE',
        'CNPJ': '00.000.000/0000-00',
        'Unidade': 'TESTE',
        'Grupo': 'TESTE'
    }
    
    # Inicializar scraper (modo NÃO headless para ver o que acontece)
    scraper = F360TokenScraper(headless=False)
    
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as playwright:
        scraper.setup_browser(playwright)
        
        try:
            print("\nProcessando cliente de teste...")
            success, token = scraper.process_client(cliente_teste)
            
            print("\n" + "="*70)
            if success:
                print("✅ SUCESSO!")
                print(f"Token: {token}")
            else:
                print("❌ FALHOU!")
            print("="*70)
            
        finally:
            input("\nPressione ENTER para fechar o navegador...")
            scraper.teardown_browser()


if __name__ == "__main__":
    print("\n" + "="*70)
    print("TESTE F360 TOKEN SCRAPER - CLIENTE ÚNICO")
    print("="*70)
    print()
    
    # Solicitar credenciais
    email = input("Digite o email/login: ").strip()
    senha = input("Digite a senha: ").strip()
    
    if not email or not senha:
        print("\n❌ Email e senha são obrigatórios!")
        sys.exit(1)
    
    test_single_client(email, senha)

