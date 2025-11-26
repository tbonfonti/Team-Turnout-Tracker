import { useEffect, useState } from "react";
import LoginForm from "./components/LoginForm";
import AdminPanel from "./components/AdminPanel";
import VoterSearch from "./components/VoterSearch";
import Dashboard from "./components/Dashboard";
import { apiLogin, setToken, apiGetBranding } from "./api";

export default function App() {
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState(null); // we'll keep minimal info in local state
  const [branding, setBranding] = useState({ app_name: "Team Turnout Tracking" });
  const [taggedIds, setTaggedIds] = useState(new Set());

  useEffect(() => {
    apiGetBranding().then(setBranding).catch(() => {});
  }, []);

  async function handleLogin(email, password) {
    try {
      const tokenData = await apiLogin(email, password);
      setToken(tokenData.access_token);
      setAuthError("");

      // Decode basic payload to extract email; for demo we just save email & default is_admin guess.
      const [, payload] = tokenData.access_token.split(".");
      const decoded = JSON.parse(atob(payload));
      setUser({ email: decoded.sub, is_admin: decoded.sub === "admin@example.com" ? true : undefined });
      // In a real app, you would have an endpoint /me returning role & details.
    } catch (err) {
      setAuthError(err.message);
    }
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setTaggedIds(new Set());
  }

  return (
    <div className="app">
      <header className="header">
        <div className="branding">
          {branding.logo_url && (
            <img src={branding.logo_url} alt="Logo" className="logo" />
          )}
          <h1>{branding.app_name || "Team Turnout Tracking"}</h1>
        </div>
        {user && (
          <div className="user-info">
            <span>{user.email}</span>
            <button onClick={handleLogout}>Log out</button>
          </div>
        )}
      </header>

      <main>
        {!user ? (
          <LoginForm onLogin={handleLogin} error={authError} />
        ) : (
          <>
            {/* In real app, fetch /me to know is_admin; for now, assume any logged-in user might be admin via separate UI logic */}
            {/* You can enhance to store is_admin in JWT and decode here */}
            <Dashboard />
            <VoterSearch taggedIds={taggedIds} setTaggedIds={setTaggedIds} />
            {/* Show admin panel if user is admin once you wire /me */}
            {/* <AdminPanel /> */}
          </>
        )}
      </main>
    </div>
  );
}
