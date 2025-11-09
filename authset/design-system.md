# AuthSet • Design System v0.1

## Tipografia
- **Display / H1-H3**: *Angra.IO* (Inter Neue Haas Unica condensada). Equivalent web fallback: `Inter, "Neue Haas Grotesk Display", sans-serif`.
- **Body / UI**: `Inter`, `BlinkMacSystemFont`, `-apple-system`.
- **Peso padrão**: 500 para body, 600–700 para headings, 800 para destaques.

## Grid & Espaçamento
- Grid base mobile: 12 colunas, gutter 16px, margem externa 24px.
- Escala de espaçamento: `4, 8, 12, 16, 24, 32, 48, 64, 96`.
- Cards usam padding interno 16px e margem entre cards 24px.

## Paleta Angra.IO
| Token | Hex | Uso |
|-------|-----|-----|
| `--color-bg-primary` | `#0A0A14` | Fundo principal / full bleed |
| `--color-bg-secondary` | `#120D24` | Painéis, navs |
| `--color-surface` | `#1E1E1E` | Cards, inputs |
| `--color-text-primary` | `#FFFFFF` | Texto principal |
| `--color-text-secondary` | `#B0B0B0` | Texto secundário |
| `--color-ai-purple` | `#A23FFF` → `#7E3AFF` | Gradientes IA |
| `--color-health-green` | `#7DF11C` | Indicadores positivos |
| `--color-action-orange` | `#FF7A00` | Alertas, CTAs |
| `--color-neutral-divider` | `#2D2D2D` | Bordas suaves |

## Componentes
- **Botões**: cantos 16px, background gradiente AI ou sólido `--color-action-orange`. Texto branco, sombra sutil `0 10px 30px rgba(0,0,0,0.35)`.
- **Cards**: raio 24px, borda `1px solid rgba(255,255,255,0.08)`, fundo `linear-gradient(145deg, rgba(18,13,36,0.9), rgba(14,12,24,0.8))`.
- **Dock / Navbar**: fundo `rgba(18,13,36,0.85)` com blur 20px.

## Iconografia
- Traços 2px, contorno hexagonal ou shield, preenchimentos neon (Purple AI / Health Green / Action Orange). Glow externo `0 0 18px`.

## Interações
- Hover/focus: aumentar brilho do gradiente + borda `rgba(255,255,255,0.3)`.
- Micro animações com Framer Motion (scale 0.98→1, duration 0.25s).

> Sempre sincronizar este arquivo com `styles/theme.css` para garantir consistência dos tokens.
