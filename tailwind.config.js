/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta cálida: blancos, grises tibios y un acento madera
        crema: { DEFAULT: '#faf8f5', 100: '#f5f1eb', 200: '#ece6dd' },
        piedra: {
          50: '#f7f5f2', 100: '#efebe6', 200: '#e2ddd6', 300: '#cdc6bc', 400: '#a69d91',
          500: '#857c71', 600: '#6a625a', 700: '#524c46', 800: '#3a3531', 900: '#262220',
        },
        madera: { 50: '#faf3ec', 100: '#f3e3d2', 300: '#d9a77a', 500: '#b07444', 600: '#9a6036', 700: '#7d4c2b' },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Montserrat"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(38,34,32,.05), 0 6px 20px rgba(38,34,32,.06)',
      },
    },
  },
  plugins: [],
}
