# AuthSet API (FastAPI)

Backend responsável por:
- Guardar e sincronizar credenciais/OTP/vault.
- Gerenciar intents de aprovação via BLE/NFC (proximidade).
- Calcular captchas inteligentes e scores de risco antes de assinar contratos.
- Expor rotas seguras para MCP Servers e para o painel/wizard.

## Rodando localmente
```bash
cd authset-api
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env  # contém o projeto Supabase newczbjzzfkwwnpfmygm
uvicorn app.main:create_app --reload
```

### Variáveis `.env`
```
APP_NAME=AuthSet API
BLE_SECRET=dev-ble-secret
VAULT_KEY=change-me
OPENAI_API_KEY=...
```

## Rotas principais (v0.1)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status + versão. |
| POST | `/auth/ble/intent` | Cria intent de 2FA por proximidade. |
| POST | `/auth/ble/confirm` | Confirma intent (app mobile assina). |
| POST | `/auth/ble/trust` | Registra/atualiza “BLE Trust Circle” (pessoas/dispositivos que dispensam 2FA quando próximos). |
| GET/POST | `/vault/entries` | Lista/cria registros do cofre. |
| POST | `/risk/analyze` | Gera score (LGPD, trabalhista, inadimplência). |
| POST | `/captcha/generate` | Retorna captcha IA-friendly. |

> O MCP server irá consumir essas rotas para automatizar setups e aprovações.
