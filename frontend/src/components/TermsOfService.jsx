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

        <h3>Data Privacy</h3>
        <p>
          You acknowledge that this system may contain sensitive voter
          information, including contact details and voting status. You agree to
          handle all data in accordance with applicable privacy laws and your
          organization&apos;s data-handling policies. You will not export,
          distribute, or otherwise misuse this data.
        </p>

        <h3>Security</h3>
        <p>
          You agree to keep your login credentials confidential and to notify an
          administrator immediately if you suspect that your account has been
          compromised. You will not attempt to bypass security controls or gain
          access to data or functionality you are not authorized to use.
        </p>

        <h3>Accuracy and Use of Information</h3>
        <p>
          You understand that voter data may not be fully accurate or complete.
          You agree to use your best judgment when acting on information in this
          system and to report any suspected data issues to an administrator.
        </p>

        <h3>Compliance</h3>
        <p>
          You are responsible for ensuring that your use of this system complies
          with all applicable federal, state, and local laws, as well as
          internal campaign or organizational policies.
        </p>

        <h3>Revocation of Access</h3>
        <p>
          The campaign or system administrator reserves the right to revoke or
          suspend access to this application at any time for any reason,
          including suspected misuse, security concerns, or policy violations.
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
            backgroundColor: "#f5f5f5",
            border: "1px solid #ccc",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          I do not Agree
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
          Agree
        </button>
      </div>
    </div>
  );
}
