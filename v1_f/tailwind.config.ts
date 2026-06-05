import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        led: '0 0 0 1px var(--led-color), 0 0 12px color-mix(in srgb, var(--led-color) 65%, transparent)',
      },
    },
  },
  plugins: [],
} satisfies Config
