import { useEffect, useMemo, useState } from "react";
import { apiSearchVoters, apiTagVoter, apiUntagVoter } from "../api";

export default function VoterSearch(props) {
  // ✅ Safe defaults: if parent doesn't pass these, we still work.
  const [localTaggedIds, setLocalTaggedIds] = useState([]);

  const taggedIds = Array.isArray(props?.taggedIds) ? props.taggedIds : localTaggedIds;
  const setTaggedIds = typeof props?.setTaggedIds === "function" ? props.setTaggedIds : setLocalTaggedIds;

  const [query, setQuery] = useState("");
  const [field, setField] = useState("all");
  const [voters, setVoters] = useState([]);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [total, setTotal] = useState(null); // may be null for searches now
  const [hasMore, setHasMore] = useState(false);

  async function loadVoters(newPage = page, newPageSize = pageSize) {
    try {
      setError("");
      const res = await apiSearchVoters(query, newPage, newPageSize, field);

      setVoters(res?.voters || []);
      setPage(res?.page || newPage);
      setPageSize(res?.page_size || newPageSize);

      setHasMore(Boolean(res?.has_more));
      setTotal(typeof res?.total === "number" ? res.total : null);
    } catch (e) {
      setError(e?.message || "Failed to load voters");
    }
  }

  useEffect(() => {
    loadVoters(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    await loadVoters(1, pageSize);
  }

  async function toggleTag(voterInternalId) {
    try {
      setError("");
      if (taggedIds.includes(voterInternalId)) {
        await apiUntagVoter(voterInternalId);
        setTaggedIds(taggedIds.filter((id) => id !== voterInternalId));
      } else {
        await apiTagVoter(voterInternalId);
        setTaggedIds([...taggedIds, voterInternalId]);
      }
    } catch (e) {
      setError(e?.message || "Failed to update tag");
    }
  }

  const start = voters.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = (page - 1) * pageSize + voters.length;

  const canPrev = page > 1;
  const canNext = hasMore || (typeof total === "number" && end < total);

  const totalText = useMemo(() => {
    return typeof total === "number" ? String(total) : "?";
  }, [total]);

  return (
    <div>
      <h2>Voter Search</h2>

      {error && (
        <div style={{ color: "white", background: "#b00020", padding: "0.5rem", marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search voters..."
          style={{ flex: 1, padding: "0.5rem" }}
        />
        <select value={field} onChange={(e) => setField(e.target.value)} style={{ padding: "0.5rem" }}>
          <option value="all">All fields</option>
          <option value="first_name">First name</option>
          <option value="last_name">Last name</option>
          <option value="address">Address</option>
          <option value="city">City</option>
          <option value="state">State</option>
          <option value="zip_code">ZIP</option>
          <option value="county">County</option>
          <option value="precinct">Precinct</option>
          <option value="registered_party">Party</option>
          <option value="phone">Phone</option>
          <option value="email">Email</option>
          <option value="voter_id">Voter ID</option>
        </select>
        <button type="submit">Search</button>
      </form>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div>
          Showing {start}-{end} of {totalText}
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
            disabled={!canPrev}
            onClick={() => {
              const newPage = Math.max(1, page - 1);
              setPage(newPage);
              loadVoters(newPage, pageSize);
            }}
          >
            Prev
          </button>

          <button
            disabled={!canNext}
            onClick={() => {
              const newPage = page + 1;
              setPage(newPage);
              loadVoters(newPage, pageSize);
            }}
          >
            Next
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Tag</th>
              <th>Voter ID</th>
              <th>First</th>
              <th>Last</th>
              <th>Address</th>
              <th>City</th>
              <th>State</th>
              <th>ZIP</th>
              <th>County</th>
              <th>Precinct</th>
              <th>Party</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Voted</th>
            </tr>
          </thead>
          <tbody>
            {voters.map((v) => (
              <tr key={v.id}>
                <td style={{ textAlign: "center" }}>
                  <button onClick={() => toggleTag(v.id)}>{taggedIds.includes(v.id) ? "Untag" : "Tag"}</button>
                </td>
                <td>{v.voter_id}</td>
                <td>{v.first_name}</td>
                <td>{v.last_name}</td>
                <td>{v.address || ""}</td>
                <td>{v.city || ""}</td>
                <td>{v.state || ""}</td>
                <td>{v.zip_code || ""}</td>
                <td>{v.county || ""}</td>
                <td>{v.precinct || ""}</td>
                <td>{v.registered_party || ""}</td>
                <td>{v.phone || ""}</td>
                <td>{v.email || ""}</td>
                <td>{v.has_voted ? "Yes" : "No"}</td>
              </tr>
            ))}

            {voters.length === 0 && (
              <tr>
                <td colSpan={14} style={{ textAlign: "center" }}>
                  No voters found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
