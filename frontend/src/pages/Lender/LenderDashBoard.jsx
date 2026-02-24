import { useEffect, useState } from 'react';
import { useBlockchain, RiskPool } from '../../context/BlockchainContext';
import Navbar from '../../components/Navbar';
import {
  Wallet, ArrowRight, TrendingUp, DollarSign, BarChart3,
  ArrowUpRight, RefreshCw, CheckCircle, AlertCircle,
  ChevronDown, Layers, Activity, Zap, Award, Clock,
  ArrowDownLeft, ArrowUpLeft, ChevronRight, Bug, Info,
  AlertTriangle
} from 'lucide-react';

/* ─── Pool Config ─── */
const POOLS = {
  [RiskPool.LOW_RISK]: {
    label: 'Low Risk',
    short: 'LOW',
    accent: '#C6F135',
    accentBg: 'bg-[#C6F135]/10',
    accentBorder: 'border-[#C6F135]/25',
    accentText: 'text-[#C6F135]',
    description: 'Conservative, stable returns',
    depositKey: 'depositedLowRisk',
    pendingKey: 'pendingLow',
    statsKey: 'lowRisk',
    ratesKey: 'lowRisk',
    autoShare: 40,
  },
  [RiskPool.MEDIUM_RISK]: {
    label: 'Medium Risk',
    short: 'MED',
    accent: '#F59E0B',
    accentBg: 'bg-amber-400/10',
    accentBorder: 'border-amber-400/25',
    accentText: 'text-amber-400',
    description: 'Balanced risk and reward',
    depositKey: 'depositedMedRisk',
    pendingKey: 'pendingMed',
    statsKey: 'medRisk',
    ratesKey: 'medRisk',
    autoShare: 35,
  },
  [RiskPool.HIGH_RISK]: {
    label: 'High Risk',
    short: 'HIGH',
    accent: '#F87171',
    accentBg: 'bg-red-400/10',
    accentBorder: 'border-red-400/25',
    accentText: 'text-red-400',
    description: 'Higher returns, higher risk',
    depositKey: 'depositedHighRisk',
    pendingKey: 'pendingHigh',
    statsKey: 'highRisk',
    ratesKey: 'highRisk',
    autoShare: 25,
  },
};

/* ─── Helpers ─── */
const fmt = (num, min = 2, max = 8) => {
  const n = parseFloat(num);
  if (isNaN(n)) return '0.00';
  if (n > 0 && n < 0.01) return n.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: max });
  return n.toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });
};
const fmtPct = (bp) => `${(parseFloat(bp) / 100).toFixed(2)}%`;
const fmtSci = (n) => {
  const v = parseFloat(n);
  if (!v) return '0';
  return v > 0 && v < 0.000001 ? v.toExponential(4) : fmt(v);
};

/* ─── Sub-components ─── */
const SummaryCard = ({ icon, label, value, sub, accent, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-[#1a1a1a] border border-white/[0.08] rounded-3xl p-6 relative overflow-hidden group transition-all duration-300 hover:border-[${accent || '#C6F135'}]/20 cursor-default`}
  >
    <div className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full"
      style={{ background: `radial-gradient(circle at top right, ${accent || '#C6F135'}18, transparent)` }} />
    <div className="flex items-center justify-between mb-4">
      <div className="w-9 h-9 bg-white/[0.04] rounded-xl flex items-center justify-center" style={{ color: accent || '#C6F135' }}>
        {icon}
      </div>
      <ArrowUpRight className="w-4 h-4 text-[#333] group-hover:text-[#666] transition-colors" />
    </div>
    <div className="text-3xl font-black tracking-tight" style={{ color: accent || 'white' }}>{value}</div>
    <div className="flex items-baseline gap-1 mt-1">
      <span className="text-[#555] text-[11px] font-bold uppercase tracking-widest">{label}</span>
      {sub && <span className="text-[#444] text-[10px]">{sub}</span>}
    </div>
  </div>
);

const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`relative py-4 px-6 text-sm font-bold transition-all duration-200 ${
      active ? 'text-white' : 'text-[#555] hover:text-[#888]'
    }`}
  >
    {children}
    {active && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C6F135] rounded-full" />
    )}
  </button>
);

