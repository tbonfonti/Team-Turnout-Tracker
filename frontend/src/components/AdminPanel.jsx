// frontend/src/components/AdminPanel.jsx

import { useEffect, useState } from "react";
import { apiListUsers, apiGetTagOverview } from "../api";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [tagData, setTagData] = useState([]);

  // Load users + initial tag data
  useEffect(() => {
    apiListUsers().then((u) => setUsers(u));
    loadTagData(null);
  }, []);

  // Load tag overview
  function loadTagData(userId) {
    apiGetTagOverview(userId).then((data) => setTagData(data));
  }

  // Handle filter change
  function handleUserSelect(e) {
    const userId = e.target.value;
    setSelectedUser(userId);
    loadTagData(userId || null);
  }

  return (
    <div className="admin-panel">
      <h2>Tag Overview</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "8px" }}>Filter by User:</label>

        <select
          value={selectedUser}
          onChange={handleUserSelect}
          style={{ padding: "6px", borderRadius: "5px" }}
        >
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.first_name} {u.last_name}
            </option>
          ))}
        </select>
      </div>

      <table className="dashboard-table">
        <thead>
          <tr>
            <th>User</th>
            <th># Tagged Voters</th>
          </tr>
        </thead>
        <tbody>
          {tagData.map((row) => (
            <tr key={row.user_id}>
              <td>
                {row.first_name} {row.last_name}
              </td>
              <td>{row.tag_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
