import { useState } from "react";
import { useDAO } from "../context/DAOContext";
import { Interface } from "ethers";
import TrustForgeABI from "../abis/TrustForge.json";
import {
  Vote, Clock, ExternalLink, CheckCircle, XCircle,
  Play, TrendingUp, Settings, DollarSign, Lock, Unlock,
  AlertTriangle, ChevronDown, ChevronUp, ShieldCheck, Zap,
} from "lucide-react";

const iface = new Interface(TrustForgeABI.abi || TrustForgeABI);

// ── Decode calldata ────────────────────────────────────────────────────────
const decodeAction = (data) => {
  try {
    const decoded = iface.parseTransaction({ data });
    if (!decoded) return null;
    const { name, args } = decoded;

    if (name === "updatePoolInterestRates") {
      const pools  = { 0:"Low Risk", 1:"Medium Risk", 2:"High Risk" };
      const colors = { 0:"#b5d4a8", 1:"#e8c96d", 2:"#e87070" };
      const n = Number(args[0]);
      return {
        icon: TrendingUp, accentColor: colors[n],
        title: `${pools[n] ?? "Unknown"} Pool Interest Rates`,
        category: "Interest Rate",
        details: [
          { label:"Pool",      value: pools[n] ?? `Pool ${n}` },
          { label:"Base Rate", value: `${Number(args[1])}bps (${(Number(args[1])/100).toFixed(1)}%)` },
          { label:"Max Rate",  value: `${Number(args[2])}bps (${(Number(args[2])/100).toFixed(1)}%)` },
        ],
      };
    }
    if (name === "updateBorrowingLimits") {
      const fmt = (v) => `${(Number(v)/1e6).toFixed(2)} USDC`; // 6-dec USDC
      return {
        icon: DollarSign, accentColor: "#a8c4d4",
        title: "Update Borrowing Limits",
        category: "Borrowing",
        details: [
          { label:"Low Trust",    value: fmt(args[0]) },
          { label:"Medium Trust", value: fmt(args[1]) },
          { label:"High Trust",   value: fmt(args[2]) },
        ],
      };
    }
    if (name === "setPlatformFee") {
      return {
        icon: Settings, accentColor: "#c4a8d4",
        title: "Set Platform Fee",
        category: "Platform",
        details: [{ label:"Fee", value:`${Number(args[0])}bps (${(Number(args[0])/100).toFixed(1)}%)` }],
      };
    }
    if (name === "updateVouchParameters") {
      return {
        icon: ShieldCheck, accentColor: "#d4c4a8",
        title: "Update Vouch Parameters",
        category: "Social Trust",
        details: [
          { label:"Penalty / Default", value:`-${Number(args[0])} pts` },
          { label:"Max Vouches",        value:`${Number(args[1])} per user` },
        ],
      };
    }
    if (name === "setAdminWallet") {
      return {
        icon: Settings, accentColor: "#a8c4d4",
        title: "Change Admin Wallet",
        category: "Admin",
        details: [{ label:"New Wallet", value:`${args[0].slice(0,6)}…${args[0].slice(-4)}` }],
      };
    }
    if (name === "setMinInterestAmount") {
      return {
        icon: Zap, accentColor: "#d4c4a8",
        title: "Set Minimum Interest",
        category: "Platform",
        details: [{ label:"Min Interest", value:`${(Number(args[0])/1e6).toFixed(6)} USDC` }],
      };
    }
    if (name === "setAutoLimitEnabled") {
      return {
        icon: Settings, accentColor: "#c4a8d4",
        title: "Toggle Auto Limits",
        category: "Platform",
        details: [{ label:"Enabled", value: String(args[0]) }],
      };
    }
    if (name === "pause") {
      return {
        icon: Lock, accentColor: "#e87070",
        title: "Pause Protocol",
        category: "Emergency",
        details: [{ label:"Action", value:"Halt all operations" }],
      };
    }
    if (name === "unpause") {
      return {
        icon: Unlock, accentColor: "#b5d4a8",
        title: "Resume Protocol",
        category: "Emergency",
        details: [{ label:"Action", value:"Resume normal operations" }],
      };
    }
    return {
      icon: Settings, accentColor: "#666",
      title: `Execute ${name}()`,
      category: "Custom",
      details: [],
    };
  } catch {
    return null;
  }
};

