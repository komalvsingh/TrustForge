import { useState } from "react";
import { useDAO } from "../context/DAOContext";
import { Interface } from "ethers";
import TrustForgeABI from "../abis/TrustForge.json";
import {
  Vote, Clock, ExternalLink, CheckCircle,
  XCircle, Play, TrendingUp, Settings,
  DollarSign, Lock, Unlock, AlertTriangle,
  ChevronDown, ChevronUp,
} from "lucide-react";

const iface = new Interface(TrustForgeABI.abi || TrustForgeABI);

// ── Decode calldata into human-readable form ───────────────────────────────
const decodeAction = (data) => {
  try {
    const decoded = iface.parseTransaction({ data });
    const name    = decoded.name;
    const args    = decoded.args;

    if (name === "updatePoolInterestRates") {
      const poolNames = { 0: "Low Risk", 1: "Medium Risk", 2: "High Risk" };
      const poolNum   = Number(args[0]);
      return {
        type:    "interest",
        title:   `Update ${poolNames[poolNum] ?? "Unknown"} Pool Interest Rates`,
        icon:    "TrendingUp",
        color:   poolNum === 0 ? "green" : poolNum === 1 ? "yellow" : "red",
        details: [
          { label: "Pool",      value: poolNames[poolNum] ?? `Pool ${poolNum}` },
          { label: "Base Rate", value: `${Number(args[1])} bps (${(Number(args[1]) / 100).toFixed(1)}%)` },
          { label: "Max Rate",  value: `${Number(args[2])} bps (${(Number(args[2]) / 100).toFixed(1)}%)` },
        ],
      };
    }

    if (name === "updateTrustParameters") {
      return {
        type:    "trust",
        title:   "Update Trust Parameters",
        icon:    "Settings",
        color:   "purple",
        details: [
          { label: "Increase / Repayment", value: `+${Number(args[0])} points` },
          { label: "Decrease / Default",   value: `-${Number(args[1])} points` },
          { label: "Voucher Penalty",       value: `-${Number(args[2])} points` },
        ],
      };
    }

    if (name === "updateBorrowingLimits") {
      const fmt = (wei) => `${(Number(wei) / 1e18).toFixed(2)} ETH`;
      return {
        type:    "limits",
        title:   "Update Borrowing Limits",
        icon:    "DollarSign",
        color:   "green",
        details: [
          { label: "Low Trust Limit",    value: fmt(args[0]) },
          { label: "Medium Trust Limit", value: fmt(args[1]) },
          { label: "High Trust Limit",   value: fmt(args[2]) },
        ],
      };
    }

    if (name === "pause") {
      return {
        type:    "emergency",
        title:   "Pause Protocol",
        icon:    "Lock",
        color:   "red",
        details: [{ label: "Action", value: "Halt all borrowing & lending operations" }],
      };
    }

    if (name === "unpause") {
      return {
        type:    "emergency",
        title:   "Unpause Protocol",
        icon:    "Unlock",
        color:   "green",
        details: [{ label: "Action", value: "Resume normal protocol operations" }],
      };
    }

    // Fallback for unknown calls
    return {
      type:    "unknown",
      title:   `Execute ${name}()`,
      icon:    "Settings",
      color:   "gray",
      details: [],
    };
  } catch {
    return null;
  }
};

