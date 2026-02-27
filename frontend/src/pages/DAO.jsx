import { useEffect, useState } from "react";
import { useDAO, PROPOSAL_TEMPLATES } from "../context/DAOContext";
import { useBlockchain } from "../context/BlockchainContext";
import ProposalCard from "../components/ProposalCard";
import CreateProposal from "../components/CreateProposal";
import Navbar from "../components/Navbar";
import {
  Users, Plus, Vote, ShieldCheck, LayoutGrid,
  Info, X, Activity, TrendingUp, CheckCircle, Clock,
  Zap, ArrowRight,
} from "lucide-react";

const DAO = () => {
  const {
    dao, getAllProposals, fetchProposalCount,
    getVotingPower, canCreateProposal, loading,
    getProposalStatus,
  } = useDAO();

  const { account } = useBlockchain();

  const [proposals, setProposals]       = useState([]);
  const [votingPower, setVotingPower]   = useState("0");
  const [propEligibility, setPropElig]  = useState(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [filter, setFilter]             = useState("All");
  const [refreshing, setRefreshing]     = useState(false);

  const loadDAO = async () => {
    if (!dao) return;
    setRefreshing(true);
    try {
      await fetchProposalCount();
      const list = await getAllProposals();
      setProposals(list);
      if (account) {
        const power    = await getVotingPower(account);
        const eligible = await canCreateProposal(account);
        setVotingPower(power);
        setPropElig(eligible);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDAO(); }, [account, dao]);

  const activeCount   = proposals.filter(p => getProposalStatus(p) === "ACTIVE").length;
  const passedCount   = proposals.filter(p => ["QUEUED","EXECUTABLE","EXECUTED"].includes(getProposalStatus(p))).length;
  const executedCount = proposals.filter(p => p.executed).length;

  const filtered = filter === "All"
    ? proposals
    : proposals.filter(p => {
        const s = getProposalStatus(p);
        if (filter === "Active")   return s === "ACTIVE";
        if (filter === "Passed")   return ["QUEUED","EXECUTABLE"].includes(s);
        if (filter === "Executed") return s === "EXECUTED";
        if (filter === "Rejected") return s === "DEFEATED";
        return true;
      });

  const canPropose = propEligibility?.eligible ?? false;

  return (
    <div style={st.root}>
      <style>{css}</style>
      <div style={st.noise} className="noise" />

      {/* Ticker */}
      <div style={st.ticker}>
        <div className="ticker-w">
          <div className="ticker-i">
            {[...Array(2)].map((_, ri) =>
              ["TrustForge DAO", `Active Proposals: ${activeCount}`,
               "Community Governed", `Total Proposals: ${proposals.length}`,
               "On-Chain Execution", "6h Voting Window · 24h Timelock"
              ].map((item, i) => (
                <span key={`${ri}-${i}`} className="t-item">
                  <span className="t-dot" />{item}
                </span>
              ))
            )}
          </div>
        </div>
        <div style={st.tickerLive}>
          <div className="ld" style={{ width:6, height:6 }} />
          <span style={st.liveText}>LIVE</span>
        </div>
      </div>

      <Navbar />

      <main style={st.main}>

        {/* Hero */}
        <div style={{ marginBottom:52 }} className="fu">
          <div style={st.tagRow}>
            <span className="tag">GOVERNANCE MODULE</span>
            <div style={st.tagLine} />
          </div>
          <h1 style={st.pageTitle}>
            TrustForge<br />
            <em style={{ color:"var(--accent)", fontStyle:"italic", fontWeight:600 }}>DAO</em>
          </h1>
          <div style={st.titleUnderline} />
          <p style={st.pageDesc}>
            Community-governed protocol parameters. Every interest rate, every borrowing limit — decided by USDC holders on-chain.
          </p>

          {/* Voting power + CTA row */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginTop:32 }}>
            <div style={st.vpCard}>
              <div style={st.iconBox}><Vote size={18} color="var(--accent)" /></div>
              <div>
                <div style={st.miniLabel}>VOTING POWER</div>
                <div style={{ fontSize:22, fontWeight:700, letterSpacing:"-.03em" }}>
                  {parseFloat(votingPower).toFixed(2)} <span style={{ color:"var(--accent)", fontSize:16 }}>USDC</span>
                </div>
              </div>
            </div>

            {/* ── CTA: only USDC gate, no trust score badge ── */}
            {canPropose ? (
              <button className="btn-p" style={{ padding:"14px 28px", fontSize:14 }} onClick={() => setShowCreate(true)}>
                <Plus size={15} /> Create Proposal
              </button>
            ) : (
              <div style={st.ineligBadge}>
                <ShieldCheck size={14} color="var(--td)" />
                <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--td)" }}>
                  {/* Only show USDC or cooldown reason — trust score removed */}
                  {propEligibility?.reason || "Need 100 USDC to create a proposal"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div style={st.statsStrip} className="fu">
          {[
            { icon: Activity,    label:"Total",    value:proposals.length, color:"var(--accent)" },
            { icon: Clock,       label:"Active",   value:activeCount,      color:"#e8c96d"       },
            { icon: TrendingUp,  label:"Passed",   value:passedCount,      color:"#b5d4a8"       },
            { icon: CheckCircle, label:"Executed", value:executedCount,    color:"#c4a8d4"       },
          ].map(({ icon: Icon, label, value, color }, i) => (
            <div key={label} style={{ ...st.statCell, borderRight: i < 3 ? "1px solid var(--b)" : "none" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <Icon size={14} color="var(--td)" strokeWidth={1.5} />
                <div className="ld" style={{ width:6, height:6, opacity: label==="Active" && activeCount>0 ? 1 : 0 }} />
              </div>
              <div style={{ fontSize:32, fontWeight:700, letterSpacing:"-.04em", color, fontFamily:"var(--mono)", marginBottom:3 }}>{value}</div>
              <div style={{ fontSize:11, color:"var(--td)" }}>{label} Proposals</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28, flexWrap:"wrap" }} className="fu">
          <LayoutGrid size={14} color="var(--td)" />
          {["All","Active","Passed","Executed","Rejected"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding:"6px 14px", borderRadius:99,
                border:`1px solid ${filter===f ? "rgba(181,212,168,.4)" : "rgba(255,255,255,.08)"}`,
                background: filter===f ? "rgba(181,212,168,.1)" : "transparent",
                color: filter===f ? "var(--accent)" : "var(--td)",
                fontFamily:"var(--mono)", fontSize:10, letterSpacing:".08em",
                cursor:"pointer", transition:"all .2s",
              }}
            >{f.toUpperCase()}</button>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: refreshing ? "#e8c96d" : "var(--accent)", opacity: refreshing ? 1 : 0.7 }} className={refreshing ? "" : "ld"} />
            <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--td)" }}>
              {refreshing ? "SYNCING..." : "LIVE ON CHAIN"}
            </span>
          </div>
        </div>

        {/* Proposals grid */}
        <div style={st.proposalsGrid} className="fu">
          {filtered.length === 0 ? (
            <div style={{ gridColumn:"1/-1", ...st.emptyState }}>
              <Info size={36} color="var(--td)" style={{ marginBottom:14, opacity:.4 }} />
              <div style={{ fontWeight:600, marginBottom:6 }}>
                {filter === "All" ? "No governance proposals yet." : `No ${filter.toLowerCase()} proposals.`}
              </div>
              <div style={{ color:"var(--td)", fontSize:13, marginBottom:20 }}>
                {filter === "All" ? "Be the first to shape the protocol." : ""}
              </div>
              {filter === "All" && canPropose && (
                <button className="btn-p" onClick={() => setShowCreate(true)}>
                  Create First Proposal <ArrowRight size={13} />
                </button>
              )}
            </div>
          ) : (
            filtered.map(proposal => (
              <ProposalCard key={proposal.id} proposal={proposal} onActionComplete={loadDAO} />
            ))
          )}
        </div>
      </main>

      {/* Create Proposal Modal */}
      {showCreate && (
        <div style={st.modalOverlay} className="fu">
          <div style={st.modalInner} className="fu-up">
            <button onClick={() => setShowCreate(false)} style={st.closeBtn}>
              <X size={15} />
            </button>
            <CreateProposal onCreated={() => { setShowCreate(false); loadDAO(); }} />
          </div>
        </div>
      )}

      <footer style={st.footer}>
        <div style={st.footerInner}>
          <span style={{ fontSize:12, color:"var(--td)" }}>TrustForge DAO · On-Chain Governance · Community Driven</span>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div className="ld" style={{ width:6, height:6 }} />
            <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--accent)" }}>ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const st = {
  root:          { fontFamily:"'DM Sans','Helvetica Neue',sans-serif", background:"#111", minHeight:"100vh", color:"#f0ede8", overflowX:"hidden" },
  noise:         { position:"fixed", inset:0, pointerEvents:"none", zIndex:999, opacity:.018 },
  main:          { maxWidth:1200, margin:"0 auto", padding:"52px 24px 80px" },
  ticker:        { background:"#0c0c0c", borderBottom:"1px solid rgba(255,255,255,.06)", height:34, display:"flex", alignItems:"center" },
  tickerLive:    { padding:"0 14px", borderLeft:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:7, flexShrink:0 },
  liveText:      { fontFamily:"var(--mono)", fontSize:10, color:"var(--accent)", letterSpacing:".08em" },
  tagRow:        { display:"flex", alignItems:"center", gap:14, marginBottom:14 },
  tagLine:       { flex:1, height:1, background:"rgba(255,255,255,.06)" },
  pageTitle:     { fontSize:52, fontWeight:700, letterSpacing:"-.04em", lineHeight:1.05, marginBottom:12 },
  titleUnderline:{ width:44, height:2, background:"var(--accent)", borderRadius:2, marginBottom:16 },
  pageDesc:      { fontSize:15, color:"var(--td)", lineHeight:1.75, maxWidth:500 },
  vpCard:        { display:"flex", alignItems:"center", gap:14, padding:"16px 22px", background:"#1a1a1a", border:"1px solid rgba(255,255,255,.08)", borderRadius:12 },
  iconBox:       { width:40, height:40, borderRadius:10, background:"rgba(181,212,168,.1)", border:"1px solid rgba(181,212,168,.18)", display:"flex", alignItems:"center", justifyContent:"center" },
  miniLabel:     { fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", letterSpacing:".1em", marginBottom:3 },
  ineligBadge:   { display:"flex", alignItems:"center", gap:8, padding:"14px 22px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:12 },
  statsStrip:    { display:"grid", gridTemplateColumns:"repeat(4,1fr)", background:"#1a1a1a", border:"1px solid rgba(255,255,255,.06)", borderRadius:14, marginBottom:32, overflow:"hidden" },
  statCell:      { padding:"24px 20px" },
  proposalsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(360px, 1fr))", gap:16 },
  emptyState:    { textAlign:"center", padding:"64px 24px", background:"rgba(255,255,255,.02)", borderRadius:14, border:"1px dashed rgba(255,255,255,.07)" },
  modalOverlay:  { position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px", backdropFilter:"blur(12px)", background:"rgba(0,0,0,.7)", overflowY:"auto" },
  modalInner:    { position:"relative", width:"100%", maxWidth:640, margin:"32px auto" },
  closeBtn:      { position:"absolute", top:-12, right:-12, width:36, height:36, background:"#1a1a1a", border:"1px solid rgba(255,255,255,.1)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", zIndex:10, color:"#f0ede8" },
  footer:        { background:"#1a1a1a", borderTop:"1px solid rgba(255,255,255,.06)", padding:"24px 0" },
  footerInner:   { maxWidth:1200, margin:"0 auto", padding:"0 24px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
  :root{--bg:#111;--bg2:#1a1a1a;--bg3:#222;--accent:#b5d4a8;--accent2:#8fc47f;--b:rgba(255,255,255,0.06);--b2:rgba(255,255,255,0.1);--t:#f0ede8;--tm:#999;--td:#666;--mono:'DM Mono',monospace;}
  *{box-sizing:border-box;}
  .noise{background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:150px;}
  .btn-p{background:var(--accent);color:#0a150a;border:none;padding:11px 22px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .22s;font-family:'DM Sans',sans-serif;}
  .btn-p:hover{background:#8fc47f;transform:translateY(-1px);box-shadow:0 6px 24px rgba(181,212,168,.25);}
  .btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none;}
  .tag{font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--accent);background:rgba(181,212,168,.08);border:1px solid rgba(181,212,168,.18);padding:3px 8px;border-radius:4px;display:inline-block;}
  .fu{animation:fu .65s ease forwards;}
  .fu-up{animation:fu-up .45s ease forwards;}
  .ld{width:7px;height:7px;background:var(--accent);border-radius:50%;animation:pdot 2s infinite;position:relative;flex-shrink:0;}
  .ld::after{content:'';position:absolute;inset:-3px;border:1px solid var(--accent);border-radius:50%;animation:pring 2s infinite;}
  .ticker-w{overflow:hidden;white-space:nowrap;flex:1;}
  .ticker-i{display:inline-flex;animation:ticker 28s linear infinite;}
  .t-item{display:inline-flex;align-items:center;gap:8px;padding:0 24px;font-family:var(--mono);font-size:10px;color:var(--td);}
  .t-dot{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.12);}
  @keyframes fu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fu-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  @keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.75)}}
  @keyframes pring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}
`;

export default DAO;