const PoolCard = ({ poolId, poolStats, lenderInfo, rates, selected, onSelect, showSelect }) => {
  const cfg = POOLS[poolId];
  const stats = poolStats?.[cfg.statsKey];
  const util = stats && parseFloat(stats.totalLiquidity) > 0
    ? ((parseFloat(stats.totalActiveLoans) / parseFloat(stats.totalLiquidity)) * 100).toFixed(1)
    : '0.0';

  return (
    <div
      onClick={() => showSelect && onSelect(poolId)}
      className={`bg-[#1a1a1a] border rounded-3xl p-7 relative overflow-hidden transition-all duration-300 group ${
        showSelect ? 'cursor-pointer' : ''
      } ${
        selected
          ? `border-[${cfg.accent}]/40 shadow-[0_0_20px_${cfg.accent}18]`
          : 'border-white/[0.08] hover:border-white/[0.14]'
      }`}
    >
      {selected && (
        <div className="absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: cfg.accent }}>
          <CheckCircle className="w-3 h-3 text-black" />
        </div>
      )}
      <div className="absolute top-0 right-0 w-28 h-28 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(circle at top right, ${cfg.accent}10, transparent)` }} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cfg.accentBg} border ${cfg.accentBorder}`}>
          <Layers className={`w-5 h-5 ${cfg.accentText}`} />
        </div>
        <div>
          <div className="text-white font-black text-base">{cfg.label}</div>
          <div className="text-[#555] text-[11px]">{cfg.description}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <PoolRow label="Total Liquidity" value={`$${fmt(stats?.totalLiquidity, 2, 2)}`} />
        <PoolRow label="Active Loans" value={`$${fmt(stats?.totalActiveLoans, 2, 2)}`} />
        <PoolRow label="Utilization" value={`${util}%`} />
        <PoolRow label="Interest Pool" value={`$${fmt(stats?.totalInterestPool, 2, 2)}`} accent={cfg.accentText} />
        {rates && (
          <PoolRow
            label="APR Range"
            value={`${fmtPct(rates.baseRate)} – ${fmtPct(rates.maxRate)}`}
            accent={cfg.accentText}
          />
        )}
      </div>

      {/* Utilization bar */}
      <div className="mt-5 pt-5 border-t border-white/[0.06]">
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] text-[#555] font-bold uppercase tracking-wider">Utilization</span>
          <span className="text-[10px] text-[#666] font-bold">{util}%</span>
        </div>
        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${util}%`, background: cfg.accent }} />
        </div>
      </div>

      {/* My deposit */}
      {lenderInfo && (
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex justify-between items-center">
          <span className="text-[11px] text-[#555] font-bold uppercase tracking-widest">My Deposit</span>
          <span className={`text-sm font-black ${cfg.accentText}`}>
            ${fmt(lenderInfo[cfg.depositKey], 2, 2)}
          </span>
        </div>
      )}
    </div>
  );
};

const PoolRow = ({ label, value, accent }) => (
  <div className="flex items-center justify-between">
    <span className="text-[#555] text-xs font-medium">{label}</span>
    <span className={`text-sm font-bold ${accent || 'text-white'}`}>{value}</span>
  </div>
);

/* ─── Main Component ─── */
const LenderDashboard = () => {
  const {
    account, loading, connectWallet,
    getUSDCBalance, depositToPool, withdrawFromPool,
    claimInterest, getLenderInfo, getAllPoolStats, getPoolInterestRates,
  } = useBlockchain();

  const [balance,      setBalance]      = useState('0');
  const [lenderInfo,   setLenderInfo]   = useState(null);
  const [poolStats,    setPoolStats]    = useState(null);
  const [rates,        setRates]        = useState({ lowRisk: null, medRisk: null, highRisk: null });
  const [depositAmt,   setDepositAmt]   = useState('');
  const [withdrawAmt,  setWithdrawAmt]  = useState('');
  const [selPool,      setSelPool]      = useState(RiskPool.LOW_RISK);
  const [activeTab,    setActiveTab]    = useState('overview');
  const [lendMode,     setLendMode]     = useState('manual');
  const [txLoading,    setTxLoading]    = useState(false);
  const [msg,          setMsg]          = useState({ type: '', text: '' });
  const [showDebug,    setShowDebug]    = useState(false);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 5000); };

  const loadData = async () => {
    try {
      const [bal, info, pools, lr, mr, hr] = await Promise.all([
        getUSDCBalance ? getUSDCBalance() : Promise.resolve('0'),
        getLenderInfo(),
        getAllPoolStats(),
        getPoolInterestRates(RiskPool.LOW_RISK),
        getPoolInterestRates(RiskPool.MEDIUM_RISK),
        getPoolInterestRates(RiskPool.HIGH_RISK),
      ]);
      setBalance(bal || '0');
      setLenderInfo(info);
      setPoolStats(pools);
      setRates({ lowRisk: lr, medRisk: mr, highRisk: hr });
    } catch (e) { console.error(e); flash('error', 'Failed to load dashboard data'); }
  };

  useEffect(() => {
    if (account) {
      loadData();
      const iv = setInterval(loadData, 30000);
      return () => clearInterval(iv);
    }
  }, [account]);

  const totalDeposited = () => {
    if (!lenderInfo) return '0';
    return (parseFloat(lenderInfo.depositedLowRisk) + parseFloat(lenderInfo.depositedMedRisk) + parseFloat(lenderInfo.depositedHighRisk)).toFixed(2);
  };

  const totalPending = () => {
    if (!lenderInfo) return 0;
    return parseFloat(lenderInfo.pendingLow || 0) + parseFloat(lenderInfo.pendingMed || 0) + parseFloat(lenderInfo.pendingHigh || 0);
  };

  const isSmallInterest = () => { const t = totalPending(); return t > 0 && t < 0.01; };

  const handleDeposit = async () => {
    if (!depositAmt || parseFloat(depositAmt) <= 0) return flash('error', 'Enter a valid amount');
    try {
      setTxLoading(true);
      if (lendMode === 'auto') {
        const total = parseFloat(depositAmt);
        await depositToPool((total * 0.40).toFixed(6), RiskPool.LOW_RISK);
        await depositToPool((total * 0.35).toFixed(6), RiskPool.MEDIUM_RISK);
        await depositToPool((total * 0.25).toFixed(6), RiskPool.HIGH_RISK);
        flash('success', `Auto-deposited $${depositAmt} USDC across all pools ✓`);
      } else {
        await depositToPool(depositAmt, selPool);
        flash('success', `Deposited $${depositAmt} USDC to ${POOLS[selPool].label} ✓`);
      }
      setDepositAmt('');
      await loadData();
    } catch (e) { console.error(e); flash('error', e.message || 'Deposit failed'); }
    finally { setTxLoading(false); }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmt || parseFloat(withdrawAmt) <= 0) return flash('error', 'Enter a valid amount');
    try {
      setTxLoading(true);
      await withdrawFromPool(withdrawAmt, selPool);
      flash('success', `Withdrew $${withdrawAmt} USDC from ${POOLS[selPool].label} ✓`);
      setWithdrawAmt('');
      await loadData();
    } catch (e) { console.error(e); flash('error', e.message || 'Withdrawal failed'); }
    finally { setTxLoading(false); }
  };

  const handleClaim = async () => {
    try {
      setTxLoading(true);
      await claimInterest();
      flash('success', 'All pending interest claimed! ✓');
      await loadData();
    } catch (e) { console.error(e); flash('error', e.message || 'Claim failed'); }
    finally { setTxLoading(false); }
  };

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
              Access pools, deposit USDC, and earn passive interest on your crypto assets.
            </p>
            <button
              onClick={connectWallet}
              disabled={loading}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-[#A8CFA3] hover:bg-[#d4ff3d] text-black font-bold rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Connecting…' : 'Get Started'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
        <DmSans />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 15% 25%, rgba(198,241,53,0.04) 0%, transparent 50%), radial-gradient(circle at 85% 75%, rgba(198,241,53,0.03) 0%, transparent 50%)',
      }} />

      <Navbar />

      <main className="relative max-w-[1280px] mx-auto px-6 py-12">

        {/* ── Header ── */}
        <div className="mb-12 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C6F135]/10 border border-[#C6F135]/20 rounded-full mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-[#A8CFA3] animate-pulse" />
              <span className="text-[#A8CFA3] text-xs font-bold tracking-widest uppercase">Earning Protocol</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white leading-none mb-2">
              Lender<br />
              <span className="text-[#A8CFA3]">Dashboard</span>
            </h1>
            <p className="text-[#666] text-base font-normal max-w-sm mt-3">
              Deposit USDC into risk pools, earn interest, and track performance on-chain.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {account && (
              <div className="flex items-center gap-3 px-5 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-[#C6F135]/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-[#A8CFA3]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#555] font-bold tracking-widest uppercase">Connected</p>
                  <p className="text-xs text-white font-bold font-mono">{account.slice(0,6)}…{account.slice(-4)}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#A8CFA3] animate-pulse ml-1" />
              </div>
            )}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold transition-all ${
                showDebug
                  ? 'bg-[#C6F135]/10 border-[#C6F135]/30 text-[#A8CFA3]'
                  : 'bg-white/[0.04] border-white/[0.08] text-[#555] hover:text-white hover:border-white/20'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              Debug
            </button>
          </div>
        </div>

        {/* ── Debug Panel ── */}
        {showDebug && lenderInfo && (
          <div className="mb-8 bg-[#141414] border border-[#C6F135]/15 rounded-3xl p-7 font-mono text-xs">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[#A8CFA3] font-bold text-sm flex items-center gap-2"><Bug className="w-4 h-4" /> Debug Info</span>
              <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[#888] hover:text-white transition-colors">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-[#888]">
              <div>
                <div className="text-[#A8CFA3]/70 font-bold mb-2 text-[10px] uppercase tracking-widest">Pending Interest</div>
                <div>Low: <span className="text-white">{lenderInfo.pendingLow}</span></div>
                <div>Med: <span className="text-white">{lenderInfo.pendingMed}</span></div>
                <div>High: <span className="text-white">{lenderInfo.pendingHigh}</span></div>
                <div className="mt-1">Total: <span className="text-[#A8CFA3] font-bold">{totalPending()}</span></div>
              </div>
              <div>
                <div className="text-[#A8CFA3]/70 font-bold mb-2 text-[10px] uppercase tracking-widest">Deposits</div>
                <div>Low: <span className="text-white">{lenderInfo.depositedLowRisk}</span></div>
                <div>Med: <span className="text-white">{lenderInfo.depositedMedRisk}</span></div>
                <div>High: <span className="text-white">{lenderInfo.depositedHighRisk}</span></div>
                <div className="mt-1">Earned: <span className="text-[#A8CFA3] font-bold">{lenderInfo.totalInterestEarned}</span></div>
              </div>
              <div>
                <div className="text-[#A8CFA3]/70 font-bold mb-2 text-[10px] uppercase tracking-widest">Interest Rates (BP)</div>
                {rates.lowRisk && <div>Low: <span className="text-[#C6F135]">{rates.lowRisk.baseRate}–{rates.lowRisk.maxRate}</span></div>}
                {rates.medRisk && <div>Med: <span className="text-amber-400">{rates.medRisk.baseRate}–{rates.medRisk.maxRate}</span></div>}
                {rates.highRisk && <div>High: <span className="text-red-400">{rates.highRisk.baseRate}–{rates.highRisk.maxRate}</span></div>}
                {isSmallInterest() && <div className="text-red-400 mt-2">⚠ Very small interest</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── Small interest warning ── */}
        {isSmallInterest() && !showDebug && (
          <div className="mb-8 p-5 bg-amber-400/5 border border-amber-400/20 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-amber-400 text-sm font-bold mb-1">Very Small Interest Detected</div>
              <div className="text-[#666] text-xs leading-relaxed">
                Interest ({fmtSci(totalPending())} USDC) is below 0.01. Check contract interest rates (800–2500 basis points recommended).
              </div>
            </div>
            <button onClick={() => setShowDebug(true)} className="ml-auto text-[10px] font-bold text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-xl hover:bg-amber-400/10 transition-colors flex-shrink-0">
              Debug
            </button>
          </div>
        )}

        {/* ── Toast ── */}
        {msg.text && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border text-sm font-semibold ${
            msg.type === 'success' ? 'bg-[#C6F135]/5 border-[#C6F135]/20 text-[#A8CFA3]' :
            msg.type === 'error'   ? 'bg-red-500/5 border-red-500/20 text-red-400' :
                                     'bg-white/[0.04] border-white/[0.08] text-[#888]'
          }`}>
            {msg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {msg.text}
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <SummaryCard icon={<Wallet className="w-5 h-5" />} label="Wallet Balance" value={`$${fmt(balance, 2, 2)}`} sub="USDC" accent="#C6F135" />
          <SummaryCard icon={<DollarSign className="w-5 h-5" />} label="Total Deposited" value={`$${fmt(totalDeposited(), 2, 2)}`} sub="USDC" accent="white" />
          <SummaryCard icon={<TrendingUp className="w-5 h-5" />} label="Pending Interest" value={`$${fmt(totalPending(), 2, 8)}`} sub="USDC" accent="#C6F135" />
          <SummaryCard icon={<Award className="w-5 h-5" />} label="Total Earned" value={`$${fmt(lenderInfo?.totalInterestEarned, 2, 2)}`} sub="lifetime" accent="#C6F135" />
        </div>

        {/* ── Claim button (if pending) ── */}
        {totalPending() > 0 && (
          <div className="mb-8 flex items-center gap-4 p-5 bg-[#1a1a1a] border border-[#C6F135]/20 rounded-2xl">
            <div className="flex-1">
              <div className="text-[#A8CFA3] font-black text-lg">${fmt(totalPending(), 2, 8)} USDC available</div>
              <div className="text-[#666] text-xs mt-0.5">Pending interest across all pools · Claim in one transaction</div>
            </div>
            <button
              onClick={handleClaim}
              disabled={txLoading}
              className="flex items-center gap-2 px-6 py-3 bg-[#A8CFA3] hover:bg-[#d4ff3d] text-black font-bold rounded-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 text-sm flex-shrink-0"
            >
              {txLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : <><CheckCircle className="w-4 h-4" /> Claim Interest</>}
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-3xl overflow-hidden">
          <div className="flex border-b border-white/[0.08] px-2">
            <TabBtn active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</TabBtn>
            <TabBtn active={activeTab === 'manage'}   onClick={() => setActiveTab('manage')}>Manage</TabBtn>
            <TabBtn active={activeTab === 'earnings'} onClick={() => setActiveTab('earnings')}>Earnings</TabBtn>
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white">Pool Statistics</h2>
                <button onClick={loadData} className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[#666] hover:text-white text-xs font-bold transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[RiskPool.LOW_RISK, RiskPool.MEDIUM_RISK, RiskPool.HIGH_RISK].map((pid) => (
                  <PoolCard
                    key={pid}
                    poolId={pid}
                    poolStats={poolStats}
                    lenderInfo={lenderInfo}
                    rates={rates[POOLS[pid].ratesKey]}
                    selected={false}
                    showSelect={false}
                  />
                ))}
              </div>

              {/* My Position summary */}
              {lenderInfo && (
                <div className="mt-8 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                  <h3 className="text-sm font-bold text-white mb-5">My Position</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[RiskPool.LOW_RISK, RiskPool.MEDIUM_RISK, RiskPool.HIGH_RISK].map((pid) => {
                      const cfg = POOLS[pid];
                      return (
                        <div key={pid} className={`p-4 rounded-2xl border ${cfg.accentBg} ${cfg.accentBorder}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${cfg.accentText}`}>{cfg.label}</div>
                          <div className="text-white font-black text-xl">${fmt(lenderInfo[cfg.depositKey], 2, 2)}</div>
                          <div className={`text-[11px] mt-1 ${cfg.accentText}`}>
                            +${fmt(lenderInfo[cfg.pendingKey], 2, 6)} pending
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MANAGE TAB ── */}
          {activeTab === 'manage' && (
            <div className="p-8">
              <h2 className="text-2xl font-black text-white mb-8">Manage Deposits</h2>

              {/* Mode toggle */}
              <div className="mb-8 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <div className="text-sm font-bold text-white mb-4">Lending Mode</div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    onClick={() => setLendMode('manual')}
                    className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
                      lendMode === 'manual'
                        ? 'bg-[#C6F135]/10 border-[#C6F135]/40 text-white'
                        : 'bg-transparent border-white/[0.08] text-[#555] hover:border-white/20 hover:text-[#888]'
                    }`}
                  >
                    <div className="font-black text-base mb-1">Manual</div>
                    <div className="text-[11px] opacity-70">Choose specific pool</div>
                  </button>
                  <button
                    onClick={() => setLendMode('auto')}
                    className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
                      lendMode === 'auto'
                        ? 'bg-[#C6F135]/10 border-[#C6F135]/40 text-white'
                        : 'bg-transparent border-white/[0.08] text-[#555] hover:border-white/20 hover:text-[#888]'
                    }`}
                  >
                    <div className="font-black text-base mb-1">Auto</div>
                    <div className="text-[11px] opacity-70">Smart distribution</div>
                  </button>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <Info className="w-4 h-4 text-[#555] flex-shrink-0 mt-0.5" />
                  <div className="text-[#555] text-xs leading-relaxed">
                    {lendMode === 'manual'
                      ? 'Manually select a risk pool. You have full control over allocation.'
                      : 'Auto distributes: 40% Low Risk · 35% Medium Risk · 25% High Risk for balanced returns.'}
                  </div>
                </div>
              </div>

              {/* Pool selector (manual mode) */}
              {lendMode === 'manual' && (
                <div className="mb-8">
                  <div className="text-[11px] font-bold tracking-widest text-[#666] uppercase mb-4">Select Pool</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[RiskPool.LOW_RISK, RiskPool.MEDIUM_RISK, RiskPool.HIGH_RISK].map((pid) => (
                      <PoolCard
                        key={pid}
                        poolId={pid}
                        poolStats={poolStats}
                        lenderInfo={lenderInfo}
                        rates={rates[POOLS[pid].ratesKey]}
                        selected={selPool === pid}
                        onSelect={setSelPool}
                        showSelect={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Auto breakdown */}
              {lendMode === 'auto' && (
                <div className="mb-8 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                  <div className="text-sm font-bold text-white mb-5">Auto Distribution</div>
                  <div className="grid grid-cols-3 gap-4">
                    {[RiskPool.LOW_RISK, RiskPool.MEDIUM_RISK, RiskPool.HIGH_RISK].map((pid) => {
                      const cfg = POOLS[pid];
                      return (
                        <div key={pid} className={`p-5 rounded-2xl text-center ${cfg.accentBg} border ${cfg.accentBorder}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${cfg.accentText}`}>{cfg.label}</div>
                          <div className={`text-4xl font-black ${cfg.accentText}`}>{cfg.autoShare}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Deposit + Withdraw */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Deposit */}
                <div className="p-7 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-[#C6F135]/10 border border-[#C6F135]/20 flex items-center justify-center">
                      <ArrowDownLeft className="w-4 h-4 text-[#A8CFA3]" />
                    </div>
                    <h3 className="text-base font-black text-white">Deposit Funds</h3>
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-bold tracking-widest text-[#666] uppercase mb-2.5">Amount (USDC)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] font-bold text-sm">$</div>
                      <input
                        type="number"
                        value={depositAmt}
                        onChange={(e) => setDepositAmt(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-8 pr-16 py-4 text-xl font-black text-white focus:outline-none focus:border-[#C6F135]/40 focus:ring-1 focus:ring-[#C6F135]/15 transition-all placeholder:text-[#333]"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] text-xs font-bold">USDC</div>
                    </div>
                    <div className="mt-2 text-[11px] text-[#555]">
                      Available: <span className="text-[#A8CFA3] font-bold">${fmt(balance, 2, 2)}</span>
                    </div>
                  </div>
                  {/* Quick amounts */}
                  <div className="flex gap-2 mb-5">
                    {['10', '50', '100', '500'].map((v) => (
                      <button key={v} onClick={() => setDepositAmt(v)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                          depositAmt === v ? 'bg-[#C6F135]/10 border-[#C6F135]/40 text-[#A8CFA3]' : 'bg-white/[0.02] border-white/[0.06] text-[#555] hover:text-white hover:border-white/20'
                        }`}>${v}</button>
                    ))}
                  </div>
                  <button
                    onClick={handleDeposit}
                    disabled={txLoading || !depositAmt || parseFloat(depositAmt) <= 0}
                    className="w-full py-4 bg-[#A8CFA3] hover:bg-[#d4ff3d] text-black font-black rounded-xl transition-all duration-200 hover:scale-[1.01] disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                  >
                    {txLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : lendMode === 'auto' ? 'Auto Deposit' : 'Deposit'}
                  </button>
                </div>

                {/* Withdraw */}
                <div className="p-7 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                      <ArrowUpLeft className="w-4 h-4 text-[#888]" />
                    </div>
                    <h3 className="text-base font-black text-white">Withdraw Funds</h3>
                  </div>

                  <div className="mb-4">
                    <label className="block text-[11px] font-bold tracking-widest text-[#666] uppercase mb-2.5">Pool</label>
                    <div className="relative">
                      <select
                        value={selPool}
                        onChange={(e) => setSelPool(parseInt(e.target.value))}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:outline-none focus:border-[#C6F135]/40 transition-all appearance-none"
                      >
                        {[RiskPool.LOW_RISK, RiskPool.MEDIUM_RISK, RiskPool.HIGH_RISK].map((pid) => (
                          <option key={pid} value={pid}>{POOLS[pid].label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] pointer-events-none" />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-[11px] font-bold tracking-widest text-[#666] uppercase mb-2.5">Amount (USDC)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] font-bold text-sm">$</div>
                      <input
                        type="number"
                        value={withdrawAmt}
                        onChange={(e) => setWithdrawAmt(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-8 pr-16 py-4 text-xl font-black text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all placeholder:text-[#333]"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] text-xs font-bold">USDC</div>
                    </div>
                    <div className="mt-2 text-[11px] text-[#555]">
                      Deposited: <span className="text-white font-bold">${fmt(lenderInfo?.[POOLS[selPool].depositKey], 2, 2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setWithdrawAmt(fmt(lenderInfo?.[POOLS[selPool].depositKey], 2, 2).replace(/,/g, ''))}
                    className="w-full py-2 rounded-xl text-[11px] font-bold text-[#555] border border-white/[0.06] hover:text-white hover:border-white/20 transition-all mb-3"
                  >
                    Max
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={txLoading || !withdrawAmt || parseFloat(withdrawAmt) <= 0}
                    className="w-full py-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-black rounded-xl transition-all duration-200 hover:scale-[1.01] disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                  >
                    {txLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : 'Withdraw'}
                  </button>
                </div>
              </div>

              {/* Pending interest by pool */}
              {lenderInfo && (
                <div className="mt-6 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                  <div className="text-sm font-bold text-white mb-4">Pending Interest by Pool</div>
                  <div className="grid grid-cols-3 gap-4">
                    {[RiskPool.LOW_RISK, RiskPool.MEDIUM_RISK, RiskPool.HIGH_RISK].map((pid) => {
                      const cfg = POOLS[pid];
                      return (
                        <div key={pid} className={`p-4 rounded-xl ${cfg.accentBg} border ${cfg.accentBorder}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${cfg.accentText}`}>{cfg.label}</div>
                          <div className={`text-xl font-black ${cfg.accentText}`}>${fmt(lenderInfo[cfg.pendingKey], 2, 6)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EARNINGS TAB ── */}
          {activeTab === 'earnings' && (
            <div className="p-8">
              <h2 className="text-2xl font-black text-white mb-8">Earnings & Interest</h2>

              {/* All-time hero */}
              <div className="mb-8 p-8 bg-[#111] border border-[#C6F135]/20 rounded-3xl text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(ellipse at center, rgba(198,241,53,0.06) 0%, transparent 70%)'
                }} />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#C6F135]/10 border border-[#C6F135]/20 rounded-full mb-5">
                    <Award className="w-3.5 h-3.5 text-[#A8CFA3]" />
                    <span className="text-[#A8CFA3] text-[11px] font-bold tracking-widest uppercase">All-Time Earnings</span>
                  </div>
                  <div className="text-6xl font-black text-[#A8CFA3] tracking-tighter mb-2">
                    ${fmt(lenderInfo?.totalInterestEarned, 2, 2)}
                  </div>
                  <div className="text-[#555] text-sm">Total interest earned · Keep lending to grow</div>
                </div>
              </div>

              {/* Pending by pool */}
              <div className="mb-8">
                <div className="text-sm font-bold text-white mb-5">Claimable Interest</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[RiskPool.LOW_RISK, RiskPool.MEDIUM_RISK, RiskPool.HIGH_RISK].map((pid) => {
                    const cfg = POOLS[pid];
                    const pending = lenderInfo?.[cfg.pendingKey] || '0';
                    return (
                      <div key={pid} className={`p-7 rounded-3xl border ${cfg.accentBg} ${cfg.accentBorder} relative overflow-hidden`}>
                        <div className="flex items-center justify-between mb-5">
                          <div className={`text-[11px] font-bold uppercase tracking-widest ${cfg.accentText}`}>{cfg.label}</div>
                          <div className={`w-2 h-2 rounded-full`} style={{ background: cfg.accent }} />
                        </div>
                        <div className={`text-4xl font-black ${cfg.accentText} mb-1`}>${fmt(pending, 2, 6)}</div>
                        <div className="text-[#555] text-xs">USDC pending</div>
                        {parseFloat(pending) > 0 && parseFloat(pending) < 0.01 && (
                          <div className="text-amber-400 text-[10px] mt-1 font-mono">({fmtSci(pending)})</div>
                        )}
                        <div className="mt-5 pt-4 border-t border-white/[0.08]">
                          <div className="text-[#555] text-[10px] font-bold uppercase tracking-widest mb-1">Deposited</div>
                          <div className="text-white text-sm font-bold">${fmt(lenderInfo?.[cfg.depositKey], 2, 2)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Claim section */}
              <div className="p-7 bg-white/[0.02] border border-white/[0.06] rounded-2xl mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-white font-black text-lg">Total Claimable</div>
                    <div className="text-[#555] text-xs mt-0.5">One transaction · All pools</div>
                  </div>
                  <div className="text-3xl font-black text-[#A8CFA3]">${fmt(totalPending(), 2, 8)}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[RiskPool.LOW_RISK, RiskPool.MEDIUM_RISK, RiskPool.HIGH_RISK].map((pid) => {
                    const cfg = POOLS[pid];
                    return (
                      <div key={pid} className="text-center p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${cfg.accentText}`}>{cfg.short}</div>
                        <div className={`text-sm font-black ${cfg.accentText}`}>${fmt(lenderInfo?.[cfg.pendingKey], 2, 4)}</div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={handleClaim}
                  disabled={txLoading || totalPending() === 0}
                  className="w-full py-5 bg-[#A8CFA3] hover:bg-[#d4ff3d] text-black font-black rounded-xl transition-all duration-200 hover:scale-[1.01] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {txLoading ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Processing…</>
                  ) : totalPending() === 0 ? (
                    '✓ Nothing to Claim'
                  ) : (
                    <><CheckCircle className="w-5 h-5" /> Claim ${fmt(totalPending(), 2, 8)} USDC</>
                  )}
                </button>
                {totalPending() === 0 && (
                  <p className="text-center text-[#444] text-xs mt-4">Interest accrues as borrowers repay loans. Keep deposits active to earn.</p>
                )}
              </div>

              {/* Interest rates */}
              <div>
                <div className="text-sm font-bold text-white mb-5">Current Interest Rates</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[RiskPool.LOW_RISK, RiskPool.MEDIUM_RISK, RiskPool.HIGH_RISK].map((pid) => {
                    const cfg = POOLS[pid];
                    const r = rates[cfg.ratesKey];
                    return (
                      <div key={pid} className={`p-5 rounded-2xl ${cfg.accentBg} border ${cfg.accentBorder}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${cfg.accentText}`}>{cfg.label}</div>
                        <div className={`text-2xl font-black ${cfg.accentText}`}>
                          {r ? `${fmtPct(r.baseRate)} – ${fmtPct(r.maxRate)}` : '—'}
                        </div>
                        <div className="text-[#555] text-[10px] mt-0.5 uppercase tracking-wider">APR Range</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <DmSans />
    </div>
  );
};

const DmSans = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
    select option { background: #1a1a1a; color: white; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
    input[type=number] { -moz-appearance: textfield; }
    * { scrollbar-width: thin; scrollbar-color: #333 transparent; }
  `}</style>
);

export default LenderDashboard;