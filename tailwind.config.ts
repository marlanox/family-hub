import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#E4E9EF",
        ink: "#151313",
        // Still named "pink" so every existing bg-pink/text-pink keeps
        // working, but the family asked for no crimson anywhere — this is
        // now the app's lavender accent (buttons, "+", active tab).
        pink: {
          DEFAULT: "#9B7BFF",
          soft: "#E6DCFF",
          deep: "#6A45E0",
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
        turquoise: {
          DEFAULT: "#00E5C8",
          soft: "#9BFBEF",
        },
        acid: {
          DEFAULT: "#9CFF2E",
          soft: "#DFFFB0",
        },
        violet: {
          DEFAULT: "#DCCBFF",
          soft: "#EFE7FF",
        },
        gold: {
          DEFAULT: "#FFD23D",
          soft: "#FFE9A8",
        },
        silver: {
          DEFAULT: "#C5CAD2",
          soft: "#EEF0F3",
        },
        lemon: {
          DEFAULT: "#E6FF00",
          soft: "#F7FFB3",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        graffiti: ["var(--font-graffiti)", "var(--font-display)", "sans-serif"],
        pinup: ["var(--font-pinup)", "cursive"],
      },
      boxShadow: {
        pop: "4px 4px 0 0 #151313",
        "pop-sm": "2px 2px 0 0 #151313",
        "pop-lg": "6px 6px 0 0 #151313",
        "pop-pink": "4px 4px 0 0 #6A45E0",
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
    },
    // No rounded rectangles anywhere: the family wanted sharp, hand-cut
    // shapes. Main plaques are faceted polygons (components/Facet.tsx);
    // everything else just gets square corners. `full` stays so tiny dots
    // and checkboxes are still circles.
    borderRadius: {
      none: "0",
      sm: "0",
      DEFAULT: "0",
      md: "0",
      lg: "0",
      xl: "0",
      "2xl": "0",
      "3xl": "0",
      sticker: "0",
      blob: "0",
      full: "9999px",
    },
  },
  plugins: [],
};

export default config;
