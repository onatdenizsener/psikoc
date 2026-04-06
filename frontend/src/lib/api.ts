import axios from "axios";

const BASE_URL = "http://localhost:8000";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Auth ---
export const register = (email: string, username: string, password: string) =>
  api.post("/api/auth/register", { email, username, password });

export const login = (email: string, password: string) =>
  api.post("/api/auth/login", { email, password });

// --- Chat ---
export const sendMessage = (message: string, conversation_id?: number) =>
  api.post("/api/chat", { message, conversation_id });

export const listConversations = () => api.get("/api/chat/conversations");

export const getConversation = (id: number) =>
  api.get(`/api/chat/conversations/${id}`);

export const deleteConversation = (id: number) =>
  api.delete(`/api/chat/conversations/${id}`);

export default api;
