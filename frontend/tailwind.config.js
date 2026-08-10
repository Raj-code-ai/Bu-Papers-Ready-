/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#071A1A',
          900: '#0B2424',
          800: '#123333',
          700: '#1A4545',
        },
        moss: {
          500: '#0F766E',
          400: '#14B8A6',
          300: '#5EEAD4',
        },
        sand: {
          100: '#F3EFE6',
          50: '#FAF8F3',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 50px rgba(7, 26, 26, 0.12)',
      },
    },
  },
  plugins: [],
};
