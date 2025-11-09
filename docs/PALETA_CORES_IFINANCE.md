# 🎨 Paleta Oficial – iFinance / AuthSet

Documento rápido para orientar qualquer LLM/designer sobre as cores utilizadas no ecossistema iFinance (dashboard + AuthSet). Todos os valores estão em `hsl()` ou `hex`, com descrições de uso.

## 1. Cores Básicas (Modo Dark)
| Token | HSL | Hex aproximado | Uso |
|-------|-----|----------------|-----|
| `--background` | `hsl(225, 36%, 6%)` | #05070F | Fundo global (gradiente base). |
| `--foreground` | `hsl(214, 32%, 96%)` | #E6ECF7 | Texto principal. |
| `--card` | `hsl(222, 24%, 12%)` | #121626 | Painéis/ cards. |
| `--muted` | `hsl(222, 20%, 12%)` | #121220 | Superfícies secundárias. |
| `--border` | `hsl(224, 20%, 18%)` | #222634 | Borda de cards/inputs. |
| `--input` | `hsl(222, 20%, 18%)` | #232533 | Campos de formulário. |

## 2. Paleta Acentos
| Token | HSL | Hex | Aplicação |
|-------|-----|-----|-----------|
| `--primary` | `hsl(264, 83%, 70%)` | #A47CFF | CTA principais, highlights. |
| `--accent` | `hsl(166, 73%, 62%)` | #54F0C0 | Indicadores positivos, badges especiais. |
| `--secondary` | `hsl(210, 26%, 18%)` | #1D2836 | Botões secundários, chips neutros. |
| `--destructive` | `hsl(0, 72%, 56%)` | #F05D5D | Alertas críticos. |
| `--success` | `hsl(144, 61%, 56%)` | #45E29C | Confirmado, sync OK. |
| `--warning` | `hsl(33, 94%, 62%)` | #FFB347 | Alerta atenção. |
| `--info` | `hsl(197, 97%, 64%)` | #5ED3FF | Mensagens contextuais. |

## 3. Gradientes
- **`bg-oraculo-gradient`**: `radial-gradient(circle at 20% 20%, rgba(56,189,248,0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(147,51,234,0.25), transparent 35%), linear-gradient(135deg, #05070f 0%, #0f1424 45%, #12172b 100%)`
  - Usado no fundo geral da aplicação.
- **`card-glow`**: `linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0)), radial-gradient(circle at top left, rgba(56,189,248,0.2), transparent 40%)`
  - Aplicado em cartões premium/hero.

## 4. Tipografia
- Primária: **Space Grotesk** (`400‒700`) – títulos, cards, números.
- Secundária: **Inter** – textos longos e formulários.
- Mono (opcional): **JetBrains Mono** – códigos/token/password.

## 5. Moodboard textual
- “Dark premium” com toques neon (roxo + aqua) e backgrounds suaves.
- Cards arredondados, vidro fosco (`backdrop-blur`), sombras suaves (`shadow-glass-lg`).
- Paleta clara alternativa (quando necessário) usa tons pastel verdes/azuis (ver seção `[data-theme="light"]` em `app/globals.css`).

> Sempre que replicar a UI, informe à LLM que as cores devem seguir estes tokens (background/card/primary/accent etc.).
