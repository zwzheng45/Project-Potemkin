/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Cormorant Garamond", "serif"],
        body: ["Montserrat", "sans-serif"],
      },
      colors: {
        brand: {
          50: '#F5F5F5',
          100: '#EAEAEA',
          200: '#D4D4D4',
          300: '#A3A3A3',
          400: '#737373',
          500: '#525252',
          600: '#404040',
          700: '#262626',
          800: '#171717',
          900: '#0A0A0A', // Deep Black
          DEFAULT: '#171717',
        },
        surface: {
          50: '#F9F8F6', // Aman Off-White
          100: '#F2F0EB', // Warm Beige
          200: '#E6E4DE',
          300: '#D1CEC7',
          400: '#A8A49D',
          500: '#7D7973',
          600: '#57544E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
      },
      boxShadow: {
        glow: "0 0 40px rgba(0, 0, 0, 0.1)",
        'soft': "0 8px 30px -4px rgba(0, 0, 0, 0.05)",
      },
      backgroundImage: {
        'hero-radial':
          "radial-gradient(circle at top, rgba(0,0,0,0.03), transparent 60%)",
      },
    },
  },
  plugins: [],
}

