// Stub file for production builds where keys.js is gitignored
// Reads API keys from Vite environment variables (set in Vercel dashboard)
export const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || '';
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
