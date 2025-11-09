#!/usr/bin/env python3
"""
Script para registrar webhook no WaSender API
Uso: python3 register_wasender_webhook.py
"""

import requests
import json

# Configurações
PERSONAL_TOKEN = "1717|hpl4aReHJSdBuP5Pg4Vlp4Yraer36ON3wUZz0KQm68316c94"
WEBHOOK_URL = "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/wasender-webhook"
API_BASE = "https://wasenderapi.com/api"

def register_webhook():
    """Registra webhook no WaSender"""

    headers = {
        "Authorization": f"Bearer {PERSONAL_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    payload = {
        "url": WEBHOOK_URL,
        "events": ["message.in", "message.out", "status"]
    }

    print("🔧 Registrando webhook no WaSender...")
    print(f"📍 URL: {WEBHOOK_URL}")
    print(f"📋 Events: {payload['events']}")
    print()

    try:
        response = requests.post(
            f"{API_BASE}/webhook",
            headers=headers,
            json=payload,
            timeout=30
        )

        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response:")
        print(json.dumps(response.json(), indent=2))
        print()

        if response.status_code in [200, 201]:
            print("✅ Webhook registrado com sucesso!")
            return True
        else:
            print("❌ Erro ao registrar webhook")
            return False

    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def list_webhooks():
    """Lista webhooks registrados"""

    headers = {
        "Authorization": f"Bearer {PERSONAL_TOKEN}",
        "Accept": "application/json"
    }

    print("\n📋 Listando webhooks registrados...")

    try:
        response = requests.get(
            f"{API_BASE}/webhook",
            headers=headers,
            timeout=30
        )

        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response:")
        print(json.dumps(response.json(), indent=2))

    except Exception as e:
        print(f"❌ Erro: {e}")

def delete_webhook():
    """Deleta webhook"""

    headers = {
        "Authorization": f"Bearer {PERSONAL_TOKEN}",
        "Accept": "application/json"
    }

    print("\n🗑️  Deletando webhook...")

    try:
        response = requests.delete(
            f"{API_BASE}/webhook",
            headers=headers,
            timeout=30
        )

        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response:")
        print(json.dumps(response.json(), indent=2))

        if response.status_code in [200, 204]:
            print("✅ Webhook deletado com sucesso!")
        else:
            print("❌ Erro ao deletar webhook")

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("  WaSender Webhook Registration")
    print("=" * 60)
    print()

    # Menu
    print("Escolha uma opção:")
    print("1. Registrar webhook")
    print("2. Listar webhooks")
    print("3. Deletar webhook")
    print("4. Registrar + Listar")
    print()

    choice = input("Opção (1-4): ").strip()

    if choice == "1":
        register_webhook()
    elif choice == "2":
        list_webhooks()
    elif choice == "3":
        delete_webhook()
    elif choice == "4":
        register_webhook()
        list_webhooks()
    else:
        print("Opção inválida")
