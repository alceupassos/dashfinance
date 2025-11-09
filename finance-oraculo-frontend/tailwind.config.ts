import type { Config } from "tailwindcss";

const withOpacity = (variableName: string) => `hsl(var(${variableName}))`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1600px"
      }
    },
    extend: {
      fontFamily: {
        sans: ["Space Grotesk", "Inter", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"]
      },
      fontSize: {
        xs: "12px",
        sm: "13px",
        base: "14px",
        md: "15px",
        lg: "16px"
      },
      borderRadius: {
        xl: "1.5rem",
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem"
      },
      colors: {
        background: withOpacity("--background"),
        foreground: withOpacity("--foreground"),
        muted: {
          DEFAULT: withOpacity("--muted"),
          foreground: withOpacity("--muted-foreground")
        },
        card: {
          DEFAULT: withOpacity("--card"),
          foreground: withOpacity("--card-foreground")
        },
        popover: {
          DEFAULT: withOpacity("--popover"),
          foreground: withOpacity("--popover-foreground")
        },
        border: withOpacity("--border"),
        input: withOpacity("--input"),
        ring: withOpacity("--ring"),
        primary: {
          DEFAULT: withOpacity("--primary"),
          foreground: withOpacity("--primary-foreground")
        },
        secondary: {
          DEFAULT: withOpacity("--secondary"),
          foreground: withOpacity("--secondary-foreground")
        },
        accent: {
          DEFAULT: withOpacity("--accent"),
          foreground: withOpacity("--accent-foreground")
        },
        destructive: {
          DEFAULT: withOpacity("--destructive"),
          foreground: withOpacity("--destructive-foreground")
        },
        success: withOpacity("--success"),
        warning: withOpacity("--warning"),
        info: withOpacity("--info")
      },
      boxShadow: {
        "glass-lg": "0 20px 60px -35px rgba(15, 23, 42, 0.8)",
        "glass-sm": "0 12px 30px -25px rgba(15, 23, 42, 0.7)",
        neon: "0 0 25px rgba(99, 102, 241, 0.35)"
      },
      backgroundImage: {
        "oraculo-gradient":
          "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(147,51,234,0.25), transparent 35%), linear-gradient(135deg, #05070f 0%, #0f1424 45%, #12172b 100%)",
        "card-glow":
          "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0)), radial-gradient(circle at top left, rgba(56,189,248,0.2), transparent 40%)"
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem"
      },
      dropShadow: {
        soft: "0 25px 45px rgba(2,6,23,0.35)",
        "soft-lg": "0 35px 65px rgba(2,6,23,0.45)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
