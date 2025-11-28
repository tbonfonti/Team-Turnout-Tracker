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

// ---------- AUTH ----------

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

// ---------- BRANDING ----------

export async function apiGetBranding() {
  const res = await fetch(`${API_BASE}/branding/`, {
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error("Failed to load branding");
  }
  const data = await res.json();
  // Normalize logo_url to a full URL pointing at the backend
  if (data.logo_url && !data.logo_url.startsWith("http")) {
    data.logo_url = `${API_BASE}${data.logo_url}`;
  }
  return data;
}

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
  return res.json();
}

// ---------- ADMIN – VOTER IMPORT / MANAGEMENT ----------

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
  const res = await fetch(`${API_BASE}/admin/voters/delete-all`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to delete voters");
  return res.json();
}

// ---------- ADMIN – USERS ----------

export async function apiInviteUser(email, fullName, password, isAdmin = false) {
  const res = await fetch(`${API_BASE}/admin/users/create`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      full_name: fullName,
      password,
      is_admin: isAdmin,
    }),
  });

  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(text || "Failed to create user");
  }
  return res.json();
}

export async function apiListUsers() {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

// ---------- ADMIN – TAG OVERVIEW ----------

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
  if (!res.ok) throw new Error("Failed to load tag overview");
  return res.json();
}

// ---------- VOTERS ----------

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

// ---------- TAGGING (user side) ----------

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

// ---------- DASHBOARD (user side) ----------

export async function apiGetDashboard() {
  const res = await fetch(`${API_BASE}/tags/dashboard`, {
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

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