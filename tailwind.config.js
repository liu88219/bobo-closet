/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        rounded: [
          '"Zen Maru Gothic"',
          '"Nunito"',
          '"Noto Sans TC"',
          '"PingFang TC"',
          '"Microsoft JhengHei"',
          'sans-serif',
        ],
      },
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF5EC',
          200: '#F3E9D8',
          300: '#E7D6BE',
          400: '#D6BEA0',
        },
        cocoa: {
          500: '#8E6D56',
          600: '#73533E',
          700: '#583D2B',
          800: '#422B1D',
        },
        quokka: {
          light: '#DDA87B',
          DEFAULT: '#BA7E4D',
          dark: '#966036',
        },
        sage: {
          soft: '#EEF3EC',
          DEFAULT: '#97B391',
          dark: '#6C8A66',
        },
        blush: {
          soft: '#FCF0EE',
          DEFAULT: '#EBA39A',
        },
      },
    },
  },
  plugins: [],
};
