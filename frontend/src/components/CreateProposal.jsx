import { useState } from "react";
import { useDAO, PROPOSAL_TEMPLATES } from "../context/DAOContext";
import { useBlockchain } from "../context/BlockchainContext";
import {
  Terminal, Zap, ShieldCheck, AlertTriangle,
  TrendingUp, Settings, Lock, DollarSign,
  Info, ArrowRight, CheckCircle,
} from "lucide-react";

// ── Category metadata ──────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "interest", label: "Interest Rates", icon: TrendingUp,
    accent: "#b5d4a8", bg: "rgba(181,212,168,.08)", border: "rgba(181,212,168,.2)",
    templates: ["UPDATE_LOW_RISK_RATES","UPDATE_MED_RISK_RATES","UPDATE_HIGH_RISK_RATES"],
    desc: "Adjust lending pool APR",
  },
  {
    id: "limits", label: "Borrow Limits", icon: DollarSign,
    accent: "#a8c4d4", bg: "rgba(168,196,212,.08)", border: "rgba(168,196,212,.2)",
    templates: ["UPDATE_BORROWING_LIMITS"],
    desc: "Change max per trust tier",
  },
  {
    id: "fees", label: "Platform Fee", icon: Settings,
    accent: "#c4a8d4", bg: "rgba(196,168,212,.08)", border: "rgba(196,168,212,.2)",
    templates: ["SET_PLATFORM_FEE","SET_MIN_INTEREST","SET_AUTO_LIMIT"],
    desc: "Protocol fee parameters",
  },
  {
    id: "vouch", label: "Vouch Params", icon: ShieldCheck,
    accent: "#d4c4a8", bg: "rgba(212,196,168,.08)", border: "rgba(212,196,168,.2)",
    templates: ["UPDATE_VOUCH_PARAMS"],
    desc: "Social endorsement config",
  },
  {
    id: "admin", label: "Admin / Emergency", icon: Lock,
    accent: "#e87070", bg: "rgba(232,112,112,.08)", border: "rgba(232,112,112,.22)",
    templates: ["SET_ADMIN_WALLET","SET_EMERGENCY_PAUSER","PAUSE_PROTOCOL","UNPAUSE_PROTOCOL"],
    desc: "Emergency controls",
  },
];

const POOL_META = {
  UPDATE_LOW_RISK_RATES:  { label:"Low Risk Pool",    hint:"Conservative: 300–800 bps",   color:"#b5d4a8" },
  UPDATE_MED_RISK_RATES:  { label:"Medium Risk Pool", hint:"Typical: 700–1500 bps",        color:"#e8c96d" },
  UPDATE_HIGH_RISK_RATES: { label:"High Risk Pool",   hint:"Aggressive: 1200–2500 bps",    color:"#e87070" },
};

// ── Small input widget ─────────────────────────────────────────────────────
const Field = ({ label, name, value, onChange, type="number", hint, placeholder }) => (
  <div>
    <label style={{ display:"block", fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", letterSpacing:".1em", marginBottom:6, textTransform:"uppercase" }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(name, e.target.value)}
      placeholder={placeholder || ""}
      style={{
        width:"100%", background:"rgba(0,0,0,.4)", border:"1px solid rgba(255,255,255,.1)",
        borderRadius:9, padding:"11px 14px", color:"#f0ede8",
        fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none",
        transition:"border-color .2s", boxSizing:"border-box",
      }}
      onFocus={e => e.target.style.borderColor = "rgba(181,212,168,.4)"}
      onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,.1)"}
    />
    {hint && (
      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4, fontFamily:"var(--mono)", fontSize:9, color:"var(--td)" }}>
        <Info size={9} />{hint}
      </div>
    )}
  </div>
);

// ── Rate preset button ─────────────────────────────────────────────────────
const Preset = ({ label, base, max, onPick }) => (
  <button
    onClick={onPick}
    style={{
      flex:1, padding:"10px 8px", background:"rgba(0,0,0,.3)",
      border:"1px solid rgba(255,255,255,.08)", borderRadius:8,
      cursor:"pointer", transition:"all .18s", textAlign:"center",
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(181,212,168,.3)"}
    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"}
  >
    <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", marginBottom:3, textTransform:"uppercase" }}>{label}</div>
    <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"#b5d4a8", fontWeight:600 }}>{base}–{max}</div>
  </button>
);

