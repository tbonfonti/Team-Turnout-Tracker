// frontend/src/api.js

// Backend base URL (set VITE_API_BASE in Render / .env to your backend URL)
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

/* =========================
   AUTH
   ========================= */

export async function apiLogin(email, password) {
  // Backend expects OAuth2-style form data: username + password
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Login failed");
  }

  const data = await res.json();
  if (data.access_token) {
    setToken(data.access_token);
  }
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

/* =========================
   BRANDING (PUBLIC)
   ========================= */

export async function apiGetBranding() {
  const res = await fetch(`${API_BASE}/branding/`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    // If branding row doesn't exist yet, just fall back to defaults
    return {
      app_name: "Team Turnout Tracking",
      logo_url: null,
    };
  }

  const data = await res.json();

  // Normalize relative logo URL to full backend URL
  if (data.logo_url && data.logo_url.startsWith("/")) {
    data.logo_url = `${API_BASE}${data.logo_url}`;
  }

  return data;
}

/* =========================
   ADMIN — VOTER MANAGEMENT
   ========================= */

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to import voters");
  }

  return res.json(); // { imported }
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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to import voted list");
  }

  return res.json(); // { updated }
}

export async function apiDeleteAllVoters() {
  const res = await fetch(`${API_BASE}/admin/voters/delete-all`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to delete voters");
  }

  return res.json(); // { deleted, deleted_tags }
}

/* =========================
   ADMIN — USER MANAGEMENT
   ========================= */

export async function apiInviteUser({ full_name, email, password, is_admin }) {
  // This actually creates a user directly (no email).
  const res = await fetch(`${API_BASE}/admin/users/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      full_name,
      email,
      password,
      is_admin,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create user");
  }

  return res.json(); // UserOut
}

export async function apiListUsers() {
  // For admin filter dropdown in tag overview
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load users");
  }

  return res.json(); // List[UserOut]
}

/* =========================
   ADMIN — BRANDING
   ========================= */

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to upload logo");
  }

  const data = await res.json();

  if (data.logo_url && data.logo_url.startsWith("/")) {
    data.logo_url = `${API_BASE}${data.logo_url}`;
  }

  return data; // BrandingOut
}

/* =========================
   ADMIN — TAG OVERVIEW
   ========================= */

export async function apiGetTagOverview(userId) {
  const url = new URL(`${API_BASE}/admin/tags/overview`);

  if (userId) {
    url.searchParams.set("user_id", userId);
  }

  const res = await fetch(url.toString(), {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load tag overview");
  }

  return res.json(); // List[TagOverviewItem]
}

/* =========================
   VOTERS (SEARCH / LIST)
   ========================= */

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load voters");
  }

  return res.json(); // { voters, total, page, page_size }
}

/* =========================
   TAGGING (USER DASHBOARD)
   ========================= */

export async function apiTagVoter(voterId) {
  const res = await fetch(`${API_BASE}/tags/${voterId}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to tag voter");
  }

  return res.json();
}

export async function apiUntagVoter(voterId) {
  const res = await fetch(`${API_BASE}/tags/${voterId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to untag voter");
  }

  return res.json();
}

export async function apiGetMyTaggedVoters() {
  const res = await fetch(`${API_BASE}/tags/dashboard`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load tagged voters");
  }

  return res.json(); // { tagged_voters, total_tagged, total_voted, total_not_voted }
}

// Backwards-compatible name used by Dashboard.jsx
export async function apiGetDashboard() {
  // Just reuse the same endpoint/logic
  return apiGetMyTaggedVoters();
}

export async function apiExportCallList() {
  const res = await fetch(`${API_BASE}/tags/dashboard/export-call-list`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to export call list");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "call_list.csv";
  a.click();
  window.URL.revokeObjectURL(url);
}
