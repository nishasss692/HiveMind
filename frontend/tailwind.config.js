/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-canvas": "#FBF9F5",
        "bg-surface": "#FFFFFF",
        "bg-surface-subtle": "#F7F4EE",
        "border-subtle": "#EADECE",
        "border-strong": "#CBD5E1",
        "primary": "#1E3A8A",
        "secondary": "#2563EB",
        "text-primary": "#0F172A",
        "text-secondary": "#475569",
        "text-muted": "#64748B",
        "status-success": "#059669",
        "status-success-subtle": "#ECFDF5",
        "status-success-border": "#A7F3D0",
        "status-unverified": "#D97706",
        "status-unverified-subtle": "#FFFBEB",
        "status-unverified-border": "#FDE68A",
        "status-failure": "#E11D48",
        "status-failure-subtle": "#FFF1F2",
        "status-failure-border": "#FECDD3",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        hud: "0 4px 20px -2px rgba(12, 25, 56, 0.25)",
      },
    },
  },
  plugins: [],
};
