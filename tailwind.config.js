/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'playfair': ['"Playfair Display"', 'serif'],
        'montserrat': ['"Montserrat"', 'sans-serif'],
        'lobster': ['"Lobster"', 'cursive'],
        'pacifico': ['"Pacifico"', 'cursive'],
        'cinzel': ['"Cinzel"', 'serif'],
      },
    },
  },
  plugins: [],
}