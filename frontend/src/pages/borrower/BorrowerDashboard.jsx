import { useEffect, useState } from "react";
import { useBlockchain } from "../../context/BlockchainContext";
import Navbar from "../../components/Navbar";
import {
  User, Shield, TrendingUp, ArrowRight, History, Clock,
  AlertCircle, CheckCircle, Award, Wallet, BarChart3,
  ArrowUpRight, Zap, RefreshCw, ChevronRight, Activity,
  DollarSign, Calendar, Layers, Star, AlertTriangle
} from "lucide-react";

/* ─── Helpers ─── */
const poolMap    = ["LOW", "MEDIUM", "HIGH"];
const poolColors = {
  0: { bg: "bg-[#C6F135]/10", text: "text-[#C6F135]", border: "border-[#C6F135]/30" },
  1: { bg: "bg-amber-400/10",  text: "text-amber-400",  border: "border-amber-400/30"  },
  2: { bg: "bg-red-400/10",    text: "text-red-400",    border: "border-red-400/30"    },
};

const TrustMeter = ({ score }) => {
  const pct = Math.min(100, (score / 1000) * 100);
  const color = score >= 700 ? "#C6F135" : score >= 400 ? "#F59E0B" : "#F87171";
  return (
    <div className="relative w-full">
      <div className="flex justify-between mb-2">
        <span className="text-[11px] font-bold tracking-widest text-[#888] uppercase">Trust Score</span>
        <span className="text-[11px] font-bold text-[#888]">/1000</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-[#555]">0</span>
        <span className="text-[10px] text-[#555]">1000</span>
      </div>
    </div>
  );
};

const StatPill = ({ label, value, accent }) => (
  <div className="flex flex-col gap-1 px-5 py-4 bg-white/[0.04] rounded-2xl border border-white/[0.06]">
    <span className="text-[10px] font-bold tracking-[0.15em] text-[#666] uppercase">{label}</span>
    <span className={`text-2xl font-black ${accent || "text-white"}`}>{value}</span>
  </div>
);

/* ─── Main Component ─── */
const BorrowerDashboard = () => {
  const {
    account, connectWallet,
    getUserProfile, getActiveLoan, getWalletMaturity,
    requestLoan, repayLoan, getLoanHistory, loading,
    computeTrustScore,
  } = useBlockchain();

  const [profile,     setProfile]     = useState(null);
  const [loan,        setLoan]        = useState(null);
  const [maturity,    setMaturity]    = useState(null);
  const [history,     setHistory]     = useState([]);
  const [liveScore,   setLiveScore]   = useState(null);
  const [repayLoading, setRepayLoading] = useState(false);
  const [loanAmount,  setLoanAmount]  = useState("");
  const [duration,    setDuration]    = useState("");
  const [txLoading,   setTxLoading]   = useState(false);
  const [msg,         setMsg]         = useState({ type: "", text: "" });

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 5000);
  };

  const loadData = async () => {
    try {
      const [p, l, m, h, s] = await Promise.all([
        getUserProfile(), getActiveLoan(), getWalletMaturity(),
        getLoanHistory(), computeTrustScore(),
      ]);
      setProfile(p); setLoan(l); setMaturity(m); setHistory(h); setLiveScore(s);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (account) loadData(); }, [account]);

  const handleRequest = async () => {
    const amt = parseFloat(loanAmount);
    const dur = parseInt(duration);
    if (isNaN(amt) || amt <= 0) return flash("error", "Enter a valid loan amount");
    if (isNaN(dur) || dur < 1 || dur > 180) return flash("error", "Duration must be 1–180 days");
    try {
      setTxLoading(true);
      flash("info", "Submitting loan request…");
      await requestLoan(amt.toString(), dur * 86400);
      flash("success", "Loan approved & disbursed! ✓");
      setLoanAmount(""); setDuration("");
      loadData();
    } catch (e) { console.error(e); flash("error", "Transaction failed. Check your wallet."); }
    finally { setTxLoading(false); }
  };

  const handleRepay = async () => {
    try {
      setRepayLoading(true);
      flash("info", "Processing full repayment…");
      await repayLoan();
      flash("success", "Loan repaid successfully! ✓");
      loadData();
    } catch (e) { console.error(e); flash("error", "Repayment failed."); }
    finally { setRepayLoading(false); }
  };

  const isActive = loan && Number(loan.principal) > 0 && Number(loan.status) === 0;
  const score    = liveScore ?? profile?.liveTrustScore ?? 0;

  /* ─── Disconnected ─── */
  if (!account) {
    return (
      <div className="min-h-screen bg-[#111] flex flex-col" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-[#C6F135]/10 border border-[#C6F135]/30 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Wallet className="w-9 h-9 text-[#A8CFA3]" />
            </div>
            <h2 className="text-4xl font-black text-white mb-3 tracking-tight">Connect Wallet</h2>
            <p className="text-[#666] text-base mb-10 leading-relaxed">
              Access your borrower profile, manage credit, and track your loan history.
            </p>
            <button
              onClick={connectWallet}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-[#A8CFA3] hover:bg-[#d4ff3d] text-black font-bold rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-base"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <Style />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Subtle texture */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle at 20% 20%, rgba(198,241,53,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(198,241,53,0.03) 0%, transparent 50%)",
      }} />

      <Navbar />

      <main className="relative max-w-[1280px] mx-auto px-6 py-12">
        {/* ── Page Header ── */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C6F135]/10 border border-[#C6F135]/20 rounded-full mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#A8CFA3] animate-pulse" />
            <span className="text-[#A8CFA3] text-xs font-bold tracking-widest uppercase">Live Dashboard</span>
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white leading-none mb-2">
                Borrower<br />
                <span className="text-[#A8CFA3]">Dashboard</span>
              </h1>
              <p className="text-[#666] text-base font-normal max-w-sm mt-3">
                Manage your credit profile, active loans, and repayment history on-chain.
              </p>
            </div>
            {account && (
              <div className="flex items-center gap-3 px-5 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-[#C6F135]/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#A8CFA3]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#555] font-bold tracking-widest uppercase">Connected</p>
                  <p className="text-xs text-white font-bold font-mono">
                    {account.slice(0,6)}…{account.slice(-4)}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#A8CFA3] animate-pulse ml-1" />
              </div>
            )}
          </div>
        </div>

        {/* ── Stats Bar ── */}
        {profile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Trust Score"
              value={score}
              sub={`/${1000}`}
              accent="lime"
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5" />}
              label="Repayments"
              value={profile.successfulRepayments}
              sub="successful"
              accent="green"
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Defaults"
              value={profile.defaults}
              sub="total"
              accent={profile.defaults > 0 ? "red" : "neutral"}
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Credit Limit"
              value={`$${parseFloat(profile.maxBorrowingLimit || 0).toFixed(0)}`}
              sub="USDC"
              accent="lime"
            />
          </div>
        )}

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">

            {/* Profile Card */}
            {profile && (
              <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-3xl p-7 relative overflow-hidden">
                {/* Lime accent blob */}
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#C6F135]/8 rounded-full blur-2xl" />

                <div className="flex items-center gap-4 mb-7">
                  <div className="w-14 h-14 rounded-2xl bg-[#C6F135]/10 border border-[#C6F135]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-black text-[#A8CFA3]">
                      {(profile.username || "A")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{profile.username || "Anonymous"}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${poolColors[profile.assignedPool]?.bg} ${poolColors[profile.assignedPool]?.text} ${poolColors[profile.assignedPool]?.border}`}>
                        {poolMap[profile.assignedPool]} RISK
                      </span>
                      {score >= 700 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C6F135]/10 text-[#A8CFA3] border border-[#C6F135]/20">
                          ELITE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trust meter */}
                <div className="mb-6">
                  <div className="flex items-end justify-between mb-3">
                    <TrustMeter score={score} />
                  </div>
                  <div className="text-5xl font-black text-[#A8CFA3] tracking-tighter">{score}</div>
                  <div className="text-[#555] text-xs mt-0.5 font-medium">FICO-style trust score</div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-5 border-t border-white/[0.06]">
                  <MiniStat label="Loans" value={profile.totalLoansTaken} />
                  <MiniStat label="Level" value={`L${profile.maturityLevel}`} />
                  <MiniStat label="Bonus" value={`+${profile.vouchBonus}`} />
                </div>
              </div>
            )}

            {/* Wallet Maturity Card */}
            {maturity && (
              <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-3xl p-7">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-bold text-white tracking-tight">Wallet Maturity</h4>
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#888]" />
                  </div>
                </div>

                <div className="space-y-4">
                  <MaturityRow
                    label="Wallet Age"
                    value={`${(Number(maturity.age) / 86400).toFixed(1)} days`}
                  />
                  <MaturityRow
                    label="Maturity Level"
                    value={`Level ${maturity.maturityLevel} / 3`}
                    accent
                  />
                  <MaturityRow
                    label="Limit Multiplier"
                    value={`${maturity.maturityMultiplier}%`}
                    accent
                  />
                </div>

                {/* Level progress dots */}
                <div className="flex items-center gap-2 mt-6 pt-5 border-t border-white/[0.06]">
                  {[1, 2, 3].map((lvl) => (
                    <div
                      key={lvl}
                      className={`flex-1 h-1.5 rounded-full transition-all ${
                        lvl <= maturity.maturityLevel ? "bg-[#A8CFA3]" : "bg-white/[0.08]"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[9px] text-[#444] font-bold">7d</span>
                  <span className="text-[9px] text-[#444] font-bold">30d</span>
                  <span className="text-[9px] text-[#444] font-bold">90d</span>
                </div>
              </div>
            )}

            {/* Score Breakdown hint */}
            {profile && (
              <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-3xl p-7">
                <h4 className="text-sm font-bold text-white mb-5">Score Breakdown</h4>
                <div className="space-y-3">
                  <ScoreBar label="Payment History" max={350} val={profile.successfulRepayments > 0 ? Math.min(350, (profile.successfulRepayments / Math.max(profile.totalLoansTaken,1)) * 350) : 0} />
                  <ScoreBar label="Wallet Age" max={150} val={maturity ? Math.min(150, [0,50,100,150][Math.min(maturity.maturityLevel,3)]) : 0} />
                  <ScoreBar label="Vouch Bonus" max={100} val={Math.min(100, profile.vouchBonus)} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6">

            {/* ── ACTIVE LOAN or REQUEST FORM ── */}
            {isActive ? (
              <div className="bg-[#1a1a1a] border border-[#C6F135]/20 rounded-3xl p-8 relative overflow-hidden">
                {/* Accent corner */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#C6F135]/5 rounded-bl-full" />
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#C6F135]/10 rounded-bl-full" />

                <div className="flex items-center justify-between mb-8">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C6F135]/10 border border-[#C6F135]/20 rounded-full mb-3">
                      <div className="w-1.5 h-1.5 bg-[#A8CFA3] rounded-full animate-pulse" />
                      <span className="text-[#A8CFA3] text-[10px] font-bold tracking-widest uppercase">Active Credit</span>
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight">Open Loan</h3>
                  </div>
                  {loan.isOverdue && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-2xl">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-xs font-bold">OVERDUE</span>
                    </div>
                  )}
                </div>

                {/* Loan stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <LoanStat label="Principal" value={`$${parseFloat(loan.principal).toFixed(2)}`} large />
                  <LoanStat label="Total Due" value={`$${parseFloat(loan.totalRepayment).toFixed(2)}`} large accent />
                  <LoanStat label="Interest" value={`$${parseFloat(loan.interestAmount).toFixed(2)}`} />
                </div>

                <div className="flex items-center gap-3 mb-8 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                  <Calendar className="w-4 h-4 text-[#888]" />
                  <div>
                    <span className="text-[#666] text-xs">Due Date: </span>
                    <span className="text-white text-sm font-bold">
                      {new Date(Number(loan.dueDate) * 1000).toLocaleDateString("en-US", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </span>
                  </div>
                  <div className="ml-auto">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                      poolColors[loan.pool]?.bg + " " + poolColors[loan.pool]?.text + " border " + poolColors[loan.pool]?.border
                    }`}>
                      {poolMap[loan.pool]} RISK
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRepay}
                  disabled={repayLoading}
                  className="group w-full py-5 bg-[#A8CFA3] hover:bg-[#d4ff3d] text-black font-black text-base rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 flex items-center justify-center gap-3"
                >
                  {repayLoading ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Processing…</>
                  ) : (
                    <><CheckCircle className="w-5 h-5" /> Repay Full Amount</>
                  )}
                </button>
              </div>
            ) : (
              /* ── REQUEST LOAN ── */
              profile && (
                <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-[#C6F135]/3 rounded-bl-full" />

                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.04] border border-white/[0.08] rounded-full mb-3">
                      <Zap className="w-3 h-3 text-[#A8CFA3]" />
                      <span className="text-[#888] text-[10px] font-bold tracking-widest uppercase">Apply Now</span>
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight">Request Credit</h3>
                    <p className="text-[#666] text-sm mt-1">Pool auto-assigned based on your trust score.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    {/* Amount Input */}
                    <div>
                      <label className="block text-[11px] font-bold tracking-widest text-[#666] uppercase mb-2.5">
                        Loan Amount
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] font-bold text-sm">$</div>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={loanAmount}
                          onChange={(e) => setLoanAmount(e.target.value)}
                          className="w-full bg-black/40 border border-white/[0.08] rounded-2xl pl-9 pr-16 py-4 text-xl font-black text-white focus:outline-none focus:border-[#C6F135]/50 focus:ring-1 focus:ring-[#C6F135]/20 transition-all placeholder:text-[#333]"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] text-xs font-bold">USDC</div>
                      </div>
                      <p className="mt-2 text-[11px] text-[#A8CFA3]/80 font-medium">
                        Max: ${parseFloat(profile.maxBorrowingLimit || 0).toFixed(2)} USDC
                      </p>
                    </div>

                    {/* Duration Input */}
                    <div>
                      <label className="block text-[11px] font-bold tracking-widest text-[#666] uppercase mb-2.5">
                        Duration (Days)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="30"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="w-full bg-black/40 border border-white/[0.08] rounded-2xl px-5 py-4 text-xl font-black text-white focus:outline-none focus:border-[#C6F135]/50 focus:ring-1 focus:ring-[#C6F135]/20 transition-all placeholder:text-[#333]"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] text-xs font-bold">days</div>
                      </div>
                      <p className="mt-2 text-[11px] text-[#888] font-medium">Min 1 · Max 180 days</p>
                    </div>
                  </div>

                  {/* Duration quick selects */}
                  <div className="flex gap-2 mb-7">
                    {[7, 14, 30, 90].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(String(d))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                          duration === String(d)
                            ? "bg-[#C6F135]/10 border-[#C6F135]/40 text-[#A8CFA3]"
                            : "bg-white/[0.03] border-white/[0.06] text-[#666] hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleRequest}
                    disabled={txLoading}
                    className="group w-full py-5 bg-[#A8CFA3] hover:bg-[#d4ff3d] text-black font-black text-base rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 flex items-center justify-center gap-3"
                  >
                    {txLoading ? (
                      <><RefreshCw className="w-5 h-5 animate-spin" /> Submitting…</>
                    ) : (
                      <>Submit Loan Request <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>

                  {msg.text && (
                    <div className={`mt-5 p-4 rounded-2xl flex items-center gap-3 border text-sm font-semibold animate-fade-in ${
                      msg.type === "success" ? "bg-[#C6F135]/5 border-[#C6F135]/20 text-[#A8CFA3]" :
                      msg.type === "error"   ? "bg-red-500/5 border-red-500/20 text-red-400" :
                                               "bg-white/[0.04] border-white/[0.08] text-[#888]"
                    }`}>
                      {msg.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> :
                       msg.type === "error"   ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> :
                                                <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />}
                      {msg.text}
                    </div>
                  )}
                </div>
              )
            )}

            {/* ── Loan History ── */}
            <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-3xl p-7 flex-1">
              <div className="flex items-center justify-between mb-7">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <History className="w-4 h-4 text-[#888]" />
                  </div>
                  <h3 className="text-base font-black text-white">Credit History</h3>
                </div>
                <span className="text-[#555] text-xs font-bold">{history.length} records</span>
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.06] border-dashed rounded-2xl flex items-center justify-center mb-5">
                    <BarChart3 className="w-7 h-7 text-[#333]" />
                  </div>
                  <p className="text-[#444] text-sm font-medium">No loan history yet</p>
                  <p className="text-[#333] text-xs mt-1">Your repayments will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-white/[0.1] rounded-2xl transition-all duration-200 group cursor-default"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${poolColors[h.riskPool]?.bg} border ${poolColors[h.riskPool]?.border}`}>
                        <Layers className={`w-4 h-4 ${poolColors[h.riskPool]?.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-black text-base">${parseFloat(h.principal).toFixed(2)}</span>
                          <span className="text-[#555] text-xs">+${parseFloat(h.interestAmount).toFixed(2)} interest</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-bold ${poolColors[h.riskPool]?.text}`}>
                            {poolMap[h.riskPool]} RISK
                          </span>
                          <span className="text-[#444]">·</span>
                          <span className="text-[#555] text-[10px]">
                            {(Number(h.duration) / 86400).toFixed(0)}d term
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[#666] text-xs">
                          {new Date(Number(h.dueDate) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className={`text-[10px] font-bold mt-0.5 ${
                          Number(h.status) === 1 ? "text-[#A8CFA3]" :
                          Number(h.status) === 2 ? "text-red-400" : "text-amber-400"
                        }`}>
                          {["ACTIVE","REPAID","DEFAULTED"][Number(h.status)]}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#333] group-hover:text-[#666] transition-colors flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Style />
    </div>
  );
};

/* ─── Sub-components ─── */
const StatCard = ({ icon, label, value, sub, accent }) => {
  const accentClasses = {
    lime:    "text-[#C6F135]",
    green:   "text-emerald-400",
    red:     "text-red-400",
    neutral: "text-white",
  };
  return (
    <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-3xl p-6 relative overflow-hidden group hover:border-[#C6F135]/20 transition-all duration-300">
      <div className="absolute top-0 right-0 w-20 h-20 bg-[#C6F135]/3 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center justify-between mb-4">
        <div className="w-9 h-9 bg-white/[0.04] rounded-xl flex items-center justify-center text-[#666]">
          {icon}
        </div>
        <ArrowUpRight className="w-4 h-4 text-[#333] group-hover:text-[#666] transition-colors" />
      </div>
      <div className={`text-3xl font-black tracking-tight ${accentClasses[accent] || "text-white"}`}>{value}</div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-[#555] text-[11px] font-bold uppercase tracking-widest">{label}</span>
        {sub && <span className="text-[#444] text-[10px]">{sub}</span>}
      </div>
    </div>
  );
};

const MiniStat = ({ label, value }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-lg font-black text-white">{value}</span>
    <span className="text-[9px] text-[#555] font-bold uppercase tracking-widest">{label}</span>
  </div>
);

const MaturityRow = ({ label, value, accent }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
    <span className="text-[#666] text-sm">{label}</span>
    <span className={`text-sm font-bold ${accent ? "text-[#A8CFA3]" : "text-white"}`}>{value}</span>
  </div>
);

const LoanStat = ({ label, value, large, accent }) => (
  <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
    <div className="text-[10px] text-[#555] font-bold uppercase tracking-widest mb-1">{label}</div>
    <div className={`font-black ${large ? "text-2xl" : "text-xl"} ${accent ? "text-[#A8CFA3]" : "text-white"}`}>
      {value}
    </div>
  </div>
);

const ScoreBar = ({ label, max, val }) => {
  const pct = Math.min(100, (val / max) * 100);
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[11px] text-[#666] font-medium">{label}</span>
        <span className="text-[11px] text-white font-bold">{Math.round(val)}/{max}</span>
      </div>
      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#A8CFA3] rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const Style = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
    @keyframes fade-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
    input[type=number] { -moz-appearance: textfield; }
    * { scrollbar-width: thin; scrollbar-color: #333 transparent; }
  `}</style>
);

export default BorrowerDashboard;