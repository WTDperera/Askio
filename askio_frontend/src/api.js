import axios from 'axios';

// Prefer VITE_API_URL (new), fallback to VITE_API_BASE, then localhost for dev.
const baseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Create a reusable axios instance.
const API = axios.create({
  baseURL, // e.g. https://askio-production.up.railway.app
  withCredentials: true, // keep true if you later use cookies/sessions
});

export default API;