// ── Main component ─────────────────────────────────────────────────────────
const CreateProposal = ({ onCreated }) => {
  const { createProposalFromTemplate, getVotingPower, loading } = useDAO();
  const { account } = useBlockchain();

  const [selectedCat,  setCat]      = useState(null);
  const [selectedTpl,  setTpl]      = useState(null);
  const [fields,       setFields]   = useState({});
  const [description,  setDesc]     = useState("");
  const [error,        setError]    = useState("");
  const [success,      setSuccess]  = useState(false);

  const template = selectedTpl ? PROPOSAL_TEMPLATES[selectedTpl] : null;
  const catMeta  = CATEGORIES.find(c => c.id === selectedCat?.id);

  const handleCatSelect = (cat) => {
    setCat(cat); setTpl(null); setFields({}); setError("");
  };

  const handleTplSelect = (key) => {
    setTpl(key); setFields({}); setError("");
    const t = PROPOSAL_TEMPLATES[key];
    setDesc(t.argFields.length === 0 ? t.describe({}) : "");
  };

  const handleChange = (name, value) => {
    const next = { ...fields, [name]: value };
    setFields(next);
    if (template?.argFields.length > 0) {
      try { setDesc(template.describe(next)); } catch {}
    }
  };

  const validate = () => {
    if (!selectedTpl)       return "Select a proposal type";
    if (!description.trim()) return "Description is required";
    if (template) {
      for (const f of template.argFields) {
        if (!fields[f.name] && fields[f.name] !== 0) return `${f.label} is required`;
        if (f.type === "number") {
          const v = Number(fields[f.name]);
          if (isNaN(v) || v < 0) return `${f.label} must be a valid positive number`;
        }
      }
      if (selectedTpl.includes("RISK_RATES")) {
        if (Number(fields.baseRate) >= Number(fields.maxRate)) return "Base rate must be less than max rate";
        if (Number(fields.maxRate) > 5000) return "Max rate cannot exceed 5000 bps (50%)";
      }
      if (selectedTpl === "UPDATE_BORROWING_LIMITS") {
        if (!(Number(fields.lowTrust) < Number(fields.medTrust) && Number(fields.medTrust) < Number(fields.highTrust)))
          return "Limits must be ascending: Low < Med < High";
      }
      if (selectedTpl === "SET_PLATFORM_FEE" && Number(fields.feeBps) > 1000)
        return "Platform fee cannot exceed 1000 bps (10%)";
    }
    return null;
  };

  const submit = async () => {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }

    const power = await getVotingPower(account);
    if (Number(power) < 100) {
      setError("You need at least 100 USDC to create a proposal");
      return;
    }

    try {
      await createProposalFromTemplate(selectedTpl, fields, description);
      setSuccess(true);
      setTimeout(() => onCreated(), 1800);
    } catch (err) {
      setError(err?.reason || err?.message || "Transaction failed");
    }
  };

  // ── Success state ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ ...st.card, padding:"56px 40px", textAlign:"center" }}>
        <div style={{ ...st.iconBox, margin:"0 auto 16px", width:56, height:56 }}>
          <ShieldCheck size={26} color="var(--accent)" />
        </div>
        <h3 style={{ fontSize:22, fontWeight:700, letterSpacing:"-.03em", marginBottom:8 }}>Proposal Created!</h3>
        <p style={{ color:"var(--td)", fontSize:14, lineHeight:1.7 }}>
          Your proposal is live on-chain. Community voting has begun.
        </p>
      </div>
    );
  }

  return (
    <div style={st.card}>
      {/* Header */}
      <div style={st.cardHeader}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={st.iconBox}><Terminal size={20} color="var(--accent)" /></div>
          <div>
            <div className="tag" style={{ marginBottom:4 }}>GOVERNANCE ACTION</div>
            <h2 style={{ fontSize:20, fontWeight:700, letterSpacing:"-.03em" }}>Create Proposal</h2>
          </div>
        </div>
        <div style={st.reqNote}>
          <Info size={11} color="var(--td)" />
          <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--td)" }}>100 USDC · 6H VOTE · 24H LOCK</span>
        </div>
      </div>

      <div style={st.body}>

        {/* Step 1: Category */}
        <div style={st.step}>
          <div style={st.stepLabel}><span style={st.stepNum}>1</span>Choose Category</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:8 }}>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const sel  = selectedCat?.id === cat.id;
              return (
                <button key={cat.id} onClick={() => handleCatSelect(cat)} style={{
                  padding:"14px 12px", borderRadius:10, border:`1px solid ${sel ? cat.border : "rgba(255,255,255,.08)"}`,
                  background: sel ? cat.bg : "transparent", cursor:"pointer",
                  transition:"all .18s", textAlign:"left",
                  boxShadow: sel ? `0 0 18px ${cat.bg}` : "none",
                }}>
                  <Icon size={16} color={sel ? cat.accent : "var(--td)"} style={{ marginBottom:8 }} />
                  <div style={{ fontSize:13, fontWeight:600, color: sel ? "#f0ede8" : "var(--td)", marginBottom:2 }}>{cat.label}</div>
                  <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", textTransform:"uppercase", letterSpacing:".06em" }}>{cat.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Template */}
        {selectedCat && (
          <div style={st.step} className="fade-in">
            <div style={st.stepLabel}><span style={st.stepNum}>2</span>Select Action</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {selectedCat.templates.map(key => {
                const t   = PROPOSAL_TEMPLATES[key];
                const sel = selectedTpl === key;
                const pm  = POOL_META[key];
                return t ? (
                  <button key={key} onClick={() => handleTplSelect(key)} style={{
                    padding:"13px 16px", borderRadius:9, border:`1px solid ${sel ? "rgba(181,212,168,.35)" : "rgba(255,255,255,.07)"}`,
                    background: sel ? "rgba(181,212,168,.07)" : "transparent",
                    cursor:"pointer", transition:"all .18s", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center",
                  }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color: sel ? "#f0ede8" : "var(--td)", marginBottom: pm ? 2 : 0 }}>{t.label}</div>
                      {pm && <div style={{ fontFamily:"var(--mono)", fontSize:9, color: pm.color, letterSpacing:".06em" }}>{pm.hint.toUpperCase()}</div>}
                    </div>
                    {sel && <div className="ld" style={{ width:7, height:7 }} />}
                  </button>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Step 3: Parameters */}
        {template && template.argFields.length > 0 && (
          <div style={st.step} className="fade-in">
            <div style={st.stepLabel}><span style={st.stepNum}>3</span>Set Parameters</div>

            {/* Rate presets */}
            {selectedTpl?.includes("RISK_RATES") && (
              <div style={{ padding:"14px", background:"rgba(181,212,168,.04)", border:"1px solid rgba(181,212,168,.15)", borderRadius:10, marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                  <Info size={11} color="var(--accent)" />
                  <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--accent)", letterSpacing:".08em" }}>
                    RATE GUIDE: 100 BPS = 1% · ANNUAL RATES PRORATED BY DURATION
                  </span>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {[
                    { label:"Conservative", base:300,  max:800  },
                    { label:"Standard",     base:700,  max:1500 },
                    { label:"Aggressive",   base:1200, max:2500 },
                  ].map(p => (
                    <Preset key={p.label} {...p} onPick={() => {
                      handleChange("baseRate", p.base);
                      handleChange("maxRate", p.max);
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Fee guide */}
            {selectedTpl === "SET_PLATFORM_FEE" && (
              <div style={{ padding:"14px", background:"rgba(196,168,212,.05)", border:"1px solid rgba(196,168,212,.15)", borderRadius:10, marginBottom:14, fontFamily:"var(--mono)", fontSize:10, color:"var(--td)", lineHeight:1.7 }}>
                Current default: 200 bps (2%). Maximum: 1000 bps (10%). Elite users get 50 bps discount.
              </div>
            )}

            {/* Borrowing limits guide */}
            {selectedTpl === "UPDATE_BORROWING_LIMITS" && (
              <div style={{ padding:"14px", background:"rgba(168,196,212,.05)", border:"1px solid rgba(168,196,212,.15)", borderRadius:10, marginBottom:14, fontFamily:"var(--mono)", fontSize:10, color:"var(--td)", lineHeight:1.7 }}>
                Enter values in USDC. Must be ascending: Low &lt; Med &lt; High.
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {template.argFields.map(f => (
                <Field key={f.name} {...f} value={fields[f.name] || ""} onChange={handleChange} />
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Description */}
        {selectedTpl && (
          <div style={st.step} className="fade-in">
            <div style={st.stepLabel}>
              <span style={st.stepNum}>{template?.argFields.length > 0 ? "4" : "3"}</span>
              Proposal Description
            </div>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describe why this change benefits the protocol..."
              style={{
                width:"100%", height:96, background:"rgba(0,0,0,.4)",
                border:"1px solid rgba(255,255,255,.1)", borderRadius:9,
                padding:"12px 14px", color:"#f0ede8", fontSize:13,
                fontFamily:"'DM Sans',sans-serif", outline:"none",
                resize:"none", boxSizing:"border-box", lineHeight:1.6,
                transition:"border-color .2s",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(181,212,168,.4)"}
              onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,.1)"}
            />
            <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", marginTop:4 }}>
              THIS DESCRIPTION IS STORED ON-CHAIN WITH THE PROPOSAL
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"12px 14px", background:"rgba(232,112,112,.07)", border:"1px solid rgba(232,112,112,.2)", borderRadius:9, marginTop:4 }}>
            <AlertTriangle size={14} color="#e87070" style={{ flexShrink:0, marginTop:1 }} />
            <span style={{ fontSize:13, color:"#e87070", lineHeight:1.5 }}>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={loading || !selectedTpl}
          className="btn-p"
          style={{ width:"100%", justifyContent:"center", padding:"15px", fontSize:14, fontWeight:700, marginTop:8, letterSpacing:".02em" }}
        >
          {loading ? (
            <div style={{ width:16, height:16, border:"2px solid rgba(10,21,10,.3)", borderTopColor:"#0a150a", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
          ) : (
            <><ShieldCheck size={16} />CREATE PROPOSAL ON-CHAIN</>
          )}
        </button>

        <div style={{ textAlign:"center", fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", marginTop:8 }}>
          REQUIRES 100 USDC + TRUST ≥ 500 · 6H VOTING WINDOW · YES VOTES &gt; NO VOTES
        </div>
      </div>

      <style>{`
        .fade-in{animation:fadeIn .25s ease forwards;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
};

const st = {
  card:       { background:"#1a1a1a", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, overflow:"hidden" },
  cardHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"24px 28px", borderBottom:"1px solid rgba(255,255,255,.06)", flexWrap:"wrap", gap:12 },
  iconBox:    { width:40, height:40, borderRadius:10, background:"rgba(181,212,168,.1)", border:"1px solid rgba(181,212,168,.18)", display:"flex", alignItems:"center", justifyContent:"center" },
  reqNote:    { display:"flex", alignItems:"center", gap:5, padding:"6px 10px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:6 },
  body:       { padding:"24px 28px", display:"flex", flexDirection:"column", gap:24 },
  step:       { display:"flex", flexDirection:"column", gap:12 },
  stepLabel:  { display:"flex", alignItems:"center", gap:8, fontFamily:"var(--mono)", fontSize:10, color:"var(--td)", letterSpacing:".1em", textTransform:"uppercase" },
  stepNum:    { width:20, height:20, borderRadius:"50%", background:"rgba(181,212,168,.15)", border:"1px solid rgba(181,212,168,.25)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"var(--accent)" },
};

export default CreateProposal;