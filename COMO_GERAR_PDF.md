# 📄 Como Gerar PDF e PNG dos Relatórios

Este guia mostra 4 formas diferentes de gerar PDFs e imagens PNG dos arquivos HTML.

---

## ✅ **Opção 1: Navegador (Mais Fácil)**

### **Passo a Passo:**

1. **Abra o arquivo HTML no navegador:**
   - Duplo-clique no arquivo `.html` no Finder
   - Ou pelo terminal:
     ```bash
     open DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.html
     ```

2. **Salvar como PDF:**
   - **Chrome/Safari:** Pressione `Cmd + P` (Mac) ou `Ctrl + P` (Windows)
   - Selecione **"Salvar como PDF"** no destino
   - Ajuste as configurações:
     - ✅ **Ativar gráficos em segundo plano**
     - ✅ Margens: **Nenhuma** ou **Mínimas**
     - ✅ Escala: **100%**
   - Clique em **"Salvar"**

3. **Capturar como PNG:**
   - **No Mac:** Use extensão do Chrome "Full Page Screen Capture"
   - Ou use `Cmd + Shift + 5` para screenshot parcial

---

## 🖥️ **Opção 2: Terminal com Puppeteer (Node.js)**

### **Instalação:**

```bash
# Navegue até a pasta
cd /Users/alceualvespasssosmac/dashfinance/

# Instale o Puppeteer
npm install -g puppeteer
```

### **Uso:**

```bash
# Execute o script
node generate-pdf.js
```

### **Resultado:**
- ✅ Gera PDFs de alta qualidade
- ✅ Gera PNGs em alta resolução (2x)
- ✅ Aguarda gráficos Chart.js carregarem
- ✅ Automático para ambos os arquivos

---

## 🐍 **Opção 3: Python com Selenium**

### **Instalação:**

```bash
# Instale as dependências
pip3 install selenium webdriver-manager
```

### **Uso:**

```bash
# Execute o script
python3 generate-pdf.py
```

### **Resultado:**
- ✅ PDFs com background colorido
- ✅ Formato A4 profissional
- ✅ Chrome headless automático

---

## 🌐 **Opção 4: Serviço Online (Sem Instalação)**

### **1. HTML to PDF:**
- Acesse: https://www.web2pdfconvert.com/
- Upload do arquivo `.html`
- Download do PDF gerado

### **2. CloudConvert:**
- Acesse: https://cloudconvert.com/html-to-pdf
- Upload do arquivo `.html`
- Configurações: Ative "Print Background"
- Convert & Download

### **3. Adobe Acrobat Online:**
- Acesse: https://www.adobe.com/acrobat/online/html-to-pdf.html
- Upload do arquivo
- Download gratuito

---

## 📊 **Opção 5: Microsoft Word (Para .docx)**

1. **Abra o Microsoft Word**
2. **Arquivo → Abrir**
3. Selecione o arquivo `.html`
4. Word converte automaticamente
5. **Arquivo → Salvar Como → PDF**

---

## 🎨 **Opção 6: Screenshot de Página Completa (PNG)**

### **Chrome Extension:**

1. Instale: [Full Page Screen Capture](https://chrome.google.com/webstore/detail/full-page-screen-capture/fdpohaocaechififmbbbbbknoalclacl)
2. Abra o arquivo HTML no Chrome
3. Clique no ícone da extensão
4. PNG será baixado automaticamente

### **Firefox Add-on:**

1. Instale: [Fireshot](https://addons.mozilla.org/en-US/firefox/addon/fireshot/)
2. Abra o arquivo HTML
3. Clique com botão direito → "Capturar página inteira"

---

## ⚡ **Opção Rápida via Terminal (wkhtmltopdf)**

### **Instalação (Mac):**

```bash
brew install wkhtmltopdf
```

### **Uso:**

```bash
# Gerar PDF do primeiro arquivo
wkhtmltopdf \
  --enable-local-file-access \
  --print-media-type \
  --background \
  --margin-top 5 \
  --margin-bottom 5 \
  --margin-left 5 \
  --margin-right 5 \
  DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.html \
  DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.pdf

# Gerar PDF do segundo arquivo
wkhtmltopdf \
  --enable-local-file-access \
  --print-media-type \
  --background \
  --margin-top 5 \
  --margin-bottom 5 \
  --margin-left 5 \
  --margin-right 5 \
  VARIAVEIS_AMBIENTE_TOKENS_MODERNO.html \
  VARIAVEIS_AMBIENTE_TOKENS_MODERNO.pdf
```

---

## 📦 **Scripts Prontos**

### **Bash Script (Mac/Linux):**

Crie um arquivo `gerar-pdf.sh`:

```bash
#!/bin/bash

echo "🚀 Gerando PDFs..."

# Usando wkhtmltopdf
wkhtmltopdf \
  --enable-local-file-access \
  --print-media-type \
  --background \
  --margin-top 5 \
  --margin-bottom 5 \
  DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.html \
  DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.pdf

wkhtmltopdf \
  --enable-local-file-access \
  --print-media-type \
  --background \
  --margin-top 5 \
  --margin-bottom 5 \
  VARIAVEIS_AMBIENTE_TOKENS_MODERNO.html \
  VARIAVEIS_AMBIENTE_TOKENS_MODERNO.pdf

echo "✅ PDFs gerados com sucesso!"
open DESCRITIVO_SISTEMA_EXECUTIVO_CLEVEL.pdf
```

Torne executável:
```bash
chmod +x gerar-pdf.sh
./gerar-pdf.sh
```

---

## 🎯 **Recomendação**

Para **melhor qualidade** e **zero configuração**:

1. **Navegador** (Opção 1) → Rápido e fácil
2. **wkhtmltopdf** (Terminal) → Profissional e automático
3. **Puppeteer** (Node.js) → Máxima qualidade

---

## 📋 **Checklist de Qualidade do PDF**

Ao gerar o PDF, verifique:

- ✅ Cores e gradientes preservados
- ✅ Gráficos Chart.js renderizados
- ✅ Logo SVG visível
- ✅ Fontes corretas (Avenir Next ou fallback)
- ✅ Espaçamentos mantidos
- ✅ Tabelas sem quebras estranhas
- ✅ Footer em todas as páginas

---

## 🐛 **Troubleshooting**

### **Gráficos não aparecem:**
- Aguarde 2-3 segundos antes de salvar
- Desabilite extensões do navegador
- Use modo anônimo/privado

### **Cores diferentes:**
- Ative "Gráficos em segundo plano"
- Use Chrome (melhor suporte a CSS)

### **Fontes diferentes:**
- Normal! Avenir Next pode não estar no sistema
- O fallback (system fonts) funciona bem

---

## 📞 **Suporte**

Se tiver problemas:
1. Tente a **Opção 1** (navegador) primeiro
2. Verifique se Chart.js carregou (aguarde alguns segundos)
3. Use outro navegador (Chrome → Safari → Firefox)

---

**Última atualização:** Janeiro 2025

