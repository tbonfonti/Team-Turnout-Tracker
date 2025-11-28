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

  // Invite user
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
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

  // Delete all voters
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteResult, setDeleteResult] = useState(null);

  // Logo upload
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
        setIsAdmin(!!me?.is_admin);
      } catch (err) {
        console.error("Failed to load /auth/me:", err);
        setIsAdmin(false);
      }
    };
    loadMe();
  }, []);

  // ----- Load users list (for filter) + initial tag overview -----
  useEffect(() => {
    if (!isAdmin) return;

    const loadUsersAndOverview = async () => {
      setLoadingUsers(true);
      setUsersError(null);
      try {
        const list = await apiListUsers();
        setUsers(list || []);
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

  // ----- Handlers -----

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    setInviteResult(null);
    try {
      const res = await apiInviteUser(inviteEmail, inviteName);
      setInviteResult(res || { message: "User invited successfully." });
      setInviteEmail("");
      setInviteName("");
    } catch (err) {
      setInviteError(err.message || "Failed to invite user");
    } finally {
      setInviteLoading(false);
    }
  };

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
      setImportVotedResult(res || { message: "Voted status imported." });
      await reloadTagOverview(selectedUserId);
    } catch (err) {
      setImportVotedError(err.message || "Failed to import voted list");
    } finally {
      setImportVotedLoading(false);
      e.target.value = "";
    }
  };

  const handleDeleteAllVoters = async () => {
    if (!window.confirm("Are you sure you want to DELETE ALL VOTERS?")) {
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    setDeleteResult(null);
    try {
      const res = await apiDeleteAllVoters();
      setDeleteResult(res || { message: "All voters deleted." });
      await reloadTagOverview(selectedUserId);
    } catch (err) {
      setDeleteError(err.message || "Failed to delete voters");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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

      {/* Invite user */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Invite User</h3>
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
          <button type="submit" disabled={inviteLoading}>
            {inviteLoading ? "Inviting..." : "Invite User"}
          </button>
        </form>
        {inviteError && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>{inviteError}</p>
        )}
        {inviteResult && (
          <p style={{ color: "green", marginTop: "0.5rem" }}>
            {inviteResult.message || "User invited successfully."}
          </p>
        )}
      </section>

      {/* Voter files */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Voter Imports</h3>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Import Voters CSV:
            <input type="file" accept=".csv" onChange={handleImportVoters} />
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
            <input type="file" accept=".csv" onChange={handleImportVoted} />
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

        <button onClick={handleDeleteAllVoters} disabled={deleteLoading}>
          {deleteLoading ? "Deleting..." : "Delete ALL Voters"}
        </button>
        {deleteError && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>{deleteError}</p>
        )}
        {deleteResult && (
          <p style={{ color: "green", marginTop: "0.5rem" }}>
            {deleteResult.message || "All voters deleted."}
          </p>
        )}
      </section>

      {/* Branding */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Branding / Logo</h3>
        <label>
          Upload Logo:
          <input type="file" accept="image/*" onChange={handleLogoUpload} />
        </label>
        {logoUploadLoading && <span> Uploading...</span>}
        {logoUploadError && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>
            {logoUploadError}
          </p>
        )}
        {logoUploadResult && (
          <p style={{ color: "green", marginTop: "0.5rem" }}>
            {logoUploadResult.message || "Logo uploaded."}
          </p>
        )}
      </section>

      {/* Tag overview + user filter */}
      <section>
        <h3>Tag Overview</h3>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Filter by user:{" "}
            <select
              value={selectedUserId}
              onChange={handleUserFilterChange}
              disabled={loadingUsers}
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} ({u.email})
                </option>
              ))}
            </select>
          </label>
          {loadingUsers && <span> Loading users...</span>}
          {usersError && (
            <p style={{ color: "red", marginTop: "0.5rem" }}>{usersError}</p>
          )}
        </div>

        {loadingTags && <p>Loading tag overview...</p>}
        {tagOverviewError && (
          <p style={{ color: "red" }}>{tagOverviewError}</p>
        )}

        {tagOverview.length > 0 && !loadingTags && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "0.5rem",
            }}
          >
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  User
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Voter Name
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Voter ID
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Has Voted
                </th>
              </tr>
            </thead>
            <tbody>
              {tagOverview.map((item) => (
                <tr key={`${item.user_id}-${item.voter_internal_id}`}>
                  <td style={{ borderBottom: "1px solid #eee" }}>
                    {item.user_full_name || item.user_email}
                    <br />
                    <span style={{ fontSize: "0.85rem", color: "#555" }}>
                      {item.user_email}
                    </span>
                  </td>
                  <td style={{ borderBottom: "1px solid #eee" }}>
                    {item.first_name} {item.last_name}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee" }}>
                    {item.voter_voter_id}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee" }}>
                    {item.has_voted ? "✅" : "❌"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tagOverview.length === 0 && !loadingTags && !tagOverviewError && (
          <p style={{ marginTop: "0.5rem" }}>No tags to display yet.</p>
        )}
      </section>
    </div>
  );
}