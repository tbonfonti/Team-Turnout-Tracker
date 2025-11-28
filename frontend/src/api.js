// frontend/src/api.js

// Base URL for your FastAPI backend
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://team-turnout-tracker.onrender.com";

// In-memory token plus localStorage persistence
let authToken = null;

export function setToken(token) {
  authToken = token;
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem("ttt_token", token);
  }
}

export function getToken() {
  if (authToken) return authToken;
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = window.localStorage.getItem("ttt_token");
    authToken = stored;
    return stored;
  }
  return null;
}

export function clearToken() {
  authToken = null;
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem("ttt_token");
  }
}

// Helper for JSON / standard endpoints
async function apiFetch(path, options = {}) {
  const token = getToken();

  // Handle FormData vs JSON
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(options.headers || {}),
  };
  if (!isFormData) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Try to extract some error info
    let errText = "";
    try {
      errText = await response.text();
    } catch (_) {
      // ignore
    }
    throw new Error(
      errText || `Request to ${path} failed with status ${response.status}`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  // For non-JSON callers to handle directly (e.g. blobs)
  return response;
}

/* ========= AUTH ========= */

export async function apiLogin(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  // Assuming backend returns: { access_token, token_type, user }
  if (data && data.access_token) {
    setToken(data.access_token);
  }
  return data;
}

export async function apiGetMe() {
  return apiFetch("/auth/me", {
    method: "GET",
  });
}

/* ========= BRANDING ========= */

export async function apiGetBranding() {
  return apiFetch("/branding/", {
    method: "GET",
  });
}

/* ========= VOTERS ========= */

// General paginated voter fetch (used by admin & possibly others)
export async function apiGetVoters({ page = 1, pageSize = 25, q = "" } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (q) params.set("q", q);

  return apiFetch(`/voters/?${params.toString()}`, {
    method: "GET",
  });
}

// Search helper specifically for the VoterSearch component
export async function apiSearchVoters(query, page = 1, pageSize = 25) {
  return apiGetVoters({ page, pageSize, q: query || "" });
}

/* ========= TAGS / DASHBOARD ========= */

// User dashboard: counts of tagged / voted / not voted, etc.
export async function apiGetDashboard() {
  return apiFetch("/tags/dashboard", {
    method: "GET",
  });
}

// Export call list of not-yet-voted tagged voters
// We mimic axios-style `response.data` so existing Dashboard.jsx continues to work.
export async function apiExportCallList() {
  const token = getToken();
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/tags/export-call-list`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let errText = "";
    try {
      errText = await response.text();
    } catch (_) {}
    throw new Error(
      errText ||
        `Export call list failed with status ${response.status.toString()}`
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  let filename = "call_list.csv";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  if (match && match[1]) {
    filename = match[1];
  }

  return {
    data: blob, // so existing code using `response.data` still works
    filename,
    headers: response.headers,
  };
}

// Tag a voter for the current user
export async function apiTagVoter(voterId) {
  return apiFetch(`/tags/${voterId}`, {
    method: "POST",
  });
}

// Remove tag for a voter for the current user
export async function apiUntagVoter(voterId) {
  return apiFetch(`/tags/${voterId}`, {
    method: "DELETE",
  });
}

// Admin tag overview, with optional user filter
// If your backend supports `?user_id=`, this will use it;
// if not, it will just ignore the param when not implemented server-side.
export async function apiGetTagOverview(userId = null) {
  const params = new URLSearchParams();
  if (userId) {
    params.set("user_id", String(userId));
  }
  const query = params.toString();
  const suffix = query ? `?${query}` : "";

  return apiFetch(`/tags/admin-overview${suffix}`, {
    method: "GET",
  });
}

/* ========= ADMIN: USERS ========= */

// List users (for admin dropdown / overview)
export async function apiListUsers() {
  return apiFetch("/admin/users", {
    method: "GET",
  });
}

// Create new user (email + password + is_admin)
export async function apiCreateUser(payload) {
  // payload: { email, full_name, password, is_admin }
  return apiFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ========= ADMIN: VOTER FILE MGMT ========= */

// Upload base voter file CSV
export async function apiUploadVoterFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/admin/upload-voter-file", {
    method: "POST",
    body: formData,
  });
}

// Upload file of people who have voted
export async function apiUploadVotedFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/admin/upload-voted-file", {
    method: "POST",
    body: formData,
  });
}

// Delete all voters from DB
export async function apiDeleteAllVoters() {
  return apiFetch("/admin/delete-all-voters", {
    method: "DELETE",
  });
}
