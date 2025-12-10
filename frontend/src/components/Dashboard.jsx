import { useEffect, useState } from "react";
import {
  apiGetDashboard,
  apiExportCallList,
  apiUntagVoter,
  apiUpdateTaggedVoterContact,
} from "../api";

export default function Dashboard() {
  const [voters, setVoters] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [untaggingId, setUntaggingId] = useState(null);

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await apiGetDashboard();
      setVoters(res || []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const total = voters.length;
  const votedCount = voters.filter((v) => v.has_voted).length;
  const notVotedCount = total - votedCount;

  async function handleExportCallList() {
    try {
      setExporting(true);
      setError("");
      const blob = await apiExportCallList();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "call_list.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to export call list");
    } finally {
      setExporting(false);
    }
  }

  async function handleUntag(voterId) {
    try {
      setError("");
      setUntaggingId(voterId);
      await apiUntagVoter(voterId);
      setVoters((prev) => prev.filter((v) => v.id !== voterId));
      if (editingId === voterId) {
        setEditingId(null);
      }
    } catch (err) {
      setError(err.message || "Failed to untag voter");
    } finally {
      setUntaggingId(null);
    }
  }

  function startEditing(voter) {
    setEditingId(voter.id);
    setEditPhone(voter.phone || "");
    setEditEmail(voter.email || "");
    setEditNote(voter.note || "");
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditPhone("");
    setEditEmail("");
    setEditNote("");
  }

  async function saveEditing(voterId) {
    try {
      setSavingEdit(true);
      setError("");
      const updated = await apiUpdateTaggedVoterContact(voterId, {
        phone: editPhone,
        email: editEmail,
        note: editNote,
      });
      // merge into local state
      setVoters((prev) =>
        prev.map((v) => (v.id === voterId ? { ...v, ...updated } : v))
      );
      setEditingId(null);
      setEditPhone("");
      setEditEmail("");
      setEditNote("");
    } catch (err) {
      setError(err.message || "Failed to update contact info");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="card">
      <h2>My Dashboard</h2>
      {error && <div className="error">{error}</div>}

      <div className="stats" style={{ alignItems: "center" }}>
        <div>Total Tagged: {total}</div>
        <div>Voted: {votedCount}</div>
        <div>Not Voted: {notVotedCount}</div>
        <button
          onClick={loadDashboard}
          disabled={loading}
          style={{ marginLeft: "auto" }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <button
        onClick={handleExportCallList}
        disabled={notVotedCount === 0 || exporting}
        style={{ marginTop: "0.5rem" }}
      >
        {exporting ? "Exporting…" : "Export Call List (Not Voted)"}
      </button>

      <table className="voter-table" style={{ marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Voter ID</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Precinct</th>
            <th>Note</th>
            <th>Voted?</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {voters.map((v) => {
            const isEditing = editingId === v.id;
            return (
              <tr key={v.id}>
                <td>{`${v.first_name} ${v.last_name}`.trim()}</td>
                <td>{v.voter_id}</td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  ) : (
                    v.phone || "—"
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  ) : (
                    v.email || "—"
                  )}
                </td>
                <td>{v.precinct}</td>
                <td>
                  {isEditing ? (
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={2}
                      style={{ width: "100%" }}
                    />
                  ) : (
                    v.note || "—"
                  )}
                </td>
                <td>{v.has_voted ? "✅" : "❌"}</td>
                <td>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEditing(v.id)}
                        disabled={savingEdit}
                      >
                        {savingEdit ? "Saving…" : "Save"}
                      </button>
                      <button onClick={cancelEditing} disabled={savingEdit}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditing(v)}>Edit</button>
                      <button
                        onClick={() => handleUntag(v.id)}
                        disabled={untaggingId === v.id}
                        style={{ marginLeft: "0.5rem" }}
                      >
                        {untaggingId === v.id ? "Untagging…" : "Untag"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {voters.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center" }}>
                No tagged voters yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}