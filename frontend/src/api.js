const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

let token = null;

export function setToken(t) {
  token = t;
}

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json();
}

export async function apiGetBranding() {
  const res = await fetch(`${API_BASE}/branding/`);
  return res.json();
}

export async function apiSearchVoters(query) {
  const url = new URL(`${API_BASE}/voters/`);
  if (query) url.searchParams.set("q", query);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch voters");
  return res.json();
}

export async function apiTagVoter(voterId) {
  const res = await fetch(`${API_BASE}/tags/${voterId}`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to tag");
  return res.json();
}

export async function apiUntagVoter(voterId) {
  const res = await fetch(`${API_BASE}/tags/${voterId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to untag");
  return res.json();
}

export async function apiGetDashboard() {
  const res = await fetch(`${API_BASE}/tags/dashboard`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

export async function apiExportCallList() {
  const res = await fetch(`${API_BASE}/tags/dashboard/export-call-list`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to export");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "call_list.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function apiImportVoters(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/admin/voters/import`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to import voters");
  return res.json();
}

export async function apiImportVoted(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/admin/voters/import-voted`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to import voted list");
  return res.json();
}

export async function apiDeleteAllVoters() {
  const res = await fetch(`${API_BASE}/admin/voters/delete-all`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete voters");
  return res.json();
}

export async function apiInviteUser(email, fullName) {
  const res = await fetch(`${API_BASE}/admin/users/invite`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, full_name: fullName }),
  });
  if (!res.ok) throw new Error("Failed to invite user");
  return res.json();
}

export async function apiUploadLogo(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/admin/branding/logo`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload logo");
  return res.json();
}
