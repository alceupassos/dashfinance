import type { Config } from "tailwindcss";

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
        "2xl": "1400px"
      }
    },
    extend: {
      fontSize: {
        xs: "12px",
        sm: "13px",
        base: "14px"
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem"
      },
      colors: {
        background: "hsl(220 15% 10%)",
        foreground: "hsl(210 20% 98%)",
        card: {
          DEFAULT: "hsl(220 15% 14%)",
          foreground: "hsl(210 20% 98%)"
        },
        popover: {
          DEFAULT: "hsl(220 15% 12%)",
          foreground: "hsl(210 20% 98%)"
        },
        primary: {
          DEFAULT: "hsl(267 87% 67%)",
          foreground: "hsl(210 20% 98%)"
        },
        secondary: {
          DEFAULT: "hsl(210 26% 18%)",
          foreground: "hsl(210 20% 96%)"
        },
        muted: {
          DEFAULT: "hsl(220 15% 18%)",
          foreground: "hsl(215 20% 72%)"
        },
        accent: {
          DEFAULT: "hsl(150 62% 45%)",
          foreground: "hsl(210 20% 10%)"
        },
        destructive: {
          DEFAULT: "hsl(0 75% 55%)",
          foreground: "hsl(210 20% 96%)"
        },
        border: "hsl(220 14% 20%)",
        input: "hsl(220 14% 20%)",
        ring: "hsl(267 87% 67%)"
      },
      boxShadow: {
        "low-card": "0 6px 20px -12px rgba(0,0,0,0.6)"
      },
      backgroundImage: {
        "oraculo-gradient":
          "linear-gradient(145deg, rgba(31,27,45,1) 0%, rgba(18,19,27,1) 50%, rgba(27,28,39,1) 100%)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
