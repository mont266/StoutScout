/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'fade-in-down': 'fadeInDown 0.3s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
        'pulse-halo': 'pulseHalo 1.5s ease-in-out infinite',
        'fade-out-up': 'fadeOutUp 0.3s ease-in forwards',
      },
      keyframes: {
        fadeInDown: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-1rem) scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(1rem) scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        fadeOutUp: {
          '0%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(-1rem) scale(0.95)',
          },
        },
        pulseHalo: {
          '0%': {
            transform: 'scale(1)',
            opacity: '0.5',
          },
          '75%': {
            transform: 'scale(2)',
            opacity: '0',
          },
          '100%': {
            transform: 'scale(2)',
            opacity: '0',
          },
        },
      },
      boxShadow: {
        'lg-top': '0 -10px 15px -3px rgb(0 0 0 / 0.1), 0 -4px 6px -4px rgb(0 0 0 / 0.1)',
      }
    },
  },
  plugins: [],
}