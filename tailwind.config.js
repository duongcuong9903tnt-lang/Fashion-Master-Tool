/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Đảm bảo dòng này chính xác
  ],
  theme: {
    extend: {
      // Thêm các font chữ của P1 vào đây
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