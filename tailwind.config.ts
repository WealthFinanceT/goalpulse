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
        muted: '#9ca3af'
      }
    }
  },
  plugins: []
};

export default config;
