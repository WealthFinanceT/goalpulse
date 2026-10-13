import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        surface: '#0b0b0d',
        card: '#121318',
        border: '#23242b',
        muted: '#9ca3af',
        emerald: {
          50: '#effff9',
          100: '#c8ffeb',
          200: '#90ffcf',
          300: '#58fabc',
          400: '#23efa9',
          500: '#00e898',
          600: '#00bd7b',
          700: '#009960',
          800: '#00734c',
          900: '#005c3d',
          950: '#003c28'
        }
      }
    }
  },
  plugins: []
};

export default config;
