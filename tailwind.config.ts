import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Paleta Dominga (placeholder mientras llegan los hex finales en /assets)
      colors: {
        cream: {
          50: "#fdfaf6",
          100: "#faf2e8",
          200: "#f3e3d2",
        },
        rose: {
          50: "#fdf2f5",
          100: "#fbe5ec",
          200: "#f5c6d4",
          300: "#e8a3b8",
          400: "#d77f9b",
          500: "#c25a7c",
          600: "#a64461",
          700: "#83344b",
          800: "#5e2334",
        },
        ink: {
          DEFAULT: "#1f1410",
          muted: "#5a4a44",
          subtle: "#8a766f",
        },
        line: "#e6dcd2",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "12px",
      },
      borderWidth: {
        hairline: "0.5px",
      },
    },
  },
  plugins: [],
};

export default config;
