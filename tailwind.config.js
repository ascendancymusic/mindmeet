/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        aspekta: ['Aspekta', 'sans-serif'],
      },
      keyframes: {
        slideDown: {
          from: { maxHeight: '0' },
          to: { maxHeight: '100vh' }
        }
      },
      animation: {
        slideDown: 'slideDown 0.3s ease-out forwards'
      }
    },
  },
  plugins: [],
};