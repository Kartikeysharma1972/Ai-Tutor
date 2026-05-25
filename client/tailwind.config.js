/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EAF4FB',
          100: '#D6EEF8',
          200: '#B3D9F2',
          300: '#7EC8E3',
          400: '#5BA4CF',
          500: '#2E86C1',
          600: '#2471A3',
          700: '#1A5276',
          800: '#154360',
          900: '#0E2F44',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'blob-1': 'blobFloat 8s ease-in-out infinite',
        'blob-2': 'blobFloat 12s ease-in-out infinite reverse',
        'blob-3': 'blobFloat 10s ease-in-out infinite 2s',
      },
      keyframes: {
        blobFloat: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 15px) scale(0.97)' },
        }
      }
    },
  },
  plugins: [],
}