// ── Status chip style ──────────────────────────────────────────────────────
const statusStyle = (s) => {
  const map = {
    ACTIVE:     { bg:"rgba(232,201,109,.1)", border:"rgba(232,201,109,.3)", color:"#e8c96d" },
    QUEUED:     { bg:"rgba(168,196,212,.1)", border:"rgba(168,196,212,.3)", color:"#a8c4d4" },
    EXECUTABLE: { bg:"rgba(181,212,168,.1)", border:"rgba(181,212,168,.3)", color:"#b5d4a8" },
    EXECUTED:   { bg:"rgba(196,168,212,.1)", border:"rgba(196,168,212,.3)", color:"#c4a8d4" },
    DEFEATED:   { bg:"rgba(232,112,112,.1)", border:"rgba(232,112,112,.3)", color:"#e87070" },
    CANCELLED:  { bg:"rgba(100,100,100,.1)", border:"rgba(100,100,100,.3)", color:"#666"    },
  };
  return map[s] || map.CANCELLED;
};

// ── Vote progress bar ──────────────────────────────────────────────────────
const VoteBar = ({ yes, no }) => {
  const total  = parseFloat(yes) + parseFloat(no);
  const yesPct = total > 0 ? (parseFloat(yes) / total) * 100 : 50;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"#b5d4a8", fontWeight:600 }}>
          {parseFloat(yes).toFixed(2)} YES
        </span>
        <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"#e87070", fontWeight:600 }}>
          {parseFloat(no).toFixed(2)} NO
        </span>
      </div>
      <div style={{ height:5, background:"rgba(255,255,255,.06)", borderRadius:99, overflow:"hidden" }}>
        <div style={{
          height:"100%", borderRadius:99, transition:"width .6s ease",
          width:`${yesPct}%`,
          background:"linear-gradient(90deg,#6daf5c,#b5d4a8)",
          boxShadow:"0 0 8px rgba(181,212,168,.3)",
        }} />
      </div>
      {total > 0 && (
        <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", marginTop:4, textAlign:"right" }}>
          {yesPct.toFixed(1)}% IN FAVOUR
        </div>
      )}
    </div>
  );
};

// ── Timer ──────────────────────────────────────────────────────────────────
const fmt = (sec) => {
  if (sec <= 0) return "Ended";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0)  return `${h}h ${m}m`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
};

