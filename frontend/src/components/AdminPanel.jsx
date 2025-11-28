import { useEffect, useState } from "react";
import {
  apiImportVoters,
  apiImportVoted,
  apiDeleteAllVoters,
  apiInviteUser,
  apiUploadLogo,
  apiGetMe,
  apiGetTagOverview,
} from "../api";

export default function AdminPanel() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteResult, setInviteResult] = useState(null);
  const [message, setMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const [tagOverview, setTagOverview] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);

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

  async function handleDeleteAll() {
    if (!window.confirm("Are you sure you want to delete ALL voters?")) return;
    try {
      const res = await apiDeleteAllVoters();
      setMessage(`Deleted ${res.deleted} voters`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail || !invitePassword) {
      setMessage("Email and password are required");
      return;
    }
    try {
      const user = await apiInviteUser(inviteEmail, inviteName, invitePassword, false);
      setInviteResult(user);
      setMessage("User created. Share the login details with them directly.");
      setInvitePassword("");
    } catch (err) {
      setMessage(err.message || "Failed to create user");
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await apiUploadLogo(file);
      console.log("Branding updated:", res);
      setMessage("Logo uploaded.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleLoadTagOverview() {
    try {
      setLoadingTags(true);
      const items = await apiGetTagOverview();
      setTagOverview(items);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoadingTags(false);
    }
  }

  if (checkingAdmin) {
    return (
      <div className="card">
        <h2>Admin Panel</h2>
        <div className="info">Checking admin access...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <h2>Admin Panel</h2>
        <div className="error">You do not have access to this page.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Admin Panel</h2>
      {message && <div className="info">{message}</div>}

      <section>
        <h3>Import Voter File (CSV)</h3>
        <p>
          Expected columns: <code>first_name</code>, <code>last_name</code>,{" "}
          <code>address</code>, <code>voterID</code>, <code>phone</code>,{" "}
          <code>email</code>. A single <code>name</code> column is also supported.
        </p>
        <input type="file" accept=".csv" onChange={handleImportVoters} />
      </section>

      <section>
        <h3>Import Voted List (CSV)</h3>
        <p>Either a column named voterID or a single-column list of voter IDs.</p>
        <input type="file" accept=".csv" onChange={handleImportVoted} />
      </section>

      <section>
        <h3>Delete All Voters</h3>
        <button onClick={handleDeleteAll} className="danger">
          Delete All Voters
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
          <button type="submit">Create User</button>
        </form>
        {inviteResult && (
          <div className="info">
            <p>
              Created user <strong>{inviteResult.email}</strong>
            </p>
            <p>Provide them the email and password you just set.</p>
          </div>
        )}
      </section>

      <section>
        <h3>Upload Logo</h3>
        <input type="file" accept="image/*" onChange={handleLogoUpload} />
      </section>

      <section>
        <h3>Tagged Voters Overview</h3>
        <button onClick={handleLoadTagOverview} disabled={loadingTags}>
          {loadingTags ? "Loading..." : "Load Tagged Voters"}
        </button>
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