// src/api.js
const API_BASE = import.meta.env.VITE_API_BASE || "https://team-turnout-tracker.onrender.com";

// Helper to send JSON requests
async function request(method, endpoint, body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  return res.json();
}

// AUTH
export function apiLogin(email, password) {
  return request("POST", "/auth/login", { email, password });
}

export function apiGetMe(token) {
  return request("GET", "/auth/me", null, token);
}

// DASHBOARD (Tag overview)
export function apiGetDashboard(token) {
  return request("GET", "/tags/dashboard", null, token);
}

// ADMIN — List users
export function apiListUsers(token) {
  return request("GET", "/admin/users", null, token);
}

// ADMIN — Filter tag overview by user ID
export function apiGetDashboardForUser(token, userId) {
  return request("GET", `/tags/dashboard?user_id=${userId}`, null, token);
}

// SEARCH VOTERS
export function apiSearchVoters(token, query, page = 1, pageSize = 25) {
  let url = `/voters/?page=${page}&page_size=${pageSize}`;
  if (query) url += `&q=${encodeURIComponent(query)}`;
  return request("GET", url, null, token);
}

// VOTERS
export function apiGetVoters(token, page = 1, pageSize = 25, search = "") {
  let url = `/voters/?page=${page}&page_size=${pageSize}`;
  if (search) url += `&q=${encodeURIComponent(search)}`;
  return request("GET", url, null, token);
}

export function apiTagVoter(token, voterId) {
  return request("POST", `/tags/${voterId}`, {}, token);
}

export function apiUntagVoter(token, voterId) {
  return request("DELETE", `/tags/${voterId}`, null, token);
}

// ADMIN — Branding upload (uses multipart)
export async function apiUploadLogo(token, file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/admin/branding/logo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${text}`);
  }

  return res.json();
}

// Export call list
export function apiExportCallList(token) {
  return request("GET", "/tags/export", null, token);
}