// ── Main component ─────────────────────────────────────────────────────────
const ProposalCard = ({ proposal, onActionComplete }) => {
  const {
    vote, executeProposal,
    getProposalStatus, getTimeRemaining,
    isVotingActive, isTimelockElapsed,
    loading,
  } = useDAO();

  const [expanded, setExpanded] = useState(false);
  const [voted,    setVoted]    = useState(false);
  const [txError,  setTxError]  = useState("");
  const [txBusy,   setTxBusy]  = useState(false);

  const stateLabel = getProposalStatus(proposal);  // e.g. "ACTIVE", "EXECUTABLE"
  const timeLeft   = getTimeRemaining(proposal.endTime);
  const action     = decodeAction(proposal.data);
  const sty        = statusStyle(stateLabel);
  const Icon       = action?.icon ?? Settings;
  const accent     = action?.accentColor ?? "#666";

  const votingOpen  = isVotingActive(proposal);
  const canExecute  = stateLabel === "EXECUTABLE" && isTimelockElapsed(proposal) && !proposal.executed;
  const showVote    = votingOpen && !voted;

  const handleVote = async (support) => {
    setTxError(""); setTxBusy(true);
    try {
      await vote(proposal.id, support);
      setVoted(true);
      onActionComplete?.();
    } catch (err) {
      setTxError(err?.reason || err?.message || "Vote failed");
    } finally { setTxBusy(false); }
  };

  const handleExecute = async () => {
    setTxError(""); setTxBusy(true);
    try {
      await executeProposal(proposal.id);
      onActionComplete?.();
    } catch (err) {
      setTxError(err?.reason || err?.message || "Execution failed");
    } finally { setTxBusy(false); }
  };

  return (
    <div style={st.card} className="fc-card">
      {/* Accent top bar */}
      <div style={{ height:2, background:`linear-gradient(90deg, ${accent}88, transparent)` }} />

      <div style={{ padding:"22px 22px 0" }}>

        {/* Header row */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${accent}14`, border:`1px solid ${accent}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon size={17} color={accent} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", letterSpacing:".08em", marginBottom:2 }}>
                {(action?.category ?? "PROPOSAL").toUpperCase()} #{proposal.id}
              </div>
              <div style={{ fontSize:14, fontWeight:700, letterSpacing:"-.02em", lineHeight:1.3 }}>
                {action?.title ?? "Unknown Action"}
              </div>
            </div>
          </div>

          <div style={{
            ...st.chip,
            background: sty.bg,
            border:`1px solid ${sty.border}`,
            color: sty.color,
          }}>
            {stateLabel}
          </div>
        </div>

        {/* Action details */}
        {action?.details?.length > 0 && (
          <div style={{ background:`${accent}08`, border:`1px solid ${accent}18`, borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
            {action.details.map((d, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: i < action.details.length-1 ? 7 : 0 }}>
                <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", letterSpacing:".06em", textTransform:"uppercase" }}>{d.label}</span>
                <span style={{ fontFamily:"var(--mono)", fontSize:11, fontWeight:600, color: accent }}>{d.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", padding:"0 0 10px", fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", letterSpacing:".06em", textTransform:"uppercase" }}
        >
          {expanded ? <ChevronUp size={11} color="var(--td)" /> : <ChevronDown size={11} color="var(--td)" />}
          {expanded ? "HIDE" : "SHOW"} DETAILS
        </button>

        {expanded && (
          <div style={{ marginBottom:14, padding:"12px 13px", background:"rgba(0,0,0,.3)", border:"1px solid rgba(255,255,255,.05)", borderRadius:9 }} className="fade-in">
            {[
              { label:"Target",   value: (
                <a href={`https://sepolia.etherscan.io/address/${proposal.target}`}
                   target="_blank" rel="noopener noreferrer"
                   style={{ color:"var(--accent)", textDecoration:"none", display:"flex", alignItems:"center", gap:3 }}>
                  {proposal.target.slice(0,6)}…{proposal.target.slice(-4)}
                  <ExternalLink size={10} />
                </a>
              )},
              { label:"Proposer",  value: `${proposal.proposer.slice(0,6)}…${proposal.proposer.slice(-4)}` },
              { label:"End Time",  value: new Date(proposal.endTime * 1000).toLocaleString() },
              { label:"Timelock",  value: new Date(proposal.executableAfter * 1000).toLocaleString() },
              { label:"Executed",  value: proposal.executed ? "Yes ✓" : "No" },
            ].map((row, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: i < 4 ? 6 : 0 }}>
                <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--td)", letterSpacing:".06em" }}>{row.label.toUpperCase()}</span>
                <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"#f0ede8" }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Vote bar */}
        <div style={{ marginBottom:14 }}>
          <VoteBar yes={proposal.yesVotes} no={proposal.noVotes} />
        </div>

        {/* Timer */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:18 }}>
          <Clock size={11} color="var(--td)" />
          <span style={{
            fontFamily:"var(--mono)", fontSize:10,
            color: stateLabel === "ACTIVE" && timeLeft < 3600 ? "#e8c96d" : "var(--td)",
          }}>
            {stateLabel === "ACTIVE"
              ? `${fmt(timeLeft)} remaining`
              : `Ended ${new Date(proposal.endTime * 1000).toLocaleDateString()}`}
          </span>
        </div>

        {/* Error */}
        {txError && (
          <div style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"10px 12px", background:"rgba(232,112,112,.07)", border:"1px solid rgba(232,112,112,.2)", borderRadius:8, marginBottom:14 }}>
            <AlertTriangle size={13} color="#e87070" style={{ flexShrink:0, marginTop:1 }} />
            <span style={{ fontSize:12, color:"#e87070", lineHeight:1.5, wordBreak:"break-word" }}>{txError}</span>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div style={{ padding:"0 22px 22px" }}>
        {showVote ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button
              disabled={txBusy || loading}
              onClick={() => handleVote(true)}
              style={st.voteYes}
              onMouseEnter={e => !txBusy && (e.currentTarget.style.background = "rgba(181,212,168,.15)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(181,212,168,.07)")}
            >
              {txBusy ? <div style={st.spinner} /> : <><CheckCircle size={13} /> VOTE YES</>}
            </button>
            <button
              disabled={txBusy || loading}
              onClick={() => handleVote(false)}
              style={st.voteNo}
              onMouseEnter={e => !txBusy && (e.currentTarget.style.background = "rgba(232,112,112,.15)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(232,112,112,.07)")}
            >
              {txBusy ? <div style={st.spinner} /> : <><XCircle size={13} /> VOTE NO</>}
            </button>
          </div>
        ) : voted && votingOpen ? (
          <div style={st.statusBanner}>
            <CheckCircle size={13} color="var(--accent)" />
            <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--accent)", letterSpacing:".06em" }}>
              YOU VOTED ON THIS PROPOSAL
            </span>
          </div>
        ) : canExecute ? (
          <button
            disabled={txBusy || loading}
            onClick={handleExecute}
            style={st.executeBtn}
            onMouseEnter={e => !txBusy && (e.currentTarget.style.boxShadow = "0 0 24px rgba(181,212,168,.25)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 10px rgba(181,212,168,.1)")}
          >
            {txBusy ? <div style={st.spinner} /> : <><Play size={13} style={{ fill:"#0a150a" }} /> EXECUTE ON-CHAIN</>}
          </button>
        ) : (
          <div style={st.statusBanner}>
            <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--td)", letterSpacing:".06em" }}>
              {proposal.executed ? "✓ EXECUTED & FINALIZED" : "VOTING CLOSED"}
            </span>
          </div>
        )}
      </div>

      <style>{`
        .fc-card{transition:all .25s;}
        .fc-card:hover{border-color:rgba(255,255,255,.12)!important;transform:translateY(-2px);}
        .fade-in{animation:fadeIn .2s ease forwards;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        button:disabled{opacity:.45!important;cursor:not-allowed!important;}
      `}</style>
    </div>
  );
};

const st = {
  card:        { background:"#1a1a1a", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column" },
  chip:        { padding:"4px 9px", borderRadius:99, fontFamily:"var(--mono)", fontSize:9, fontWeight:700, letterSpacing:".08em", flexShrink:0, whiteSpace:"nowrap" },
  voteYes:     { display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"12px", borderRadius:9, border:"1px solid rgba(181,212,168,.25)", background:"rgba(181,212,168,.07)", color:"#b5d4a8", fontFamily:"var(--mono)", fontSize:10, fontWeight:700, letterSpacing:".06em", cursor:"pointer", transition:"background .2s" },
  voteNo:      { display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"12px", borderRadius:9, border:"1px solid rgba(232,112,112,.25)", background:"rgba(232,112,112,.07)", color:"#e87070", fontFamily:"var(--mono)", fontSize:10, fontWeight:700, letterSpacing:".06em", cursor:"pointer", transition:"background .2s" },
  executeBtn:  { width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"13px", borderRadius:9, background:"var(--accent)", border:"none", color:"#0a150a", fontFamily:"var(--mono)", fontSize:11, fontWeight:700, letterSpacing:".06em", cursor:"pointer", transition:"all .2s", boxShadow:"0 0 10px rgba(181,212,168,.1)" },
  statusBanner:{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"12px", background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:9 },
  spinner:     { width:14, height:14, border:"2px solid rgba(10,21,10,.25)", borderTopColor:"#0a150a", borderRadius:"50%", animation:"spin .7s linear infinite" },
};

export default ProposalCard;