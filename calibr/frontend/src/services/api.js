/**
 * services/api.js
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Axios API Client
 *
 * All communication with the FastAPI backend goes through this module.
 *
 * Base URL priority:
 *   1. VITE_API_URL environment variable (set in .env file for prod)
 *   2. Fallback: http://localhost:8000/api/v1 (local dev default)
 *
 * Every function returns response.data directly so components
 * don't need to unwrap the axios response object themselves.
 *
 * Error handling:
 *   Axios throws on non-2xx responses. Each function lets those
 *   errors bubble up to the caller (the page component), which
 *   catches them and calls store.setError() to show the toast.
 * ─────────────────────────────────────────────────────────────────────────
 */

import axios from "axios";

// ── Create axios instance with shared config ──────────────────────────────
const api = axios.create({
  // Use Vite env variable if set, otherwise fall back to local dev URL
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1",

  // 120 second timeout — local Ollama embedding and LLM calls can be slow
  timeout: 120000,

  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor ───────────────────────────────────────────────────
// Automatically attaches the JWT Bearer token to every outgoing request
// if the user is logged in.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("calibr_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────────────────
// Normalise error messages and handle 401 (Unauthorized) by clearing session.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Handle Token Expiration / Unauthorized
    if (error.response?.status === 401) {
      // Clear local storage so the App redirects to Login
      localStorage.removeItem("calibr_token");
      localStorage.removeItem("calibr_user");
      // Optional: window.location.reload() or store.logout()
    }

    // 2. Format backend detail errors
    const detail = error.response?.data?.detail;
    if (detail) {
      error.message = typeof detail === "string" ? detail : JSON.stringify(detail);
    }
    return Promise.reject(error);
  }
);


// ──────────────────────────────────────────────────────────────────────────
//  AUTH endpoints
// ──────────────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * @param {Object} data - { full_name, email, password }
 * @returns {Promise<Object>} { access_token, token_type, user }
 */
export const signup = async (data) => {
  const response = await api.post("/auth/signup", data);
  return response.data;
};

/**
 * Authenticate a user.
 * @param {Object} data - { email, password }
 * @returns {Promise<Object>} { access_token, token_type, user }
 */
export const login = async (data) => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

/**
 * Authenticate a user with Google OAuth2.
 * @param {string} token - Google ID Token
 * @returns {Promise<Object>} { access_token, token_type, user }
 */
export const loginWithGoogle = async (token) => {
  const response = await api.post("/auth/google", { token });
  return response.data;
};


// ──────────────────────────────────────────────────────────────────────────
//  RESUME endpoints
// ──────────────────────────────────────────────────────────────────────────

/**
 * Upload a resume file for a user.
 *
 * Uses multipart/form-data so the file bytes and user_id are sent together.
 * Axios sets Content-Type to multipart/form-data automatically when
 * the data is a FormData object.
 *
 * @param {string} userId  - The user's identifier
 * @param {File}   file    - The File object from the file input / drop zone
 * @returns {Promise<Object>} { filename, doc_id, message }
 */
export const uploadResume = async (userId, file) => {
  const formData = new FormData();
  formData.append("user_id", userId);  // FastAPI Form(...) field
  formData.append("file",    file);    // FastAPI UploadFile field

  const response = await api.post("/resume/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }, // override for file upload
  });
  return response.data;
};

/**
 * Fetch resume metadata for a user.
 *
 * @param {string} userId
 * @returns {Promise<Object>} { user_id, filename, uploaded_at }
 */
export const getResume = async (userId) => {
  const response = await api.get(`/resume/${userId}`);
  return response.data;
};

// ──────────────────────────────────────────────────────────────────────────
//  INTERVIEW endpoints
// ──────────────────────────────────────────────────────────────────────────

/**
 * Start a new AI interview session for a given job.
 * @param {string} userId
 * @param {Object} job - { job_title, job_company, job_description, url }
 * @returns {Promise<Object>} { session_id, question, phase, phase_label, ... }
 */
export const startInterview = async (userId, job) => {
  const response = await api.post("/interview/start", {
    user_id:         userId,
    job_title:       job.title       || "Software Engineer",
    job_company:     job.company     || "Unknown Company",
    job_description: job.description || "",
    job_url:         job.url         || "",
  });
  return response.data;
};

/**
 * Submit the user's answer to the current question.
 * @param {string} sessionId
 * @param {string} answer
 * @returns {Promise<Object>} { question, evaluation_score, evaluation_feedback, ... }
 */
