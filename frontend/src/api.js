// frontend/src/api.js

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// ------------------------------
// Auth
// ------------------------------
export function apiLogin(email, password) {
  return api.post("/auth/login", { email, password }).then((res) => res.data);
}

export function apiGetMe() {
  return api.get("/auth/me").then((res) => res.data);
}

// ------------------------------
// Voters
// ------------------------------
export function apiGetVoters(query = "", page = 1, pageSize = 25) {
  return api
    .get("/voters", {
      params: { q: query, page, page_size: pageSize },
    })
    .then((res) => res.data);
}

// ------------------------------
// Tags
// ------------------------------
export function apiGetTagOverview(userId = null) {
  return api
    .get("/admin/tags-overview", {
      params: userId ? { user_id: userId } : {},
    })
    .then((res) => res.data);
}

export function apiExportCallList() {
  return api.get("/tags/export", { responseType: "blob" });
}

// ------------------------------
// Admin Users
// ------------------------------
export function apiListUsers() {
  return api.get("/admin/users").then((res) => res.data);
}

// ------------------------------
// Branding
// ------------------------------
export function apiGetBranding() {
  return api.get("/admin/branding").then((res) => res.data);
}

export function apiUploadLogo(file) {
  const formData = new FormData();
  formData.append("file", file);
  return api
    .post("/admin/branding/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);
}

export default api;
