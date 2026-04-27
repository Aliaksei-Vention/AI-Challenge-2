/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,json}'],
  theme: {
    extend: {
      colors: {
        'rank-blue': '#1960d8',
        'rank-blue-light': '#2d6cdf',
      },
    },
  },
  plugins: [],
}

