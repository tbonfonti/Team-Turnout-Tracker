// src/components/AdminPanel.jsx
import { useEffect, useState } from "react";
import {
  apiGetMe,
  apiListUsers,
  apiGetDashboard,
  apiGetDashboardForUser,
  apiUploadLogo,
} from "../api";

export default function AdminPanel({ token }) {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [logoFile, setLogoFile] = useState(null);
  const [message, setMessage] = useState("");

  // Load admin info
  useEffect(() => {
    apiGetMe(token).then(setMe).catch(console.error);
    apiListUsers(token).then(setUsers).catch(console.error);
    apiGetDashboard(token).then(setDashboard).catch(console.error);
  }, [token]);

  // Filter dashboard by user
  useEffect(() => {
    if (selectedUser === "all") {
      apiGetDashboard(token).then(setDashboard);
    } else {
      apiGetDashboardForUser(token, selectedUser).then(setDashboard);
    }
  }, [selectedUser, token]);

  async function handleLogoUpload() {
    if (!logoFile) return;
    try {
      await apiUploadLogo(token, logoFile);
      setMessage("Logo updated successfully!");
    } catch (err) {
      setMessage("Upload failed");
      console.error(err);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin Dashboard</h2>

      {/* Filter users */}
      <div style={{ marginBottom: 20 }}>
        <label>User Filter: </label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="all">All Users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.first_name} {u.last_name}
            </option>
          ))}
        </select>
      </div>

      {/* Tagged voter overview */}
      <h3>Tagged Voters</h3>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>User</th>
            <th>Total Tagged</th>
          </tr>
        </thead>
        <tbody>
          {dashboard.map((row) => (
            <tr key={row.user_id}>
              <td>{row.user_name}</td>
              <td>{row.total_tagged}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Logo upload */}
      <h3 style={{ marginTop: 40 }}>Branding</h3>
      <input type="file" onChange={(e) => setLogoFile(e.target.files[0])} />
      <button onClick={handleLogoUpload}>Upload Logo</button>

      {message && <p>{message}</p>}
    </div>
  );
}
