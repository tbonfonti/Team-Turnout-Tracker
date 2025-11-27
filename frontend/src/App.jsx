import { useEffect, useState } from "react";
import LoginForm from "./components/LoginForm";
import AdminPanel from "./components/AdminPanel";
import VoterSearch from "./components/VoterSearch";
import Dashboard from "./components/Dashboard";
import { apiLogin, setToken, apiGetBranding } from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [branding, setBranding] = useState({ app_name: "Team Turnout Tracking" });
  const [taggedIds, setTaggedIds] = useState(new Set());

  useEffect(() => {
    apiGetBranding()
      .then(setBranding)
      .catch(() => {}); // ignore branding errors for now
  }, []);

  async function handleLogin(email, password) {
    try {
      const tokenData = await apiLogin(email, password);
      setToken(tokenData.access_token);
      setUser({ email });
      setAuthError("");
    } catch (err) {
      setAuthError(err.message || "Login failed");
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
            <Dashboard />
            <VoterSearch taggedIds={taggedIds} setTaggedIds={setTaggedIds} />
            {/* For now, always show AdminPanel; backend enforces admin rights */}
            <AdminPanel />
          </>
        )}
      </main>
    </div>
  );
}
