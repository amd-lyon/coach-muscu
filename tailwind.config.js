/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{ts,tsx}',
    './src/web/index.html',
    './src/web/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Palette sobre, haut de gamme — pas de fluo.
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd2ff',
          300: '#8fb4ff',
          400: '#5b8bf7',
          500: '#3667e8',
          600: '#244fd1',
          700: '#1f3fa8',
          800: '#1f3785',
          900: '#1f326a',
        },
        surface: {
          light: '#ffffff',
          'light-2': '#f6f7f9',
          dark: '#16181d',
          'dark-2': '#1e2128',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Inter',
          'Segoe UI',
          'sans-serif',
        ],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
    },
  },
  plugins: [],
}
