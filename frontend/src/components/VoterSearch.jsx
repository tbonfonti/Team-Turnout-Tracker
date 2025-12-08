import { useEffect, useState } from "react";
import { apiSearchVoters, apiTagVoter, apiUntagVoter } from "../api";

export default function VoterSearch({ taggedIds, setTaggedIds }) {
  const [query, setQuery] = useState("");
  const [field, setField] = useState("all");
  const [voters, setVoters] = useState([]);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  async function loadVoters(newPage = page, newPageSize = pageSize) {
    try {
      const res = await apiSearchVoters(query, newPage, newPageSize, field);
      setVoters(res.voters);
      setTotal(res.total);
      setPage(res.page);
      setPageSize(res.page_size);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadVoters(1, pageSize);
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
      await loadVoters(page, pageSize);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadVoters(1, pageSize);
  }

  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="card">
      <h2>Voter Database</h2>
      <form onSubmit={handleSearch} className="inline-form">
        <input
          placeholder="Search voters..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
        >
          <option value="all">All fields</option>
          <option value="first_name">First name</option>
          <option value="last_name">Last name</option>
          <option value="voter_id">Voter ID</option>
          <option value="address">Address</option>
          <option value="city">City</option>
          <option value="state">State</option>
          <option value="zip_code">ZIP code</option>
          <option value="county">County</option>
          <option value="registered_party">Party</option>
          <option value="phone">Phone</option>
          <option value="email">Email</option>
        </select>
        <button type="submit">Search</button>
      </form>
      {error && <div className="error">{error}</div>}

      <div
        className="pagination-controls"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          Showing {start}-{end} of {total}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label>
            Rows per page:{" "}
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setPage(1);
                loadVoters(1, newSize);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => loadVoters(page - 1, pageSize)}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => loadVoters(page + 1, pageSize)}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <table className="voter-table">
        <thead>
          <tr>
            <th>First</th>
            <th>Last</th>
            <th>Voter ID</th>
            <th>Address</th>
            <th>City</th>
            <th>State</th>
            <th>Zip</th>
            <th>County</th>
            <th>Party</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Voted?</th>
            <th>Tag</th>
          </tr>
        </thead>
        <tbody>
          {voters.map((v) => (
            <tr key={v.id}>
              <td>{v.first_name}</td>
              <td>{v.last_name}</td>
              <td>{v.voter_id}</td>
              <td>{v.address}</td>
              <td>{v.city}</td>
              <td>{v.state}</td>
              <td>{v.zip_code}</td>
              <td>{v.county}</td>
              <td>{v.registered_party}</td>
              <td>{v.phone}</td>
              <td>{v.email}</td>
              <td>{v.has_voted ? "✅" : "❌"}</td>
              <td>
                <button type="button" onClick={() => toggleTag(v)}>
                  {taggedIds.has(v.id) ? "Untag" : "Tag"}
                </button>
              </td>
            </tr>
          ))}
          {voters.length === 0 && (
            <tr>
              <td colSpan={13} style={{ textAlign: "center" }}>
                No voters found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
