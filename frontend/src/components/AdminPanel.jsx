import { useState } from "react";
import {
  apiImportVoters,
  apiImportVoted,
  apiDeleteAllVoters,
  apiInviteUser,
  apiUploadLogo,
} from "../api";

export default function AdminPanel() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteResult, setInviteResult] = useState(null);
  const [message, setMessage] = useState("");

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
      setMessage(err.message);
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
    </div>
  );
}
