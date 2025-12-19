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

// ==== FETCH HELPERS ====

async function fetchJson(url, options = {}) {
  const resp = await fetch(url, options);
  if (!resp.ok) {
    let msg = `Request failed with status ${resp.status}`;
    try {
      const data = await resp.json();
      if (data && data.detail) {
        msg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch (e) {
      // ignore JSON parsing error, keep default message
    }
    throw new Error(msg);
  }
  // Try to parse JSON; if empty, just return null
  const text = await resp.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function authHeaders() {
  const token = getToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

function jsonHeaders() {
  return {
    ...authHeaders(),
    "Content-Type": "application/json",
  };
}

// ==== AUTH ====

export async function apiLogin(email, password) {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!resp.ok) {
    let msg = `Login failed with status ${resp.status}`;
    try {
      const data = await resp.json();
      if (data && data.detail) {
        msg =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail);
      }
    } catch (e) {}
    throw new Error(msg);
  }

  const data = await resp.json();
  const token = data.access_token;
  setToken(token);
  return data;
}


// ==== VOTERS ====

export async function apiSearchVoters(qOrParams, page = 1, pageSize = 25, field = "all") {
  // Support both calling styles:
  // 1) apiSearchVoters({ q, field, page, pageSize })
  // 2) apiSearchVoters(q, page, pageSize, field)
  const params =
    qOrParams && typeof qOrParams === "object"
      ? qOrParams
      : { q: qOrParams, page, pageSize, field };

  const url = new URL(`${API_BASE}/voters/`);

  if (params?.q) url.searchParams.set("q", params.q);
  if (params?.field) url.searchParams.set("field", params.field);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.pageSize) url.searchParams.set("page_size", String(params.pageSize));

  return fetchJson(url.toString(), {
    headers: authHeaders(),
  });
}

// ==== TAGS (current user) ====

export async function apiTagVoter(voterId) {
  return fetchJson(`${API_BASE}/tags/${voterId}`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export async function apiUntagVoter(voterId) {
  return fetchJson(`${API_BASE}/tags/${voterId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function apiGetDashboard() {
  return fetchJson(`${API_BASE}/tags/dashboard`, {
    headers: authHeaders(),
  });
}

export async function apiExportTags() {
  const resp = await fetch(`${API_BASE}/tags/export`, {
    headers: authHeaders(),
  });

  if (!resp.ok) {
    let msg = `Export failed with status ${resp.status}`;
    try {
      const data = await resp.json();
      if (data && data.detail) {
        msg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch (e) {}
    throw new Error(msg);
  }

  const blob = await resp.blob();
  return blob;
}

export async function apiUpdateTaggedVoterContact(voterId, payload) {
  return fetchJson(`${API_BASE}/tags/${voterId}/contact`, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
}

// ==== ADMIN: IMPORT / DELETE ====

export async function apiImportVoters(file) {
  const formData = new FormData();
  formData.append("file", file);

  return fetchJson(`${API_BASE}/admin/import/voters`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
}

export async function apiImportVoted(file) {
  const formData = new FormData();
  formData.append("file", file);

  return fetchJson(`${API_BASE}/admin/import/voted`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
}

export async function apiDeleteAllVoters() {
  return fetchJson(`${API_BASE}/admin/voters`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

// ==== ADMIN: USER MANAGEMENT ====

export async function apiInviteUser(email, fullName, password, isAdmin) {
  const body = {
    email,
    full_name: fullName,
    password,
    is_admin: isAdmin,
  };

  return fetchJson(`${API_BASE}/admin/users`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export async function apiListUsers() {
  return fetchJson(`${API_BASE}/admin/users`, {
    headers: authHeaders(),
  });
}

// ==== ADMIN: BRANDING ====

export async function apiUploadLogo(file) {
  const formData = new FormData();
  formData.append("file", file);

  return fetchJson(`${API_BASE}/admin/branding/logo`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
}

export async function apiGetBranding() {
  return fetchJson(`${API_BASE}/admin/branding`, {
    headers: authHeaders(),
  });
}

// ==== ADMIN: TAG OVERVIEW ====

export async function apiGetTagOverview(userId) {
  const url = new URL(`${API_BASE}/admin/tags/overview`);
  if (userId) {
    url.searchParams.set("user_id", String(userId));
  }

  return fetchJson(url.toString(), {
    headers: authHeaders(),
  });
}

export async function apiGetDashboardForUser(userId) {
  return apiGetTagOverview(userId);
}

// ==== ADMIN – COUNTY ACCESS CONTROL ====

export async function apiListCounties() {
  return fetchJson(`${API_BASE}/admin/counties`, {
    headers: authHeaders(),
  });
}

export async function apiGetUserCountyAccess(userId) {
  return fetchJson(`${API_BASE}/admin/users/${userId}/county-access`, {
    headers: authHeaders(),
  });
}

export async function apiUpdateUserCountyAccess(userId, allowedCounties) {
  return fetchJson(`${API_BASE}/admin/users/${userId}/county-access`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({
      allowed_counties: allowedCounties,
    }),
  });
}
// Backwards-compatible alias used by Dashboard.jsx
export async function apiExportCallList() {
  return apiExportTags();
}
// Backwards-compatible alias used by AdminPanel.jsx
export async function apiGetMe() {
  return fetchJson(`${API_BASE}/auth/me`, {
    headers: authHeaders(),
  });
}
