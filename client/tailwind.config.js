module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4B89FC',  // Vibrant blue for buttons
        secondary: '#EF6461',  // Soft red accent
        darkGray: '#2F2F2F',
        lightGray: '#f2f2f2',
        bgPrimary: '#121212', // Dark theme background (similar to WhatsApp)
        bgSecondary: '#1F1F1F', // Slightly lighter section background
        darkBlue: '#0A2540',    // Alternative dark background
        greenHighlight: '#25D366', // WhatsApp green for accents
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
