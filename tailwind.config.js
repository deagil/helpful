/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography"
import daisyui from "daisyui"

export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {},
  },
  plugins: [typography, daisyui],
  daisyui: {
    themes: [
      {
        saasstartertheme: {
          // Base (Backgrounds and Structure)
          "base-100": "#ffffff",       // Crisp white for primary backgrounds
          "base-200": "#f5f5f5",       // Soft light grey for secondary backgrounds
          "base-300": "#e0e0e0",       // Light grey for dividers, borders, and containers
          "neutral": "#1c1c1c",        // Deep charcoal black for structural elements (sidebars, headers)
          "neutral-content": "#ffffff", // White text for neutral elements (e.g., sidebar links)
        
          // Accents (Minimal Pops of Color)
          primary: "#ff7f11",          // Bold orange for primary actions (buttons, links, highlights)
          "primary-content": "#ffffff", // White text on primary elements
          secondary: "#ffd400",        // Bright yellow for secondary actions and highlights
          "secondary-content": "#1c1c1c", // Dark text on secondary elements
          accent: "#37bdbf",           // Aquatic cyan for vibrant highlights or accents
          "accent-content": "#ffffff", // White text on accent elements
        
          // Feedback States
          success: "#37b86c",          // Clean green for success messages
          error: "#e63946",            // Muted red for errors
          warning: "#f1c40f",          // Golden yellow for warnings
          info: "#6c63ff",             // Soft blue for informational messages
        
          // Text Colors
          "base-content": "#1c1c1c",   // Dark charcoal for primary text
          "muted-content": "#8c8c8c",  // Muted grey for secondary or less prominent text
        },
      },
    ],
  },
}
