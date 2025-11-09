import os
import csv
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

CSV_PATH = os.environ.get("CSV_PATH", "/tmp/F360_Lista_Acessos_COMPLETA.csv")
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output" / "agents_py"
F360_URL = "https://financas.f360.com.br"
LIMIT = int(os.environ.get("LIMIT", "10"))
OFFSET = int(os.environ.get("OFFSET", "0"))
WEB_NAME = os.environ.get("WEB_NAME", "TORRE")
WEB_TYPE = os.environ.get("WEB_TYPE", "API Pública da F360")
TOKEN_RE = re.compile(r"[A-Za-z0-9_\-]{24,}")

def log(msg):  # minimal logger
    print(f"[PY] {msg}", flush=True)

def read_csv():
    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            login = (r.get("Login") or r.get("login") or r.get("Email") or r.get("email") or "").strip()
            senha = (r.get("Senha") or r.get("senha") or r.get("Password") or r.get("password") or "").strip()
            cnpj = (r.get("CNPJ") or r.get("cnpj") or "").strip()
            empresa = (r.get("Empresa") or r.get("empresa") or r.get("Razao Social") or r.get("Razão Social") or r.get("Nome Fantasia") or r.get("Nome") or r.get("Cliente") or "").strip()
            if login and senha:
                rows.append({"login": login, "senha": senha, "cnpj": cnpj, "empresa": empresa})
    return rows

def extract_token(page):
    # try structured nodes
    for sel in ["code", "pre", "input", "textarea", "span", "div"]:
        els = page.locator(sel)
        count = els.count()
        for i in range(min(count, 200)):
            txt = (els.nth(i).input_value() if sel in ["input", "textarea"] else els.nth(i).inner_text(timeout=100)).strip()
            if not txt:
                continue
            m = TOKEN_RE.search(txt)
            if m:
                return m.group(0)
    # fallback full text
    body = page.locator("body").inner_text(timeout=1000)
    m = TOKEN_RE.search(body or "")
    return m.group(0) if m else None

def process_one(page, rec, idx, total):
    log(f"[{idx+1}/{total}] {rec['login']}")
    page.goto(F360_URL, wait_until="domcontentloaded")
    # email
    email = rec["login"]
    page.locator("input[type=email], input[name*='email' i], input[id*='email' i], input[name*='login' i], input[id*='login' i]").first.fill(email, timeout=5000)
    # password
    page.locator("input[type=password], input[placeholder*='senha' i]").first.fill(rec["senha"], timeout=5000)
    # login button
    page.get_by_role("button", name=re.compile("entrar|login|acessar", re.I)).first.click(timeout=3000)
    page.wait_for_timeout(5000)
    # go to webservice
    page.goto(f"{F360_URL}/Webservice", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    # click "+ CRIAR" bottom-left in sidebar
    sidebar = page.locator("aside, nav, [class*='sidebar'], [id*='sidebar']")
    if sidebar.count() == 0:
        sidebar = page.locator("body")
    sidebar.get_by_text("+ CRIAR", exact=False).first.click(timeout=3000)
    page.wait_for_timeout(1200)
    # select type
    sel = page.locator("select").first
    try:
        sel.select_option(label=WEB_TYPE)
    except Exception:
        pass
    page.wait_for_timeout(400)
    # fill name ("Outros")
    inputs = page.locator("input, textarea")
    filled = False
    for i in range(min(inputs.count(), 50)):
        el = inputs.nth(i)
        meta = (el.get_attribute("name") or "") + (el.get_attribute("id") or "") + (el.get_attribute("placeholder") or "")
        meta = meta.lower()
        if any(k in meta for k in ["outros", "nome", "name"]):
            el.fill(WEB_NAME)
            filled = True
            break
    if not filled and inputs.count() > 0:
        inputs.first.fill(WEB_NAME)
    # save
    page.get_by_text(re.compile("salvar|gravar|save", re.I)).first.click(timeout=3000)
    # token
    token = None
    for i in range(5):
        page.wait_for_timeout(1000 * (i + 1))
        token = extract_token(page)
        if token:
            break
    if not token:
        raise RuntimeError("Token não encontrado")
    return token

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = read_csv()
    start = min(OFFSET, max(0, len(rows) - 1))
    end = min(start + LIMIT, len(rows))
    batch = rows[start:end]
    log(f"Lidos: {len(rows)}. Processando: {len(batch)} (OFFSET={OFFSET}, LIMIT={LIMIT})")

    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            for i, rec in enumerate(batch):
                try:
                    token = process_one(page, rec, i, len(batch))
                    results.append({**rec, "status": "success", "token": token})
                except Exception as e:
                    results.append({**rec, "status": "error", "token": None, "errorMessage": str(e)})
                    page = ctx.new_page()  # reset page for next iteration
        finally:
            browser.close()

    out = OUTPUT_DIR / "tokens_agent_playwright.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    ok = sum(1 for r in results if r.get("status") == "success")
    log(f"Concluído: {ok}/{len(results)} com token. Saída: {out}")

if __name__ == "__main__":
    main()


