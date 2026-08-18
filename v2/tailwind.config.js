/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './love.html', './business.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      // ── Renk: her biri bir CSS değişkenine bağlı. Mod (daily/love/business)
      //    değiştiğinde sadece değişkenler değişir, sınıflar aynı kalır.
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        elevated: 'var(--elevated)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        line: 'var(--border)',
        primary: 'var(--primary)',
        'primary-soft': 'var(--primary-soft)',
        'on-primary': 'var(--on-primary)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        display: ['Oswald', 'Barlow Condensed', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: 'var(--r-lg)',
        tile: 'var(--r-md)',
        chip: 'var(--r-sm)',
      },
      boxShadow: {
        card: 'var(--shadow)',
        tile: 'var(--shadow-sm)',
        glow: '0 0 24px -4px var(--primary)',
      },
      spacing: {
        header: '4.5rem',
        sidebar: '16rem',
      },
      keyframes: {
        flicker: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.62' } },
        reel: { to: { transform: 'rotate(360deg)' } },
        riseIn: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        floatUp: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-160px) scale(1.5)' },
        },
      },
      animation: {
        flicker: 'flicker 1.6s steps(2) infinite',
        reel: 'reel 1s linear infinite',
        'rise-in': 'riseIn .32s cubic-bezier(.2,.7,.3,1) both',
        'float-up': 'floatUp 1.8s ease-out forwards',
      },
    },
  },
  plugins: [],
}
