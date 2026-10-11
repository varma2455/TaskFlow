/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        ivory: {
          DEFAULT: '#FAF8F5',
          50: '#FDFCFB',
          100: '#FAF8F5',
          200: '#F4F0E8',
          300: '#ECE6DB',
          400: '#DFD8C9',
          500: '#CBC2AF',
        },
        brand: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C', // Burnt orange primary
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          950: '#431407',
        },
        sidebar: {
          DEFAULT: '#111215',
          card: '#18191E',
          border: '#22242B',
          hover: '#1B1D23',
          muted: '#858895',
          text: '#B3B5C0',
          heading: '#FFFFFF',
        },
        charcoal: {
          50: '#F8F8F9',
          100: '#F1F1F3',
          200: '#E2E3E7',
          300: '#C7C9D2',
          400: '#979AA8',
          500: '#6E7282',
          600: '#4F525F',
          700: '#3A3C46',
          800: '#27282F',
          900: '#18191E',
          950: '#101114',
        },
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 2px 8px -2px rgba(24, 25, 30, 0.05), 0 1px 4px -1px rgba(24, 25, 30, 0.03)',
        'elevated': '0 10px 25px -5px rgba(24, 25, 30, 0.08), 0 8px 10px -6px rgba(24, 25, 30, 0.04)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
