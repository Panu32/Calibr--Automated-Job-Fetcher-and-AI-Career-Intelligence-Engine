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

  // 60 second timeout — job fetch and LLM calls can be slow
  timeout: 60000,

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
 * @returns {Promise<Object>} { filename, skill_count, extracted_skills, doc_id, message }
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
 * Submit a job description text for parsing and storage.
 *
 * @param {string} userId  - The user's identifier
 * @param {string} jdText  - Raw job description text (pasted by user)
 * @returns {Promise<Object>} { parsed_skills, skill_count, message }
 */
export const uploadJD = async (userId, jdText) => {
  const response = await api.post("/resume/jd", {
    user_id: userId,
    jd_text: jdText,
  });
  return response.data;
};

/**
 * Fetch resume metadata for a user.
 *
 * @param {string} userId
 * @returns {Promise<Object>} { user_id, filename, skill_count, skills, uploaded_at }
 */
export const getResume = async (userId) => {
  const response = await api.get(`/resume/${userId}`);
  return response.data;
};


// ──────────────────────────────────────────────────────────────────────────
//  ANALYSIS endpoints
// ──────────────────────────────────────────────────────────────────────────

/**
 * Run a skill gap analysis for a user against a job description.
 *
 * jdText is optional — if not provided, the backend uses the JD
 * previously saved via uploadJD().
 *
 * @param {string}      userId  - The user's identifier
 * @param {string|null} jdText  - Job description text (or null to use saved JD)
 * @returns {Promise<Object>} SkillGapResponse with has_skills, missing_skills, etc.
 */
export const analyzeSkillGap = async (userId, jdText = null) => {
  const response = await api.post("/analysis/skill-gap", {
    user_id: userId,
    jd_text: jdText,   // null is valid — backend falls back to saved JD
  });
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
 * Send a chat message to Calibr AI and receive a response.
 *
 * @param {string} userId  - The user's identifier
 * @param {string} message - The user's message text
 * @returns {Promise<Object>} { response, timestamp, user_id }
 */
export const sendChatMessage = async (userId, message) => {
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

// Export the axios instance itself for advanced use cases
export default api;
