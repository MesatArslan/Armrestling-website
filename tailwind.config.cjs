module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: {
            DEFAULT: '#0b1020', // deep slate-blue background
            soft: '#11162a',
          },
          surface: '#111827', // gray-900 for cards
          primary: '#6366F1', // indigo-500
          primaryDark: '#4F46E5', // indigo-600
          accent: '#8B5CF6', // violet-500
          accentDark: '#7C3AED', // violet-600
          ring: 'rgba(99,102,241,0.35)',
          text: {
            DEFAULT: '#E5E7EB', // gray-200
            muted: '#9CA3AF', // gray-400
          },
        },
      },
      boxShadow: {
        'brand-xl': '0 20px 40px rgba(99, 102, 241, 0.15)',
      },
      backgroundImage: {
        'brand-radial': 'radial-gradient(1200px 600px at 50% -10%, rgba(99,102,241,0.25), transparent)',
      },
    },
  },
  plugins: [],
}; 