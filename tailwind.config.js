/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
    './admin/**/*.{ts,tsx,js,jsx}',
    './accounting/**/*.{ts,tsx,js,jsx}',
    './sales/**/*.{ts,tsx,js,jsx}',
    './services/**/*.{ts,tsx,js,jsx}',
    './hooks/**/*.{ts,tsx,js,jsx}',
    './utils/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e', // FXGT style teal
          800: '#115e59',
          900: '#134e4a',
        },
        background: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
      },
      fontSize: {
        'xxs': '0.65rem',
      },
      keyframes: {
        'fade-out-right': {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(40px)' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'count-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)', color: '#16a34a' },
        },
      },
      animation: {
        'fade-out-right': 'fade-out-right 500ms ease-in-out forwards',
        'check-pop': 'check-pop 400ms ease-out forwards',
        'count-pulse': 'count-pulse 600ms ease-in-out',
      },
    },
  },
  plugins: [],
};
