// frontend/src/App.jsx
import { useEffect, useState } from "react";
import LoginForm from "./components/LoginForm";
import AdminPanel from "./components/AdminPanel";
import VoterSearch from "./components/VoterSearch";
import Dashboard from "./components/Dashboard";
import TermsOfService from "./components/TermsOfService";
import { apiLogin, setToken, apiGetBranding } from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [branding, setBranding] = useState({
    app_name: "Team Turnout Tracking",
    logo_url: null,
  });
  const [taggedIds, setTaggedIds] = useState(new Set());
  const [hasAcceptedTos, setHasAcceptedTos] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  // Load branding (logo, app name) on first load
  useEffect(() => {
    async function loadBranding() {
      try {
        const data = await apiGetBranding();
        if (data) {
          setBranding((prev) => ({
            ...prev,
            ...data,
          }));
        }
      } catch (err) {
        console.error("Failed to load branding", err);
      }
    }

    loadBranding();
  }, []);

  // Handle login
  async function handleLogin(email, password) {
    try {
      setAuthError("");
      const data = await apiLogin(email, password);
      // apiLogin sets the token; we just track that the user is logged in.
      setUser({
        email,
        is_admin: data?.is_admin ?? false,
      });
      // Force ToS every login (session-based)
      setHasAcceptedTos(false);
    } catch (err) {
      console.error("Login error:", err);
      setToken(null);
      setUser(null);
      setTaggedIds(new Set());
      setHasAcceptedTos(false);
      setAuthError(err.message || "Login failed");
    }
  }

  // Handle logout (explicit user action)
  function handleLogout() {
    setToken(null);
    setUser(null);
    setTaggedIds(new Set());
    setHasAcceptedTos(false);
    setAuthError("");
  }

  function handleTosAgree() {
    setHasAcceptedTos(true);
  }

  function handleTosDisagree() {
    // Clear session but show the required message on the login screen
    setToken(null);
    setUser(null);
    setTaggedIds(new Set());
    setHasAcceptedTos(false);
    setAuthError(
      "You must agree to continue. You are being returned to the log-in screen."
    );
  }

  // Build full logo URL pointing at backend, not frontend
  const logoSrc =
    branding?.logo_url && branding.logo_url.startsWith("http")
      ? branding.logo_url
      : branding?.logo_url
      ? `${apiBase}${branding.logo_url}`
      : null;

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          {logoSrc && (
            <img
              src={logoSrc}
              alt="Logo"
              className="logo"
            />
          )}
          <h1 className="app-title">
            {branding?.app_name || "Team Turnout Tracking"}
          </h1>
        </div>
        {user && hasAcceptedTos && (
          <button className="logout-button" onClick={handleLogout}>
            Log out
          </button>
        )}
      </header>

      <main className="main">
        {/* No user yet -> show login */}
        {!user && (
          <LoginForm
            onLogin={handleLogin}
            error={authError}
          />
        )}

        {/* User logged in but has NOT accepted ToS -> show ToS gate */}
        {user && !hasAcceptedTos && (
          <TermsOfService
            onAgree={handleTosAgree}
            onDisagree={handleTosDisagree}
          />
        )}

        {/* User logged in AND has accepted ToS -> show main app */}
        {user && hasAcceptedTos && (
          <>
            <Dashboard />
            <VoterSearch taggedIds={taggedIds} setTaggedIds={setTaggedIds} />
            {/* Backend enforces admin rights; non-admins will get 403 on admin APIs */}
            <AdminPanel />
          </>
        )}
      </main>
    </div>
  );
}
