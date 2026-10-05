/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#05030a",
        abyss: "#0a0610",
        blood: "#e3122f",
        bloodDark: "#7a0a1c",
        ember: "#ff3b3b",
        gold: "#d4af37",
        goldSoft: "#f1dca0",
        steel: "#9aa3ad",
      },
      fontFamily: {
        display: ["'Bebas Neue'", "'Oswald'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        glowRed: "0 0 40px rgba(227,18,47,0.55)",
        glowGold: "0 0 30px rgba(212,175,55,0.45)",
      },
      keyframes: {
        pulseGlow: {
          "0%,100%": { opacity: 0.6, transform: "scale(1)" },
          "50%": { opacity: 1, transform: "scale(1.05)" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-10px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-6px)" },
          "80%": { transform: "translateX(4px)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        shake: "shake 0.4s ease-in-out",
        scanline: "scanline 6s linear infinite",
      },
    },
  },
  plugins: [],
};
