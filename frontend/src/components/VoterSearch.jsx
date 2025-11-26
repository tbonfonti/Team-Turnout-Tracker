import { useEffect, useState } from "react";
import { apiSearchVoters, apiTagVoter, apiUntagVoter } from "../api";

export default function VoterSearch({ taggedIds, setTaggedIds }) {
  const [query, setQuery] = useState("");
  const [voters, setVoters] = useState([]);
  const [error, setError] = useState("");

  async function loadVoters() {
    try {
      const res = await apiSearchVoters(query);
      setVoters(res.voters);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadVoters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleTag(voter) {
    try {
      if (taggedIds.has(voter.id)) {
        await apiUntagVoter(voter.id);
        const copy = new Set(taggedIds);
        copy.delete(voter.id);
        setTaggedIds(copy);
      } else {
        await apiTagVoter(voter.id);
        const copy = new Set(taggedIds);
        copy.add(voter.id);
        setTaggedIds(copy);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadVoters();
  }

  return (
    <div className="card">
      <h2>Voter Database</h2>
      <form onSubmit={handleSearch} className="inline-form">
        <input
          placeholder="Search by name, address, ID, phone, email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      {error && <div className="error">{error}</div>}
      <table className="voter-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Voter ID</th>
            <th>Address</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Voted?</th>
            <th>Tag</th>
          </tr>
        </thead>
        <tbody>
          {voters.map((v) => (
            <tr key={v.id}>
              <td>{v.name}</td>
              <td>{v.voter_id}</td>
              <td>{v.address}</td>
              <td>{v.phone}</td>
              <td>{v.email}</td>
              <td>{v.has_voted ? "✅" : "❌"}</td>
              <td>
                <button onClick={() => toggleTag(v)}>
                  {taggedIds.has(v.id) ? "Untag" : "Tag"}
                </button>
              </td>
            </tr>
          ))}
          {voters.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center" }}>
                No voters found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
