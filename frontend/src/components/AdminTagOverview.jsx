import React, { useEffect, useState } from "react";
import { apiListUsers, apiGetTagOverview } from "../api";

export default function AdminTagOverview() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [items, setItems] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState("");

  // Load all users for the filter dropdown
  useEffect(() => {
    async function loadUsers() {
      try {
        setLoadingUsers(true);
        const data = await apiListUsers();
        setUsers(data);
      } catch (e) {
        console.error(e);
        setError("Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    }

    loadUsers();
  }, []);

  // Load tag overview (optionally filtered by selectedUserId)
  async function loadTags(userId) {
    try {
      setLoadingTags(true);
      setError("");
      const data = await apiGetTagOverview(userId || undefined);
      setItems(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load tag overview");
    } finally {
      setLoadingTags(false);
    }
  }

  // Initial load (no filter)
  useEffect(() => {
    loadTags("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUserChange(e) {
    const value = e.target.value;
    setSelectedUserId(value);
    loadTags(value);
  }

  function displayNameForUser(user) {
    if (user.full_name && user.full_name.trim().length > 0) {
      return `${user.full_name} (${user.email})`;
    }
    return user.email;
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Tagged Voters (Admin View)</h2>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <label>
          Filter by user:&nbsp;
          <select value={selectedUserId} onChange={handleUserChange}>
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {displayNameForUser(u)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => loadTags(selectedUserId)}
          disabled={loadingTags}
        >
          {loadingTags ? "Refreshing..." : "Refresh"}
        </button>

        {loadingUsers && <span>Loading users…</span>}
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: "0.5rem" }}>{error}</div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.9rem",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>User</th>
              <th style={thStyle}>User Email</th>
              <th style={thStyle}>Voter Name</th>
              <th style={thStyle}>Voter ID</th>
              <th style={thStyle}>Has Voted?</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "0.75rem", textAlign: "center" }}>
                  No tagged voters found for this filter.
                </td>
              </tr>
            )}
            {items.map((item, index) => (
              <tr key={`${item.user_id}-${item.voter_internal_id}-${index}`}>
                <td style={tdStyle}>{item.user_full_name || item.user_email}</td>
                <td style={tdStyle}>{item.user_email}</td>
                <td style={tdStyle}>
                  {item.first_name} {item.last_name}
                </td>
                <td style={tdStyle}>{item.voter_voter_id}</td>
                <td style={tdStyle}>{item.has_voted ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  borderBottom: "1px solid #ccc",
  textAlign: "left",
  padding: "0.5rem",
};

const tdStyle = {
  borderBottom: "1px solid #eee",
  padding: "0.5rem",
};
