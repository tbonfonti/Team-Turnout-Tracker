import { useEffect, useState } from "react";
import { apiGetDashboard, apiExportCallList } from "../api";

export default function Dashboard() {
  const [voters, setVoters] = useState([]);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      const res = await apiGetDashboard();
      setVoters(res);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const total = voters.length;
  const votedCount = voters.filter((v) => v.has_voted).length;
  const notVotedCount = total - votedCount;

  return (
    <div className="card">
      <h2>My Dashboard</h2>
      {error && <div className="error">{error}</div>}
      <div className="stats">
        <div>Total Tagged: {total}</div>
        <div>Voted: {votedCount}</div>
        <div>Not Voted: {notVotedCount}</div>
      </div>
      <button onClick={apiExportCallList} disabled={notVotedCount === 0}>
        Export Call List (Not Voted)
      </button>

      <table className="voter-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Voter ID</th>
            <th>Voted?</th>
          </tr>
        </thead>
        <tbody>
          {voters.map((v) => (
            <tr key={v.id}>
              <td>{v.name}</td>
              <td>{v.voter_id}</td>
              <td>{v.has_voted ? "✅" : "❌"}</td>
            </tr>
          ))}
          {voters.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: "center" }}>
                No tagged voters yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