export const submitInterviewAnswer = async (sessionId, answer) => {
  const response = await api.post("/interview/answer", {
    session_id: sessionId,
    answer,
  });
  return response.data;
};

/**
 * Fetch current session state (for page refresh recovery).
 * @param {string} sessionId
 */
export const getInterviewSession = async (sessionId) => {
  const response = await api.get(`/interview/session/${sessionId}`);
  return response.data;
};

// ──────────────────────────────────────────────────────────────────────────
//  JOBS endpoints
// ──────────────────────────────────────────────────────────────────────────

/**
 * Get the personalised ranked job feed for a user.
 * Triggers an on-demand fetch if no jobs exist yet today.
 *
 * @param {string} userId
 * @returns {Promise<Object>} { user_id, job_count, jobs, fetched_at }
 */
export const getJobs = async (userId) => {
  const response = await api.get(`/jobs/${userId}`);
  return response.data;
};

/**
 * Manually trigger a job refresh for a user.
 *
 * @param {string} userId
 * @returns {Promise<Object>} { message, new_jobs, user_id, refreshed_at }
 */
export const refreshJobs = async (userId) => {
  const response = await api.post(`/jobs/refresh/${userId}`);
  return response.data;
};

/**
 * Get filtered and sorted job listings.
 *
 * @param {string} userId
 * @param {Object} filters - { location?, source?, min_match?, fetch_date? }
 * @returns {Promise<Object>} { user_id, job_count, filters, jobs }
 */
export const getJobsFiltered = async (userId, filters = {}) => {
  // Build query params — axios serialises this object to ?key=value strings
  const params = {};
  if (filters.location)   params.location   = filters.location;
  if (filters.source)     params.source     = filters.source;
  if (filters.min_match !== undefined) params.min_match = filters.min_match;
  if (filters.fetch_date) params.fetch_date = filters.fetch_date;

  const response = await api.get(`/jobs/filters/${userId}`, { params });
  return response.data;
};


// ──────────────────────────────────────────────────────────────────────────
//  CHAT endpoints
// ──────────────────────────────────────────────────────────────────────────

/**
 * Send a chat message to Calibr AI and receive a real-time STREAM of response chunks.
 *
 * This version uses the native fetch API (not Axios) because fetch supports
 * ReadableStream by default, allowing us to process tokens one-by-one.
 *
 * @param {string} userId   - The user's identifier
 * @param {string} message  - The user's message text
 * @param {Function} onChunk - Callback fired for every chunk (token) received
 */
export const sendChatMessageStream = async (userId, message, onChunk) => {
  const token = localStorage.getItem("calibr_token");
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

  const response = await fetch(`${baseUrl}/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type" : "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({ user_id: userId, message }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to initiate stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    buffer += text;

    // SSE events are separated by double newlines
    const lines = buffer.split("\n\n");
    // Keep the last partial event in the buffer
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const chunk = line.replace("data: ", "");
        if (onChunk) onChunk(chunk);
      }
    }
  }
};

/**
 * Send a chat message to Calibr AI and receive a response.
  const response = await api.post("/chat/message", {
    user_id: userId,
    message,
  });
  return response.data;
};

/**
 * Retrieve the last 20 chat messages for a user.
 *
 * @param {string} userId
 * @returns {Promise<Object>} { user_id, message_count, messages }
 */
export const getChatHistory = async (userId) => {
  const response = await api.get(`/chat/history/${userId}`);
  return response.data;
};

/**
 * Delete all chat history for a user.
 *
 * @param {string} userId
 * @returns {Promise<Object>} { message, user_id, deleted_count, cleared_at }
 */
export const clearChatHistory = async (userId) => {
  const response = await api.delete(`/chat/history/${userId}`);
  return response.data;
};

// ──────────────────────────────────────────────────────────────────────────
//  NEWS / MARKET INTEL endpoints
// ──────────────────────────────────────────────────────────────────────────

/**
 * Manually trigger a tech news / market intelligence sync.
 * @returns {Promise<Object>} { status, message }
 */
export const refreshMarketIntel = async () => {
  const response = await api.post("/news/refresh");
  return response.data;
};

/**
 * Get the current status and document count of the news database.
 * @returns {Promise<Object>} { collection, document_count, status }
 */
export const getMarketIntelStatus = async () => {
  const response = await api.get("/news/status");
  return response.data;
};

// Export the axios instance itself for advanced use cases
export default api;