// ── Color helpers ──────────────────────────────────────────────────────────
const COLOR = {
  green:  { text: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20"  },
  yellow: { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  red:    { text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    },
  purple: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  blue:   { text: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20"   },
  gray:   { text: "text-gray-400",   bg: "bg-white/5",       border: "border-white/10"      },
};

const STATUS_STYLE = {
  Active:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  Passed:   "bg-green-500/10  text-green-400  border-green-500/30",
  Rejected: "bg-red-500/10    text-red-400    border-red-500/30",
  Executed: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

const ActionIcon = ({ name, className }) => {
  const icons = { TrendingUp, Settings, DollarSign, Lock, Unlock, AlertTriangle };
  const Icon  = icons[name] || Settings;
  return <Icon className={className} />;
};

// ── Vote progress bar ──────────────────────────────────────────────────────
const VoteBar = ({ yes, no }) => {
  const total   = Number(yes) + Number(no);
  const yesPct  = total > 0 ? (Number(yes) / total) * 100 : 50;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-green-400 font-bold">{parseFloat(yes).toFixed(2)} TFX YES</span>
        <span className="text-red-400   font-bold">{parseFloat(no).toFixed(2)} TFX NO</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
          style={{ width: `${yesPct}%` }}
        />
      </div>
      {total > 0 && (
        <p className="text-[10px] text-gray-500 mt-1 text-right">
          {yesPct.toFixed(1)}% in favour
        </p>
      )}
    </div>
  );
};

// ── Countdown ──────────────────────────────────────────────────────────────
const formatTime = (seconds) => {
  if (seconds <= 0) return "Ended";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m remaining`;
  if (m > 0) return `${m}m ${s}s remaining`;
  return `${s}s remaining`;
};

// ── Main component ─────────────────────────────────────────────────────────
const ProposalCard = ({ proposal, onActionComplete }) => {
  const { vote, executeProposal, getProposalStatus, getTimeRemaining, hasUserVoted, loading } = useDAO();

  const [expanded, setExpanded]   = useState(false);
  const [voted, setVoted]         = useState(false);
  const [txError, setTxError]     = useState("");

  const status   = getProposalStatus(proposal);
  const timeLeft = getTimeRemaining(proposal.endTime);
  const action   = decodeAction(proposal.data);
  const color    = COLOR[action?.color ?? "gray"];

  const canVote    = status === "Active" && !voted;
  const canExecute = status === "Passed" && !proposal.executed;

  const handleVote = async (support) => {
    setTxError("");
    try {
      await vote(proposal.id, support);
      setVoted(true);
      onActionComplete?.();
    } catch (err) {
      setTxError(err?.reason || err?.message || "Vote failed");
    }
  };

  const handleExecute = async () => {
    setTxError("");
    try {
      await executeProposal(proposal.id);
      onActionComplete?.();
    } catch (err) {
      setTxError(err?.reason || err?.message || "Execution failed");
    }
  };

  return (
    <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-all duration-400 flex flex-col">

      {/* Color accent bar */}
      <div className={`h-0.5 w-full ${color.bg.replace("bg-", "bg-gradient-to-r from-").replace("/10", "/60")} to-transparent`} />

      <div className="p-6 flex flex-col flex-1">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Action icon */}
            <div className={`w-10 h-10 ${color.bg} ${color.border} border rounded-xl flex items-center justify-center`}>
              <ActionIcon name={action?.icon ?? "Settings"} className={`w-5 h-5 ${color.text}`} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Proposal #{proposal.id}</p>
              <h3 className="font-black text-white text-base leading-tight">
                {action?.title ?? "Unknown Action"}
              </h3>
            </div>
          </div>

          {/* Status badge */}
          <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${STATUS_STYLE[status] ?? "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}>
            {status}
          </span>
        </div>

        {/* ── Action Details ─────────────────────────────────────────────── */}
        {action?.details?.length > 0 && (
          <div className={`mb-5 p-4 rounded-2xl ${color.bg} ${color.border} border`}>
            <div className="space-y-2">
              {action.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{d.label}</span>
                  <span className={`text-xs font-black ${color.text}`}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Expandable details ──────────────────────────────────────────── */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold hover:text-gray-300 transition-colors mb-4"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Hide" : "Show"} Details
        </button>

        {expanded && (
          <div className="mb-4 p-3 bg-black/30 rounded-xl border border-white/5 text-[11px] text-gray-500 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Target</span>
              <a
                href={`https://sepolia.etherscan.io/address/${proposal.target}`}
                target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1"
              >
                {proposal.target.slice(0,6)}…{proposal.target.slice(-4)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex justify-between">
              <span>End Time</span>
              <span className="text-gray-300">{new Date(proposal.endTime * 1000).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Executed</span>
              <span className={proposal.executed ? "text-purple-400" : "text-gray-500"}>
                {proposal.executed ? "Yes" : "No"}
              </span>
            </div>
          </div>
        )}

        {/* ── Vote Bar ───────────────────────────────────────────────────── */}
        <div className="mb-5">
          <VoteBar yes={proposal.yesVotes} no={proposal.noVotes} />
        </div>

        {/* ── Timer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-5 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span className={status === "Active" && timeLeft < 3600 ? "text-yellow-400 font-bold" : ""}>
            {status === "Active" ? formatTime(timeLeft) : `Ended ${new Date(proposal.endTime * 1000).toLocaleDateString()}`}
          </span>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {txError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 break-words">{txError}</p>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="mt-auto">
          {canVote && (
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={loading}
                onClick={() => handleVote(true)}
                className="flex items-center justify-center gap-2 py-3.5 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 font-black text-xs hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all duration-200 disabled:opacity-40"
              >
                <CheckCircle className="w-4 h-4" />
                VOTE YES
              </button>
              <button
                disabled={loading}
                onClick={() => handleVote(false)}
                className="flex items-center justify-center gap-2 py-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 font-black text-xs hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all duration-200 disabled:opacity-40"
              >
                <XCircle className="w-4 h-4" />
                VOTE NO
              </button>
            </div>
          )}

          {voted && status === "Active" && (
            <div className="w-full py-3.5 bg-white/5 border border-white/10 rounded-2xl text-center text-xs font-bold text-gray-400">
              ✓ You voted on this proposal
            </div>
          )}

          {canExecute && (
            <button
              disabled={loading}
              onClick={handleExecute}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_35px_rgba(59,130,246,0.5)] transition-all duration-200 hover:scale-[1.02] disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-current" />
              EXECUTE ON-CHAIN
            </button>
          )}

          {!canVote && !canExecute && !voted && (
            <div className="w-full py-3.5 bg-white/5 border border-white/10 rounded-2xl text-center text-xs font-bold text-gray-500 uppercase tracking-widest">
              {proposal.executed ? "✓ Executed & Finalized" : "Voting Closed"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalCard;