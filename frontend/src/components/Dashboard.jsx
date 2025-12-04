import { useEffect, useState } from "react";
import { apiGetDashboard, apiExportCallList, apiUntagVoter } from "../api";

export default function Dashboard() {
  const [voters, setVoters] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [untaggingId, setUntaggingId] = useState(null);

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
      // Remove from local state so the row disappears immediately
      setVoters((prev) => prev.filter((v) => v.id !== voterId));
    } catch (err) {
      setError(err.message || "Failed to untag voter");
    } finally {
      setUntaggingId(null);
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
            <th>Voted?</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {voters.map((v) => (
            <tr key={v.id}>
              <td>{`${v.first_name} ${v.last_name}`.trim()}</td>
              <td>{v.voter_id}</td>
              <td>{v.has_voted ? "✅" : "❌"}</td>
              <td>
                <button
                  onClick={() => handleUntag(v.id)}
                  disabled={untaggingId === v.id}
                >
                  {untaggingId === v.id ? "Untagging…" : "Untag"}
                </button>
              </td>
            </tr>
          ))}
          {voters.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center" }}>
                No tagged voters yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}