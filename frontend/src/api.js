// frontend/src/api.js

// Backend base URL (set VITE_API_BASE in Render / .env)
export const API_BASE = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000").replace(
  /\/+$/,
  ""
);

function getToken() {
  return localStorage.getItem("ttt_token");
}

export function setToken(token) {
  localStorage.setItem("ttt_token", token);
}

export function clearToken() {
  localStorage.removeItem("ttt_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// AUTH

export async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  setToken(data.access_token);
  return data;
}

export async function apiGetMe() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to load current user");
  return res.json();
}

// BRANDING

export async function apiGetBranding() {
  const res = await fetch(`${API_BASE}/branding/`, {
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    // If branding is not set up yet, just fall back to defaults on the frontend
    return {
      app_name: "Team Turnout Tracking",
      logo_url: null,
    };
  }
  const data = await res.json();
  // If backend returns a relative logo_url (like "/static/logo_xxx.jpg"),
  // prefix with API_BASE so the browser can fetch it:
  if (data.logo_url && data.logo_url.startsWith("/")) {
    data.logo_url = `${API_BASE}${data.logo_url}`;
  }
  return data;
}

// ADMIN — VOTER IMPORT / MANAGEMENT

export async function apiImportVoters(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/admin/voters/import`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: form,
  });
  if (!res.ok) throw new Error("Failed to import voters");
  return res.json();
}

export async function apiImportVoted(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/admin/voters/import-voted`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: form,
  });
  if (!res.ok) throw new Error("Failed to import voted list");
  return res.json();
}

export async function apiDeleteAllVoters() {
  const res = await fetch(`${API_BASE}/admin/voters`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to delete all voters");
  return res.json();
}

// ADMIN — USER INVITES

export async function apiInviteUser(email, full_name) {
  const res = await fetch(`${API_BASE}/admin/users/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ email, full_name }),
  });
  if (!res.ok) throw new Error("Failed to invite user");
  return res.json();
}

export async function apiCreateUserDirect(email, full_name, password, is_admin) {
  const res = await fetch(`${API_BASE}/admin/users/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ email, full_name, password, is_admin }),
  });
  if (!res.ok) throw new Error("Failed to create user");
  return res.json();
}

// BRANDING (ADMIN)

export async function apiUploadLogo(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/admin/branding/logo`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload logo");
  // Expect the backend to return the BrandingOut schema
  // including logo_url (relative, e.g. "/static/logo_xxx.jpg").
  const data = await res.json();
  if (data.logo_url && data.logo_url.startsWith("/")) {
    data.logo_url = `${API_BASE}${data.logo_url}`;
  }
  return data;
}

// ADMIN — TAG OVERVIEW

export async function apiGetTagOverview() {
  const res = await fetch(`${API_BASE}/admin/tags/overview`, {
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to load tag overview");
  return res.json();
}

// VOTERS

export async function apiSearchVoters(query, page = 1, pageSize = 25) {
  const url = new URL(`${API_BASE}/voters/`);
  if (query) {
    url.searchParams.set("q", query);
  }
  url.searchParams.set("page", page);
  url.searchParams.set("page_size", pageSize);

  const res = await fetch(url.toString(), {
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to load voters");
  return res.json(); // { voters, total, page, page_size }
}

// TAGGING

export async function apiTagVoter(voterId) {
  const res = await fetch(`${API_BASE}/tags/${voterId}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to tag voter");
  return res.json();
}

export async function apiUntagVoter(voterId) {
  const res = await fetch(`${API_BASE}/tags/${voterId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to untag voter");
  return res.json();
}

export async function apiGetMyTaggedVoters() {
  const res = await fetch(`${API_BASE}/tags/dashboard`, {
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to load tagged voters");
  return res.json(); // { tagged_voters, total_tagged, total_voted, total_not_voted }
}

// EXPORT CALL LIST (NOT VOTED)

export async function apiExportCallList() {
  const res = await fetch(`${API_BASE}/tags/dashboard/export-call-list`, {
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to export call list");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "call_list.csv";
  a.click();
  window.URL.revokeObjectURL(url);
}