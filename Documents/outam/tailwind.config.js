/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEEAFF',
          100: '#D4CCFF',
          200: '#A899FF',
          300: '#7C66FF',
          400: '#5533FF',
          500: '#3300FF',
          600: '#2200CC',
          700: '#1A0099',
          800: '#110066',
          900: '#090033',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
};
