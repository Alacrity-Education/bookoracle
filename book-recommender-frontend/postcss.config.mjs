// Tailwind v4 ships as a PostCSS plugin; no tailwind.config.js is needed
// because the theme is declared in src/styles/global.css via @theme.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
