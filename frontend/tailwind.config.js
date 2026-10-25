/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Bebas Neue"', 'sans-serif'],
        heading: ['"Bebas Neue"', 'sans-serif'],
      },
      colors: {
        studio: {
          bg: '#09090B',
          secondary: '#120E24',
          card: '#18181B',
          cardHover: '#222227',
          border: 'rgba(139, 92, 246, 0.18)',
          borderStrong: 'rgba(139, 92, 246, 0.38)',
          muted: '#A1A1AA',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
      },
    },
  },
  plugins: [],
}
