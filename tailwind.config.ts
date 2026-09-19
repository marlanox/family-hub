import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4EFE2",
        ink: "#151313",
        pink: {
          DEFAULT: "#FF3D94",
          soft: "#FFB4CE",
          deep: "#E01F79",
        },
        yellow: {
          DEFAULT: "#FFE000",
          soft: "#FFF3A3",
        },
        lilac: {
          DEFAULT: "#B79CFF",
          soft: "#DCCFFF",
        },
        sky: {
          DEFAULT: "#4FC1FF",
          soft: "#BFE9FF",
        },
        mint: {
          DEFAULT: "#4CE0A0",
          soft: "#C4F7DF",
        },
        coral: {
          DEFAULT: "#FF6F5E",
          soft: "#FFCFC7",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        pop: "4px 4px 0 0 #151313",
        "pop-sm": "2px 2px 0 0 #151313",
        "pop-lg": "6px 6px 0 0 #151313",
        "pop-pink": "4px 4px 0 0 #E01F79",
      },
      borderWidth: {
        3: "3px",
      },
      backgroundImage: {
        halftone:
          "radial-gradient(#151313 0.7px, transparent 0.7px)",
        grain:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        halftone: "10px 10px",
      },
      borderRadius: {
        blob: "42% 58% 55% 45% / 45% 42% 58% 55%",
        sticker: "1.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
