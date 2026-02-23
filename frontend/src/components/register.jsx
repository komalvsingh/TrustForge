import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBlockchain } from "../context/BlockchainContext";
import Navbar from "./Navbar";

const Register = () => {
  const navigate = useNavigate();

  // Pull exactly what we need from BlockchainContext
  const {
    account,
    connectWallet,
    loading: blockchainLoading,   // context-level loading (connectWallet, registerUsername, etc.)
    registerUsername,             // handles tx + tx.wait() internally
    getAddressByUsername,         // returns null if not found
    hasUsernameRegistered,        // checks if an address has a username
  } = useBlockchain();

  const [username, setUsername]                       = useState("");
  const [validationError, setValidationError]         = useState("");
  const [availabilityStatus, setAvailabilityStatus]   = useState(null); // "available" | "taken" | null
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [loading, setLoading]                         = useState(false);
  const [error, setError]                             = useState("");
  const [success, setSuccess]                         = useState(""); // "registered" on success

  // Redirect if the connected account already has a username
  useEffect(() => {
    if (!account) return;
    (async () => {
      try {
        const has = await hasUsernameRegistered(account);
        if (has) navigate("/");
      } catch (err) {
        console.error("hasUsernameRegistered:", err);
      }
    })();
  }, [account]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateUsername = (value) => {
    setUsername(value);
    setValidationError("");
    setError("");
    setAvailabilityStatus(null);

    if (value.length > 0 && value.length < 3) {
      setValidationError("At least 3 characters required");
      return false;
    }
    if (value.length > 20) {
      setValidationError("Maximum 20 characters");
      return false;
    }
    if (value.length > 0 && !/^[a-zA-Z0-9_]*$/.test(value)) {
      setValidationError("Letters, numbers and underscores only");
      return false;
    }
    if (value.length > 0 && /^[0-9]/.test(value)) {
      setValidationError("Cannot start with a number");
      return false;
    }
    return true;
  };

  // ── Availability check (uses getAddressByUsername from context) ─────────────
  const checkAvailability = async () => {
    if (!username || validationError || username.length < 3) return;
    try {
      setCheckingAvailability(true);
      setError("");
      // getAddressByUsername returns null when username is free
      const existingAddress = await getAddressByUsername(username);
      if (existingAddress) {
        setAvailabilityStatus("taken");
        setError("This username is already taken");
      } else {
        setAvailabilityStatus("available");
      }
    } catch (err) {
      console.error("checkAvailability:", err);
    } finally {
      setCheckingAvailability(false);
    }
  };

  // ── Registration (uses registerUsername from context) ───────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!account) { setError("Please connect your wallet first"); return; }
    if (!username || validationError) { setError("Please enter a valid username"); return; }

    try {
      setLoading(true);

      // Re-check availability right before submitting
      const existingAddress = await getAddressByUsername(username);
      if (existingAddress) {
        setError("This username is already taken");
        setAvailabilityStatus("taken");
        return;
      }

      // registerUsername handles the contract call + tx.wait() + setLoading inside context
      // We wrap in our own try/catch so we can map error messages for the user
      await registerUsername(username);

      setSuccess("registered");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      console.error("Registration error:", err);
      const msg = err.message || "";
      if (msg.includes("already registered")) {
        setError("You have already registered a username");
      } else if (msg.includes("Invalid username")) {
        setError("Invalid username format");
      } else if (msg.includes("Username already taken")) {
        setError("This username is already taken");
      } else if (msg.includes("user rejected") || msg.includes("ACTION_REJECTED")) {
        setError("Transaction rejected in wallet");
      } else {
        setError("Failed to register. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const rules = [
    { label: "3–20 characters",               pass: username.length >= 3 && username.length <= 20 },
    { label: "Letters, numbers, underscores", pass: username.length > 0 && /^[a-zA-Z0-9_]*$/.test(username) },
    { label: "Cannot start with a number",    pass: username.length > 0 && !/^[0-9]/.test(username) },
  ];

  const shortAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  // blockchainLoading covers connectWallet; local loading covers handleRegister
  const isBusy = loading || blockchainLoading;

  const isSubmitDisabled =
    !account ||
    isBusy ||
    !!validationError ||
    !username ||
    username.length < 3 ||
    availabilityStatus === "taken";

  return (
    <>
      <Navbar />

      <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap');
          *{box-sizing:border-box}
          :root{
            --surface:#161616; --surface2:#1e1e1e;
            --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.12);
            --accent:#a8d4a0; --accent-glow:rgba(168,212,160,0.15);
            --accent-dim:rgba(168,212,160,0.08); --accent-border:rgba(168,212,160,0.25);
            --text:#f2efe9; --text-muted:#888; --text-dim:#444;
            --red:#f87171; --red-dim:rgba(248,113,113,0.08); --red-border:rgba(248,113,113,0.2);
            --amber:#fbbf24; --amber-dim:rgba(251,191,36,0.08); --amber-border:rgba(251,191,36,0.2);
            --mono:'DM Mono',monospace;
          }
          .card { background:var(--surface); border:1px solid var(--border); border-radius:24px; width:100%; max-width:480px; overflow:hidden; animation:fadeUp .5s ease forwards; position:relative; }
          .card-bar { height:2px; background:linear-gradient(90deg,transparent,var(--accent),transparent); }
          .card-inner { padding:36px 40px 40px; }
          .logo-row { display:flex; align-items:center; gap:12px; margin-bottom:36px; }
          .logo-icon { width:38px; height:38px; background:var(--accent); border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
          .logo-name { font-size:15px; font-weight:700; letter-spacing:-.02em; color:var(--text); }
          .logo-sub { font-family:var(--mono); font-size:9px; color:var(--text-dim); letter-spacing:.1em; margin-top:2px; }
          .page-title { font-size:28px; font-weight:700; letter-spacing:-.035em; color:var(--text); line-height:1.15; margin-bottom:8px; }
          .page-sub { font-size:13.5px; color:var(--text-muted); line-height:1.7; margin-bottom:28px; }
          .wallet-chip { display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--accent-dim); border:1px solid var(--accent-border); border-radius:12px; margin-bottom:28px; }
          .wallet-dot { width:8px; height:8px; background:var(--accent); border-radius:50%; position:relative; flex-shrink:0; animation:pulse 2.5s infinite; }
          .wallet-dot::after { content:''; position:absolute; inset:-3px; border:1px solid var(--accent); border-radius:50%; animation:ring 2.5s infinite; }
          .wallet-info { flex:1; }
          .wallet-label { font-family:var(--mono); font-size:9px; color:var(--text-dim); letter-spacing:.1em; margin-bottom:3px; }
          .wallet-addr { font-family:var(--mono); font-size:13px; color:var(--accent); font-weight:500; }
          .warn-chip { display:flex; align-items:center; gap:10px; padding:13px 16px; background:var(--amber-dim); border:1px solid var(--amber-border); border-radius:12px; margin-bottom:16px; font-size:13px; color:var(--amber); }
          .connect-btn { width:100%; padding:13px; border-radius:11px; background:rgba(168,212,160,.07); border:1px solid rgba(168,212,160,.2); color:var(--accent); font-size:14px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .22s; margin-bottom:28px; }
          .connect-btn:hover:not(:disabled) { background:rgba(168,212,160,.12); border-color:rgba(168,212,160,.35); }
          .connect-btn:disabled { opacity:.5; cursor:not-allowed; }
          .divider { height:1px; background:var(--border); margin:0 0 28px; }
          .input-label { font-size:11px; font-weight:600; color:var(--text-muted); letter-spacing:.06em; text-transform:uppercase; margin-bottom:10px; display:block; }
          .input-row { display:flex; gap:8px; align-items:stretch; }
          .input-wrap { position:relative; flex:1; }
          .rg-input { width:100%; padding:13px 40px 13px 16px; background:var(--surface2); border:1px solid var(--border2); border-radius:11px; color:var(--text); font-size:14px; font-family:'DM Sans',sans-serif; outline:none; transition:border-color .2s,box-shadow .2s; height:48px; }
          .rg-input::placeholder { color:var(--text-dim); }
          .rg-input:focus { border-color:rgba(168,212,160,.4); box-shadow:0 0 0 3px rgba(168,212,160,.08); }
          .rg-input.err { border-color:var(--red-border); box-shadow:0 0 0 3px var(--red-dim); }
          .rg-input.ok  { border-color:rgba(168,212,160,.4); box-shadow:0 0 0 3px rgba(168,212,160,.08); }
          .rg-input:disabled { opacity:.4; cursor:not-allowed; }
          .input-icon { position:absolute; right:13px; top:50%; transform:translateY(-50%); display:flex; align-items:center; pointer-events:none; }
          .check-btn { padding:0 18px; height:48px; border-radius:11px; border:1px solid var(--border2); background:var(--surface2); color:var(--text-muted); font-size:12.5px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all .2s; white-space:nowrap; flex-shrink:0; }
          .check-btn:hover:not(:disabled) { color:var(--text); background:rgba(255,255,255,.04); }
          .check-btn:disabled { opacity:.3; cursor:not-allowed; }
          .msg { display:flex; align-items:flex-start; gap:9px; padding:11px 14px; border-radius:10px; margin-top:10px; font-size:12.5px; line-height:1.5; }
          .msg.err { background:var(--red-dim); border:1px solid var(--red-border); color:var(--red); }
          .msg.ok  { background:var(--accent-dim); border:1px solid var(--accent-border); color:var(--accent); }
          .rules { display:flex; flex-direction:column; gap:7px; margin-top:16px; }
          .rule { display:flex; align-items:center; gap:9px; font-family:var(--mono); font-size:11.5px; transition:color .2s; }
          .rule.pass { color:var(--accent); }
          .rule.fail { color:var(--text-dim); }
          .rule-dot { width:5px; height:5px; border-radius:50%; background:currentColor; flex-shrink:0; transition:transform .2s; }
          .rule.pass .rule-dot { transform:scale(1.2); }
          .submit-btn { width:100%; padding:15px; border-radius:12px; border:none; background:var(--accent); color:#0c1a0c; font-size:14px; font-weight:700; font-family:'DM Sans',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .22s; margin-top:28px; letter-spacing:-.01em; }
          .submit-btn:hover:not(:disabled) { background:#bde0b4; transform:translateY(-1px); box-shadow:0 8px 28px var(--accent-glow); }
          .submit-btn:disabled { opacity:.35; cursor:not-allowed; transform:none; box-shadow:none; }
          .footer-row { display:flex; align-items:center; justify-content:space-between; margin-top:24px; padding-top:24px; border-top:1px solid var(--border); }
          .already-text { font-size:12.5px; color:var(--text-dim); }
          .already-link { background:none; border:none; color:var(--accent); font-size:12.5px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; padding:0; transition:color .2s; }
          .already-link:hover { color:#bde0b4; }
          .badges { display:flex; gap:6px; }
          .badge { font-family:var(--mono); font-size:9px; letter-spacing:.07em; color:var(--text-dim); background:var(--surface2); border:1px solid var(--border); padding:4px 9px; border-radius:6px; }
          .success-overlay { position:absolute; inset:0; background:rgba(13,13,13,.97); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; border-radius:24px; animation:fadeUp .3s ease forwards; z-index:10; }
          .success-icon { width:64px; height:64px; border-radius:50%; background:var(--accent-dim); border:1px solid var(--accent-border); display:flex; align-items:center; justify-content:center; }
          .spin { animation:spin .8s linear infinite; display:inline-flex; }
          @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          @keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
          @keyframes ring   { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.6);opacity:0} }
          @keyframes spin   { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        `}</style>

        {/* Background orbs */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:0 }}>
          <div style={{ position:"absolute", top:"-10%", left:"-10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(168,212,160,.04) 0%, transparent 70%)", filter:"blur(60px)" }}/>
          <div style={{ position:"absolute", bottom:"-5%", right:"-5%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(168,212,160,.03) 0%, transparent 70%)", filter:"blur(60px)" }}/>
        </div>

        <div className="card" style={{ position:"relative", zIndex:1 }}>
          <div className="card-bar"/>

          {/* ── Success overlay ── */}
          {success === "registered" && (
            <div className="success-overlay">
              <div className="success-icon">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, color:"var(--text)", marginBottom:6 }}>Registered!</div>
                <div style={{ fontFamily:"var(--mono)", fontSize:13, color:"var(--text-dim)" }}>@{username}</div>
              </div>
              <div style={{ fontSize:12, color:"var(--text-dim)" }}>Redirecting to dashboard…</div>
            </div>
          )}

          <div className="card-inner">

            {/* Logo */}
            <div className="logo-row">
              <div className="logo-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0c1a0c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div className="logo-name">TrustForge</div>
                <div className="logo-sub">USERNAME REGISTRATION</div>
              </div>
            </div>

            <h1 className="page-title">Choose your<br/>username</h1>
            <p className="page-sub">Your on-chain identity. Permanent and tied to your wallet address.</p>

            {/* ── Wallet section ── */}
            {!account ? (
              <>
                <div className="warn-chip">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Connect your wallet to register a username
                </div>
                <button className="connect-btn" onClick={connectWallet} disabled={blockchainLoading}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                  {blockchainLoading ? "Connecting…" : "Connect Wallet"}
                </button>
              </>
            ) : (
              <div className="wallet-chip">
                <div className="wallet-dot"/>
                <div className="wallet-info">
                  <div className="wallet-label">Connected Wallet</div>
                  <div className="wallet-addr">{shortAddress(account)}</div>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            )}

            <div className="divider"/>

            {/* ── Form ── */}
            <form onSubmit={handleRegister}>
              <label className="input-label">Username</label>
              <div className="input-row">
                <div className="input-wrap">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => validateUsername(e.target.value)}
                    onBlur={checkAvailability}
                    placeholder="e.g. satoshi_42"
                    disabled={!account || isBusy}
                    className={`rg-input${
                      validationError || availabilityStatus === "taken" ? " err"
                      : availabilityStatus === "available" ? " ok" : ""
                    }`}
                  />
                  <div className="input-icon">
                    {checkingAvailability && (
                      <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                        <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                      </svg>
                    )}
                    {!checkingAvailability && availabilityStatus === "available" && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                    {!checkingAvailability && availabilityStatus === "taken" && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    )}
                  </div>
                </div>

                {/* Manual check triggers checkAvailability which calls getAddressByUsername */}
                <button
                  type="button"
                  className="check-btn"
                  onClick={checkAvailability}
                  disabled={!account || !username || !!validationError || username.length < 3 || checkingAvailability || isBusy}
                >
                  {checkingAvailability ? "Checking…" : "Check"}
                </button>
              </div>

              {/* Validation error */}
              {validationError && (
                <div className="msg err">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {validationError}
                </div>
              )}

              {/* Availability status messages */}
              {!validationError && availabilityStatus === "available" && (
                <div className="msg ok">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><polyline points="20 6 9 17 4 12"/></svg>
                  @{username} is available
                </div>
              )}
              {!validationError && availabilityStatus === "taken" && (
                <div className="msg err">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  @{username} is already taken
                </div>
              )}

              {/* Generic errors (not duplicated by the above) */}
              {error && !validationError && availabilityStatus !== "taken" && (
                <div className="msg err">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Rules */}
              <div className="rules">
                {rules.map((r, i) => (
                  <div key={i} className={`rule ${username.length > 0 ? (r.pass ? "pass" : "fail") : "fail"}`}>
                    <div className="rule-dot"/>
                    <span>{r.label}</span>
                  </div>
                ))}
              </div>

              {/* Submit */}
              <button type="submit" className="submit-btn" disabled={isSubmitDisabled}>
                {isBusy ? (
                  <>
                    <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                    </svg>
                    Registering…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    Register Username
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="footer-row">
              <div>
                <span className="already-text">Already registered? </span>
                <button className="already-link" onClick={() => navigate("/")}>Go to Dashboard →</button>
              </div>
              <div className="badges">
                <span className="badge">ON-CHAIN</span>
                <span className="badge">PERMANENT</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Register;