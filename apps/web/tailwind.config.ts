import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          0: "#0a0a0b",
          1: "#111113",
          2: "#1a1a1e",
          3: "#232328",
        },
        accent: "#6ee7b7",
        danger: "#f87171",
        muted: "#71717a",
      },
    },
  },
  plugins: [],
} satisfies Config;
