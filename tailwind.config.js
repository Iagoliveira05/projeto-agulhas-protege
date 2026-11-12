/** @type {import('tailwindcss').Config} */
// Paleta espelhada de frontend/tailwind.config.ts do projeto web (Agulhas Protege),
// para que app e site compartilhem a mesma identidade visual.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        risk: {
          normal: { DEFAULT: '#059669', light: '#d1fae5', dark: '#065f46', 'dark-text': '#34d399' },
          atencao: { DEFAULT: '#d97706', light: '#fef3c7', dark: '#92400e', 'dark-text': '#fbbf24' },
          alerta: { DEFAULT: '#ea580c', light: '#ffedd5', dark: '#9a3412', 'dark-text': '#fb923c' },
          emergencia: { DEFAULT: '#dc2626', light: '#fee2e2', dark: '#991b1b', 'dark-text': '#f87171' },
        },
        surface: {
          primary: '#ffffff',
          secondary: '#f8fafc',
          'dark-primary': '#0f172a',
          'dark-secondary': '#1e293b',
        },
        line: { DEFAULT: '#e2e8f0', dark: '#334155' },
        brand: { DEFAULT: '#0284c7', light: '#38bdf8', dark: '#0369a1' },
      },
    },
  },
  plugins: [],
};
