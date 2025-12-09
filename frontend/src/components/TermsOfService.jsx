// frontend/src/components/TermsOfService.jsx

export default function TermsOfService({ onAgree, onDisagree }) {
  return (
    <div className="card" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h2>Terms of Service</h2>

      <div
        className="tos-content"
        style={{
          maxHeight: "50vh",
          overflowY: "auto",
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: "4px",
          background: "#fafafa",
          marginBottom: "1rem",
          fontSize: "0.95rem",
          lineHeight: 1.5,
        }}
      >
        <p>
          By using this application, you agree to the following terms and
          conditions. These terms are intended to protect the privacy of voters,
          safeguard sensitive information, and ensure responsible use of this
          tool.
        </p>

        <h3>Authorized Use Only</h3>
        <p>
          You agree to use this application only for legitimate campaign or
          outreach activities that comply with all applicable laws and
          regulations. You will not share access to this system with any
          unauthorized individual.
        </p>

        <p>
            By selecting “I Accept”, you indicate that you are an authorized user of Team Turnout Tracker.     
 
            By selecting “I Accept”, you acknowledge that the data contained in Team Turnout Tracker is the sole property of the campaign. 
 
            By selecting “I Accept”, you agree that you will not permit the use or copying of the voter information by any person not working under the direction of the campaign.      
 
            By selecting “I Accept”, you agree that you are utilizing the information contained in Team Turnout Tracker for campaign political purposes only.  In addition, you agree that under no circumstances will you use this information for commercial purposes.      
 
            By selecting “I Accept”, you agree not to sell any part of the information contained in Team Turnout Tracker.  
 
            By selecting “I Accept” you acknowledge that any malicious use of Team Turnout Tracker will result in the immediate termination of your user account and may result in further penalties.
        </p>

        <h3>Acceptance of Terms</h3>
        <p>
          By clicking &quot;Agree&quot; below, you confirm that you have read,
          understood, and agree to be bound by these Terms of Service. If you do
          not agree, you must not use this application.
        </p>
      </div>

      <div
        className="tos-actions"
        style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}
      >
        <button
          type="button"
          onClick={onDisagree}
          style={{
            backgroundColor: "#313131",
            border: "1px solid #ccc",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          I Do Not Agree
        </button>
        <button
          type="button"
          onClick={onAgree}
          style={{
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            padding: "0.5rem 1.2rem",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          I Agree
        </button>
      </div>
    </div>
  );
}
