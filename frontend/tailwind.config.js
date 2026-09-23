/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070B14',
          900: '#111827',
          800: '#1E293B',
          700: '#334155',
        },
        moss: {
          500: 'rgb(var(--moss-500) / <alpha-value>)',
          400: 'rgb(var(--moss-400) / <alpha-value>)',
          300: 'rgb(var(--moss-300) / <alpha-value>)',
        },
        sand: {
          100: '#E2E8F0',
          50: '#F8FAFC',
        },
        grain: {
          DEFAULT: 'rgb(var(--grain) / <alpha-value>)',
        },
        leaf: {
          DEFAULT: 'rgb(var(--leaf) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 50px rgb(var(--moss-500) / 0.14)',
      },
    },
  },
  plugins: [],
};
