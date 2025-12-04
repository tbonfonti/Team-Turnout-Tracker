// frontend/src/api.js
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const TOKEN_KEY = "ttt_access_token";

// ==== TOKEN HELPERS ====

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

function jsonHeaders() {
  return {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data && data.detail) {
        if (Array.isArray(data.detail)) {
          message = data.detail.map((d) => d.msg || d).join(", ");
        } else {
          message = data.detail;
        }
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ==== AUTH ====

export async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let message = `Login failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.detail) {
        message = data.detail;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const data = await res.json();
  if (data && data.access_token) {
    setToken(data.access_token);
  }
  return data;
}

export async function apiGetMe() {
  return fetchJson(`${API_BASE}/auth/me`, {
    headers: authHeaders(),
  });
}

// ==== VOTER SEARCH ====

export async function apiSearchVoters(q, page = 1, pageSize = 25) {
  const url = new URL(`${API_BASE}/voters/`);
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));

  return fetchJson(url.toString(), {
    headers: authHeaders(),
  });
}

// ==== TAGGING ====

export async function apiTagVoter(voterId) {
  return fetchJson(`${API_BASE}/tags/${voterId}`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export async function apiUntagVoter(voterId) {
  // Backend untag route is DELETE /tags/{voter_id}
  return fetchJson(`${API_BASE}/tags/${voterId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

// ==== USER DASHBOARD ====

export async function apiGetDashboard() {
  return fetchJson(`${API_BASE}/tags/dashboard`, {
    headers: authHeaders(),
  });
}

export async function apiExportCallList() {
  const res = await fetch(`${API_BASE}/tags/dashboard/export-call-list`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to export call list");
  }

  // Caller can create an object URL from this
  return res.blob();
}

// ==== ADMIN – VOTER IMPORT / BULK ACTIONS ====

export async function apiImportVoters(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/admin/voters/import`, {
    method: "POST",
    headers: authHeaders(), // don't set Content-Type for FormData
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to import voters");
  }

  return res.json();
}

export async function apiImportVoted(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/admin/voters/import-voted`, {
    method: "POST",
    headers: authHeaders(), // don't set Content-Type for FormData
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to import voted list");
  }

  return res.json();
}

export async function apiDeleteAllVoters() {
  const res = await fetch(`${API_BASE}/admin/voters/delete-all`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete voters");
  }

  return res.json();
}

// ==== ADMIN – USER MANAGEMENT (direct create, replaces email invite) ====

export async function apiInviteUser(
  email,
  fullName,
  password,
  isAdmin = false
) {
  return fetchJson(`${API_BASE}/admin/users/create`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email,
      full_name: fullName,
      password,
      is_admin: isAdmin,
    }),
  });
}

export async function apiListUsers() {
  return fetchJson(`${API_BASE}/admin/users`, {
    headers: authHeaders(),
  });
}

// ==== BRANDING ====

export async function apiGetBranding() {
  return fetchJson(`${API_BASE}/branding/`, {
    headers: authHeaders(),
  });
}

export async function apiUploadLogo(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/admin/logo`, {
    method: "POST",
    headers: authHeaders(), // don't set Content-Type for FormData
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to upload logo");
  }

  return res.json();
}

// ==== ADMIN TAG OVERVIEW (per-user) ====

export async function apiGetTagOverview(userId) {
  const url = new URL(`${API_BASE}/admin/tags/overview`);
  if (userId) {
    url.searchParams.set("user_id", String(userId));
  }

  return fetchJson(url.toString(), {
    headers: authHeaders(),
  });
}

// Convenience alias if any existing code expects this name
export async function apiGetDashboardForUser(userId) {
  return apiGetTagOverview(userId);
}