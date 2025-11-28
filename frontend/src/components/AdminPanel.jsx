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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false);

  const [message, setMessage] = useState("");
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [tagOverview, setTagOverview] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagUsers, setTagUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const me = await apiGetMe();
        setIsAdmin(!!me.is_admin);
        if (!me.is_admin) {
          setMessage("You do not have access to the admin panel.");
        }
      } catch (err) {
        setMessage("Failed to verify admin access.");
      } finally {
        setCheckingAdmin(false);
      }
    }
    checkAdmin();
  }, []);

  async function handleImportVoters(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await apiImportVoters(file);
      setMessage(`Imported ${res.imported} voters`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleImportVoted(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await apiImportVoted(file);
      setMessage(`Updated ${res.updated} voters as voted`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleDeleteAllVoters() {
    if (!window.confirm("Are you sure you want to delete ALL voters?")) return;
    try {
      const res = await apiDeleteAllVoters();
      setMessage(
        `Deleted ${res.deleted} voters and ${res.deleted_tags} tags from the database.`
      );
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setMessage("");
    try {
      const user = await apiInviteUser({
        full_name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        is_admin: inviteIsAdmin,
      });
      setMessage(`User created: ${user.email}`);
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      setInviteIsAdmin(false);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMessage("");
    try {
      const res = await apiUploadLogo(file);
      setMessage("Logo uploaded successfully.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function loadUsersForFilter() {
    if (tagUsers.length > 0) return;
    try {
      setLoadingUsers(true);
      const users = await apiListUsers();
      setTagUsers(users);
    } catch (err) {
      setMessage(err.message || "Failed to load user list");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleLoadTagOverview() {
    try {
      setLoadingTags(true);
      await loadUsersForFilter();
      const items = await apiGetTagOverview(selectedUserId || undefined);
      setTagOverview(items);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoadingTags(false);
    }
  }

  if (checkingAdmin) {
    return <p>Checking admin access...</p>;
  }

  if (!isAdmin) {
    return <p>{message || "You do not have access to this page."}</p>;
  }

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>
      {message && (
        <p
          style={{
            padding: "0.5rem",
            background: "#f0f4ff",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          {message}
        </p>
      )}

      <section>
        <h3>Voter File Management</h3>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Import voter file (CSV):{" "}
            <input type="file" accept=".csv" onChange={handleImportVoters} />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Import voted list (CSV of voterID):{" "}
            <input type="file" accept=".csv" onChange={handleImportVoted} />
          </label>
        </div>
        <button
          style={{ marginTop: "0.5rem" }}
          onClick={handleDeleteAllVoters}
          className="danger"
        >
          Delete ALL voters
        </button>
      </section>

      <section>
        <h3>Create User</h3>
        <form onSubmit={handleInvite} className="inline-form" style={{ flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Full name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={invitePassword}
            onChange={(e) => setInvitePassword(e.target.value)}
          />
          <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <input
              type="checkbox"
              checked={inviteIsAdmin}
              onChange={(e) => setInviteIsAdmin(e.target.checked)}
            />
            Admin?
          </label>
          <button type="submit">Create User</button>
        </form>
      </section>

      <section>
        <h3>Upload Logo</h3>
        <input type="file" accept="image/*" onChange={handleLogoUpload} />
      </section>

      <section>
        <h3>Tagged Voters Overview</h3>
        <div
          style={{
            marginTop: "0.5rem",
            marginBottom: "0.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <label>
            Filter by user:&nbsp;
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">All users</option>
              {tagUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
          </label>
          <button onClick={handleLoadTagOverview} disabled={loadingTags}>
            {loadingTags ? "Loading..." : "Load Tagged Voters"}
          </button>
          {loadingUsers && <span>Loading users…</span>}
        </div>
        {tagOverview.length > 0 && (
          <table className="voter-table" style={{ marginTop: "0.5rem" }}>
            <thead>
              <tr>
                <th>User Name</th>
                <th>User Email</th>
                <th>Voter</th>
                <th>Voter ID</th>
                <th>Voted?</th>
              </tr>
            </thead>
            <tbody>
              {tagOverview.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.user_full_name || ""}</td>
                  <td>{item.user_email}</td>
                  <td>{`${item.first_name} ${item.last_name}`}</td>
                  <td>{item.voter_voter_id}</td>
                  <td>{item.has_voted ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tagOverview.length === 0 && !loadingTags && (
          <p style={{ marginTop: "0.5rem" }}>No tags to display yet.</p>
        )}
      </section>
    </div>
  );
}