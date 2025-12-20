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
    app_name: "BOOTS ON THE GROUND",
    logo_url: null,
  });

  // Use array, not Set (simpler + matches VoterSearch usage)
  const [taggedIds, setTaggedIds] = useState([]);

  const [hasAcceptedTos, setHasAcceptedTos] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  // Cache-bust version for logo (prevents stale cached /static/logo.png)
  const [brandingVersion, setBrandingVersion] = useState(Date.now());

  async function loadBranding() {
    try {
      const data = await apiGetBranding();
      if (data) {
        setBranding((prev) => ({ ...prev, ...data }));
        setBrandingVersion(Date.now());
      }
    } catch (err) {
      console.error("Failed to load branding", err);
    }
  }

  // Load branding on first load
  useEffect(() => {
    loadBranding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for logo/app name updates from AdminPanel and refresh branding
  useEffect(() => {
    const handler = () => {
      loadBranding();
    };
    window.addEventListener("branding-updated", handler);
    return () => window.removeEventListener("branding-updated", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle login
  async function handleLogin(email, password) {
    try {
      setAuthError("");
      const data = await apiLogin(email, password);

      setUser({
        email,
        is_admin: data?.is_admin ?? false,
      });

      // Force ToS every login (session-based)
      setHasAcceptedTos(false);

      // Optional: refresh branding after login as well
      loadBranding();
    } catch (err) {
      console.error("Login error:", err);
      setToken(null);
      setUser(null);
      setTaggedIds([]);
      setHasAcceptedTos(false);
      setAuthError(err.message || "Login failed");
    }
  }

  // Handle logout
  function handleLogout() {
    setToken(null);
    setUser(null);
    setTaggedIds([]);
    setHasAcceptedTos(false);
    setAuthError("");
  }

  function handleTosAgree() {
    setHasAcceptedTos(true);
  }

  function handleTosDisagree() {
    setToken(null);
    setUser(null);
    setTaggedIds([]);
    setHasAcceptedTos(false);
    setAuthError(
      "You must agree to continue. You are being returned to the log-in screen."
    );
  }

  // Build full logo URL pointing at backend, not frontend.
  // Add cache-buster to avoid stale /static/logo.png.
  const logoSrc =
    branding?.logo_url && branding.logo_url.startsWith("http")
      ? branding.logo_url
      : branding?.logo_url
      ? `${apiBase}${branding.logo_url}?v=${brandingVersion}`
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
              onError={(e) => {
                // If logo fails to load, hide it instead of breaking the UI
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <h1 className="app-title">
            {branding?.app_name || "BOOTS ON THE GROUND"}
          </h1>
        </div>

        {user && hasAcceptedTos && (
          <button className="logout-button" onClick={handleLogout}>
            Log out
          </button>
        )}
      </header>

      <main className="main">
        {!user && <LoginForm onLogin={handleLogin} error={authError} />}

        {user && !hasAcceptedTos && (
          <TermsOfService onAgree={handleTosAgree} onDisagree={handleTosDisagree} />
        )}

        {user && hasAcceptedTos && (
          <>
            <Dashboard />
            <VoterSearch taggedIds={taggedIds} setTaggedIds={setTaggedIds} />
            <AdminPanel />
          </>
        )}
      </main>
    </div>
  );
}
