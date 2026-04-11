/** @type {import('tailwindcss').Config} */
export default {
  // Only scan files that actually use Tailwind classes — keeps the build tiny
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // Match the font families defined in index.css CSS variables
      fontFamily: {
        sans   : ["Inter",             "system-ui", "sans-serif"],
        heading: ["Plus Jakarta Sans", "Inter",     "sans-serif"],
      },
      // Extend the default colour palette with Calibr brand colours
      colors: {
        brand: {
          primary  : "#6366f1",   // indigo-500
          secondary: "#8b5cf6",   // violet-500
          accent   : "#06b6d4",   // cyan-500
        },
      },
      // Extend animation durations for smoother transitions
      transitionDuration: {
        250: "250ms",
        350: "350ms",
      },
    },
  },
  plugins: [],
};
