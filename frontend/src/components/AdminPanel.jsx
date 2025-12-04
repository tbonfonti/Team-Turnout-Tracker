// frontend/src/components/AdminPanel.jsx
import { useEffect, useState } from "react";
import {
  apiImportVoters,
  apiImportVoted,
  apiDeleteAllVoters,
  apiInviteUser,
  apiUploadLogo,
  apiGetMe,
  apiGetTagOverview,
  apiListUsers,
} from "../api";

export default function AdminPanel() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Create user (replaces invite)
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState("");
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Import voters / voted
  const [importVotersResult, setImportVotersResult] = useState(null);
  const [importVotersError, setImportVotersError] = useState(null);
  const [importVotersLoading, setImportVotersLoading] = useState(false);

  const [importVotedResult, setImportVotedResult] = useState(null);
  const [importVotedError, setImportVotedError] = useState(null);
  const [importVotedLoading, setImportVotedLoading] = useState(false);

  // Delete voters
  const [deleteVotersResult, setDeleteVotersResult] = useState(null);
  const [deleteVotersError, setDeleteVotersError] = useState(null);
  const [deleteVotersLoading, setDeleteVotersLoading] = useState(false);

  // Logo upload
  const [logoFile, setLogoFile] = useState(null);
  const [logoUploadResult, setLogoUploadResult] = useState(null);
  const [logoUploadError, setLogoUploadError] = useState(null);
  const [logoUploadLoading, setLogoUploadLoading] = useState(false);

  // Tag overview + user filter
  const [tagOverview, setTagOverview] = useState([]);
  const [tagOverviewError, setTagOverviewError] = useState(null);
  const [loadingTags, setLoadingTags] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  // ----- Load current user (to check admin) -----
  useEffect(() => {
    const loadMe = async () => {
      try {
        const me = await apiGetMe();
        setCurrentUser(me);
        setIsAdmin(Boolean(me?.is_admin));
      } catch (err) {
        console.error("Failed to load current user:", err);
        setCurrentUser(null);
        setIsAdmin(false);
      }
    };
    loadMe();
  }, []);

  // ----- Load users + initial tag overview once admin is confirmed -----
  useEffect(() => {
    if (!isAdmin) return;

    const loadUsersAndOverview = async () => {
      setLoadingUsers(true);
      setUsersError(null);
      setTagOverviewError(null);
      try {
        const usersData = await apiListUsers();
        setUsers(usersData || []);
      } catch (err) {
        console.error("Failed to load users:", err);
        setUsersError(err.message || "Failed to load users");
      } finally {
        setLoadingUsers(false);
      }

      await reloadTagOverview("");
    };

    loadUsersAndOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ----- Helper: reload tag overview for given user -----
  async function reloadTagOverview(userId) {
    setLoadingTags(true);
    setTagOverviewError(null);
    try {
      const data = await apiGetTagOverview(userId || undefined);
      setTagOverview(data || []);
    } catch (err) {
      console.error("Failed to load tag overview:", err);
      setTagOverviewError(err.message || "Failed to load tag overview");
    } finally {
      setLoadingTags(false);
    }
  }

  // ----- Handlers: Create User -----
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setInviteResult(null);

    if (!invitePassword || invitePassword.length < 6) {
      setInviteError("Password must be at least 6 characters long.");
      return;
    }
    if (invitePassword !== invitePasswordConfirm) {
      setInviteError("Passwords do not match.");
      return;
    }

    setInviteLoading(true);
    try {
      const res = await apiInviteUser(
        inviteEmail,
        inviteName,
        invitePassword,
        inviteIsAdmin
      );
      setInviteResult(res || { message: "User created successfully." });
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      setInvitePasswordConfirm("");
      setInviteIsAdmin(false);
    } catch (err) {
      setInviteError(err.message || "Failed to create user");
    } finally {
      setInviteLoading(false);
    }
  };

  // ----- Handlers: Import Voters -----
  const handleImportVoters = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportVotersLoading(true);
    setImportVotersError(null);
    setImportVotersResult(null);
    try {
      const res = await apiImportVoters(file);
      setImportVotersResult(res || { message: "Voters imported." });
      await reloadTagOverview(selectedUserId);
    } catch (err) {
      setImportVotersError(err.message || "Failed to import voters");
    } finally {
      setImportVotersLoading(false);
      e.target.value = "";
    }
  };

  const handleImportVoted = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportVotedLoading(true);
    setImportVotedError(null);
    setImportVotedResult(null);
    try {
      const res = await apiImportVoted(file);
      setImportVotedResult(res || { message: "Voted list imported." });
      await reloadTagOverview(selectedUserId);
    } catch (err) {
      setImportVotedError(err.message || "Failed to import voted list");
    } finally {
      setImportVotedLoading(false);
      e.target.value = "";
    }
  };

  // ----- Handler: Delete all voters -----
  const handleDeleteAllVoters = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete all voters? This cannot be undone."
      )
    ) {
      return;
    }

    setDeleteVotersLoading(true);
    setDeleteVotersError(null);
    setDeleteVotersResult(null);
    try {
      const res = await apiDeleteAllVoters();
      setDeleteVotersResult(res || { message: "All voters deleted." });
      await reloadTagOverview(selectedUserId);
    } catch (err) {
      setDeleteVotersError(err.message || "Failed to delete voters");
    } finally {
      setDeleteVotersLoading(false);
    }
  };

  // ----- Handler: Logo upload -----
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoUploadLoading(true);
    setLogoUploadError(null);
    setLogoUploadResult(null);
    try {
      const res = await apiUploadLogo(file);
      setLogoUploadResult(res || { message: "Logo uploaded." });
    } catch (err) {
      setLogoUploadError(err.message || "Failed to upload logo");
    } finally {
      setLogoUploadLoading(false);
      e.target.value = "";
    }
  };

  // ----- Handler: user filter for tags -----
  const handleUserFilterChange = async (e) => {
    const value = e.target.value;
    setSelectedUserId(value);
    await reloadTagOverview(value);
  };

  // ----- Render -----

  if (!isAdmin) {
    return (
      <div style={{ padding: "1rem" }}>
        <h2>Admin Panel</h2>
        <p>You must be an admin to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Admin Panel</h2>

      {/* Create user */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Create User</h3>
        <form onSubmit={handleInviteSubmit} style={{ maxWidth: 400 }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <label>
              Email:
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                style={{ width: "100%", padding: "0.25rem" }}
              />
            </label>
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <label>
              Full name:
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
                style={{ width: "100%", padding: "0.25rem" }}
              />
            </label>
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <label>
              Password:
              <input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                required
                style={{ width: "100%", padding: "0.25rem" }}
              />
            </label>
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <label>
              Confirm password:
              <input
                type="password"
                value={invitePasswordConfirm}
                onChange={(e) =>
                  setInvitePasswordConfirm(e.target.value)
                }
                required
                style={{ width: "100%", padding: "0.25rem" }}
              />
            </label>
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <label>
              <input
                type="checkbox"
                checked={inviteIsAdmin}
                onChange={(e) => setInviteIsAdmin(e.target.checked)}
                style={{ marginRight: "0.5rem" }}
              />
              Make this user an admin
            </label>
          </div>
          <button type="submit" disabled={inviteLoading}>
            {inviteLoading ? "Creating..." : "Create User"}
          </button>
        </form>
        {inviteError && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>{inviteError}</p>
        )}
        {inviteResult && (
          <p style={{ color: "green", marginTop: "0.5rem" }}>
            {inviteResult.message || "User created successfully."}
          </p>
        )}
      </section>

      {/* Voter imports */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Voter Imports</h3>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Import Voters CSV:
            <input
              type="file"
              accept=".csv"
              onChange={handleImportVoters}
              style={{ marginLeft: "0.5rem" }}
            />
          </label>
          {importVotersLoading && <span> Importing...</span>}
          {importVotersError && (
            <p style={{ color: "red" }}>{importVotersError}</p>
          )}
          {importVotersResult && (
            <p style={{ color: "green" }}>
              {importVotersResult.message || "Voters imported."}
            </p>
          )}
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Import Voted List CSV:
            <input
              type="file"
              accept=".csv"
              onChange={handleImportVoted}
              style={{ marginLeft: "0.5rem" }}
            />
          </label>
          {importVotedLoading && <span> Importing...</span>}
          {importVotedError && (
            <p style={{ color: "red" }}>{importVotedError}</p>
          )}
          {importVotedResult && (
            <p style={{ color: "green" }}>
              {importVotedResult.message || "Voted list imported."}
            </p>
          )}
        </div>
      </section>

      {/* Delete voters */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Delete All Voters</h3>
        <button
          type="button"
          onClick={handleDeleteAllVoters}
          disabled={deleteVotersLoading}
        >
          {deleteVotersLoading ? "Deleting..." : "Delete All Voters"}
        </button>
        {deleteVotersError && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>
            {deleteVotersError}
          </p>
        )}
        {deleteVotersResult && (
          <p style={{ color: "green", marginTop: "0.5rem" }}>
            {deleteVotersResult.message || "All voters deleted."}
          </p>
        )}
      </section>

      {/* Logo upload */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Branding</h3>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Upload Logo:
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              style={{ marginLeft: "0.5rem" }}
            />
          </label>
          {logoUploadLoading && <span> Uploading...</span>}
        </div>
        {logoUploadError && (
          <p style={{ color: "red" }}>{logoUploadError}</p>
        )}
        {logoUploadResult && (
          <p style={{ color: "green" }}>
            {logoUploadResult.message || "Logo uploaded."}
          </p>
        )}
        {logoFile && (
          <p style={{ fontSize: "0.85rem" }}>
            Selected file: {logoFile.name}
          </p>
        )}
      </section>

      {/* Tag overview with user filter */}
      <section>
        <h3>Tag Overview</h3>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Filter by user:
            <select
              value={selectedUserId}
              onChange={handleUserFilterChange}
              style={{ marginLeft: "0.5rem" }}
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
          </label>
          {loadingUsers && <span> Loading users…</span>}
          {usersError && (
            <p style={{ color: "red", marginTop: "0.5rem" }}>{usersError}</p>
          )}
        </div>

        {loadingTags && <p>Loading tag overview…</p>}
        {tagOverviewError && (
          <p style={{ color: "red" }}>{tagOverviewError}</p>
        )}

        {!loadingTags && !tagOverviewError && tagOverview.length > 0 && (
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              maxWidth: "900px",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "left",
                    padding: "0.25rem",
                  }}
                >
                  User
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "left",
                    padding: "0.25rem",
                  }}
                >
                  Voter ID
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "left",
                    padding: "0.25rem",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "left",
                    padding: "0.25rem",
                  }}
                >
                  Has Voted
                </th>
              </tr>
            </thead>
            <tbody>
              {tagOverview.map((item) => (
                <tr key={`${item.user_id}-${item.voter_internal_id}`}>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "0.25rem",
                    }}
                  >
                    {item.user_full_name || item.user_email}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "0.25rem",
                    }}
                  >
                    {item.voter_voter_id}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "0.25rem",
                    }}
                  >
                    {item.first_name} {item.last_name}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "0.25rem",
                    }}
                  >
                    {item.has_voted ? "✅" : "❌"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tagOverview.length === 0 &&
          !loadingTags &&
          !tagOverviewError && (
            <p style={{ marginTop: "0.5rem" }}>No tags to display yet.</p>
          )}
      </section>
    </div>
  );
}