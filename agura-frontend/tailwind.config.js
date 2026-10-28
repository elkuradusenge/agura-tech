/**
 * Tailwind maps semantic names onto the CSS custom properties declared in
 * src/styles/tokens.css. No colour literal belongs in this file or in a
 * component: add or change a value in tokens.css only.
 *
 * Because the tokens resolve per theme, most components never need a `dark:`
 * variant for colour. Use `dark:` only when the structure differs.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Google Sans, then Google Sans Flex, then the system sans stack.
        sans: [
          '"Google Sans"',
          '"Google Sans Flex"',
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        canvas: {
          DEFAULT: "var(--canvas)",
          translucent: "var(--canvas-translucent)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          translucent: "var(--surface-translucent)",
        },
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          heading: "var(--ink-heading)",
          muted: "var(--ink-muted)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          active: "var(--primary-active)",
          text: "var(--primary-text)",
          tint: "var(--primary-tint)",
          "tint-strong": "var(--primary-tint-strong)",
          on: "var(--on-primary)",
        },
        success: {
          DEFAULT: "var(--success)",
          tint: "var(--success-tint)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          tint: "var(--warning-tint)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          tint: "var(--danger-tint)",
        },
      },
      borderRadius: {
        card: "12px",
        panel: "16px",
        dialog: "24px",
        pill: "9999px",
      },
      boxShadow: {
        e1: "var(--shadow-e1)",
        e2: "var(--shadow-e2)",
        e3: "var(--shadow-e3)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "250ms",
      },
      transitionTimingFunction: {
        material: "cubic-bezier(0.2, 0, 0, 1)",
      },
      minHeight: {
        tap: "44px",
      },
      minWidth: {
        tap: "44px",
      },
      maxWidth: {
        content: "1120px",
      },
      screens: {
        xs: "360px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "press-in": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(0.97)" },
        },
      },
      animation: {
        "fade-up": "fade-up var(--duration-slow) var(--ease-material) both",
        "press-in": "press-in var(--duration-fast) var(--ease-material) both",
      },
    },
  },
  plugins: [],
};
