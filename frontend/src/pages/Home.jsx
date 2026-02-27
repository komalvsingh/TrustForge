import { useState, useEffect, useRef } from "react";
import { Shield, TrendingUp, Lock, Users, Zap, CheckCircle, ArrowRight, ArrowUpRight, ChevronRight, Wifi, Star, Globe, Activity } from "lucide-react";
import Navbar from "../components/Navbar";
import { useBlockchain } from "../context/BlockchainContext";

const Home = () => {
  const { account, getAllPoolStats, getUserProfile, computeTrustScore, getActiveLoan } = useBlockchain();
  const [activeBar, setActiveBar] = useState(11);
  const [counter, setCounter] = useState({ vol: 0, users: 0, rate: 0 });
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);
  // Live on-chain data
  const [poolStats,   setPoolStats]   = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [liveScore,   setLiveScore]   = useState(null);
  const [activeLoan,  setActiveLoan]  = useState(null);

  useEffect(() => {
    const interval = setInterval(() => { setActiveBar(prev => (prev + 1) % 12); }, 900);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStatsVisible(true);
    }, { threshold: 0.3 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch public pool stats (no wallet needed)
  useEffect(() => {
    getAllPoolStats().then(ps => {
      if (!ps) return;
      setPoolStats(ps);
      // Derive TVL = sum of all pool liquidity
      const tvl = parseFloat(ps.lowRisk.totalLiquidity) + parseFloat(ps.medRisk.totalLiquidity) + parseFloat(ps.highRisk.totalLiquidity);
      const activeLoansTotal = parseFloat(ps.lowRisk.totalActiveLoans) + parseFloat(ps.medRisk.totalActiveLoans) + parseFloat(ps.highRisk.totalActiveLoans);
      // Animate counter toward real values (floor to 1 decimal)
      const steps = 60;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const ease = 1 - Math.pow(1 - step / steps, 3);
        setCounter({
          vol:   parseFloat((ease * tvl).toFixed(2)),
          users: Math.floor(ease * Math.max(activeLoansTotal, 1)),
          rate:  parseFloat((ease * 94.7).toFixed(1)),   // repayment rate: fallback
        });
        if (step >= steps) clearInterval(timer);
      }, 1600 / steps);
      return () => clearInterval(timer);
    }).catch(() => {});
  }, []);

  // Fetch per-user data when wallet connected
  useEffect(() => {
    if (!account) { setUserProfile(null); setLiveScore(null); setActiveLoan(null); return; }
    Promise.all([getUserProfile(), computeTrustScore(), getActiveLoan()])
      .then(([prof, score, loan]) => {
        setUserProfile(prof);
        setLiveScore(score);
        setActiveLoan(loan);
      }).catch(() => {});
  }, [account]);

  // Fallback counter animation when pool stats unavailable
  useEffect(() => {
    if (!statsVisible || poolStats) return;
    const steps = 60; let step = 0;
    const timer = setInterval(() => {
      step++;
      const ease = 1 - Math.pow(1 - step / steps, 3);
      setCounter({ vol: Math.floor(ease * 24) / 10, users: Math.floor(ease * 12840), rate: Math.floor(ease * 947) / 10 });
      if (step >= steps) clearInterval(timer);
    }, 1600 / steps);
    return () => clearInterval(timer);
  }, [statsVisible, poolStats]);

  // Derived display helpers
  const displayScore = liveScore ?? (userProfile?.liveTrustScore ?? null);
  const displayLimit = userProfile ? parseFloat(userProfile.maxBorrowingLimit || 0) : null;
  const displayTier  = displayScore >= 700 ? "ELITE TIER" : displayScore >= 400 ? "TRUSTED TIER" : displayScore !== null ? "STARTER TIER" : "TRUSTED TIER";
  const scorePct     = displayScore !== null ? Math.min(100, (displayScore / 1000) * 100) : 78.4;
  const tvlDisplay   = poolStats
    ? (() => { const v = parseFloat(poolStats.lowRisk.totalLiquidity) + parseFloat(poolStats.medRisk.totalLiquidity) + parseFloat(poolStats.highRisk.totalLiquidity); return v >= 1000 ? `$${(v/1000).toFixed(1)}K` : `$${v.toFixed(2)}`; })()
    : "$2.4M";

  const features = [
    { icon: Shield, title: "Trust Over Collateral", description: "Borrow without assets. Your on-chain behavior is your credit score.", tag: "CORE", stat: "0 collateral required" },
    { icon: TrendingUp, title: "Risk-Based Pricing", description: "Lower trust = slightly higher interest. Build trust, earn better rates.", tag: "DYNAMIC", stat: "Rates from 3.2% APR" },
    { icon: Lock, title: "Controlled Exposure", description: "New users start small. Defaults hurt your score, not the system.", tag: "SECURE", stat: "Progressive limits" },
    { icon: Users, title: "No Gaming the System", description: "New wallets = low trust = tiny limits. Cheating doesn't pay.", tag: "ANTI-FRAUD", stat: "Sybil-resistant" },
    { icon: Zap, title: "Behavior-Driven", description: "We don't ask who you are. We track how you behave.", tag: "ON-CHAIN", stat: "Real-time scoring" },
    { icon: CheckCircle, title: "Financial Inclusion", description: "No KYC, no collateral, no barriers. Just fair lending for all.", tag: "INCLUSIVE", stat: "Global access" },
  ];

  const recentTx = [
    { addr: "0x3f...a2d1", amount: "+$1,200", trust: 784, time: "2m ago", type: "borrow" },
    { addr: "0x8c...b391", amount: "-$540", trust: 612, time: "5m ago", type: "repay" },
    { addr: "0x1d...f904", amount: "+$3,000", trust: 891, time: "11m ago", type: "borrow" },
    { addr: "0x5a...c210", amount: "-$200", trust: 423, time: "18m ago", type: "repay" },
  ];

  const barHeights = [30, 45, 38, 55, 48, 62, 58, 72, 68, 80, 76, 88];

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: "#111", minHeight: "100vh", color: "#f0ede8", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#111;--bg2:#1a1a1a;--bg3:#222;
          --grey:#1d1d1d;--grey2:#252525;--grey3:#2c2c2c;
          --accent:#b5d4a8;--accent2:#8fc47f;
          --adim:rgba(181,212,168,0.1);--aglow:rgba(181,212,168,0.22);
          --b:rgba(255,255,255,0.06);--b2:rgba(255,255,255,0.1);
          --bh:rgba(181,212,168,0.28);
          --t:#f0ede8;--tm:#999;--td:#555;
          --mono:'DM Mono',monospace;
        }
        .nav-a{color:var(--td);text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
        .nav-a:hover{color:var(--t)}
        .btn-p{background:var(--accent);color:#0a150a;border:none;padding:13px 26px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .25s;font-family:'DM Sans',sans-serif;position:relative;overflow:hidden}
        .btn-p:hover{background:var(--accent2);transform:translateY(-2px);box-shadow:0 8px 32px var(--aglow)}
        .btn-g{background:transparent;color:var(--tm);border:1px solid var(--b2);padding:13px 26px;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif}
        .btn-g:hover{border-color:rgba(255,255,255,.18);color:var(--t);background:rgba(255,255,255,.03)}
        .card{background:var(--bg2);border:1px solid var(--b);border-radius:16px;transition:all .3s}
        .card:hover{border-color:var(--b2)}
        .cardg{background:var(--grey);border:1px solid var(--b);border-radius:16px;transition:all .3s}
        .cardg:hover{border-color:var(--b2);background:var(--grey2)}
        .tag{font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--accent);background:var(--adim);border:1px solid rgba(181,212,168,.18);padding:3px 8px;border-radius:4px;display:inline-block}
        .tgg{font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--tm);background:rgba(255,255,255,.05);border:1px solid var(--b2);padding:3px 8px;border-radius:4px;display:inline-block}
        .sc{font-family:var(--mono);font-size:11px;color:var(--accent);background:var(--adim);padding:2px 7px;border-radius:4px}
        .fc{background:var(--grey);border:1px solid var(--b);border-radius:16px;padding:28px;transition:all .3s;position:relative;overflow:hidden;cursor:pointer}
        .fc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0;transition:opacity .4s}
        .fc::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,rgba(181,212,168,.05) 0%,transparent 60%);opacity:0;transition:opacity .4s}
        .fc:hover::before,.fc:hover::after{opacity:1}
        .fc:hover{border-color:rgba(181,212,168,.2);transform:translateY(-3px);box-shadow:0 20px 60px rgba(0,0,0,.35)}
        .iw{width:44px;height:44px;border-radius:11px;background:var(--adim);border:1px solid rgba(181,212,168,.15);display:flex;align-items:center;justify-content:center;margin-bottom:18px;transition:all .3s}
        .fc:hover .iw{background:rgba(181,212,168,.18);border-color:rgba(181,212,168,.35);transform:scale(1.06)}
        .cb{flex:1;border-radius:3px 3px 0 0;transition:all .5s ease;cursor:pointer;background:rgba(181,212,168,.13)}
        .cb.act{background:var(--accent);box-shadow:0 0 14px rgba(181,212,168,.4)}
        .cb:hover{background:rgba(181,212,168,.38)}
        .tx-r{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--b);cursor:pointer;transition:all .2s;border-radius:8px}
        .tx-r:last-child{border-bottom:none}
        .tx-r:hover{background:rgba(255,255,255,.025);margin:0 -14px;padding:12px 14px}
        .prog-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent2),var(--accent));animation:pfill 1.4s .5s ease forwards;width:0;box-shadow:0 0 10px var(--aglow)}
        .ld{width:7px;height:7px;background:var(--accent);border-radius:50%;animation:pdot 2s infinite;position:relative;flex-shrink:0}
        .ld::after{content:'';position:absolute;inset:-3px;border:1px solid var(--accent);border-radius:50%;animation:pring 2s infinite}
        .noise{position:fixed;inset:0;pointer-events:none;z-index:999;opacity:.018;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:150px}
        @keyframes pfill{from{width:0}to{width:78.4%}}
        @keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}
        @keyframes pring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}
        @keyframes fu{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sl{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:translateX(0)}}
        @keyframes sr{from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:translateX(0)}}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(800%);opacity:0}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes bglow{0%,100%{box-shadow:0 0 0 1px rgba(181,212,168,.08)}50%{box-shadow:0 0 0 1px rgba(181,212,168,.3),0 0 40px rgba(181,212,168,.08)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .fu{animation:fu .7s ease forwards}
        .sl{animation:sl .7s ease forwards;opacity:0}
        .sr{animation:sr .7s ease forwards;opacity:0}
        .d1{animation-delay:.1s;opacity:0}
        .d2{animation-delay:.22s;opacity:0}
        .d3{animation-delay:.34s;opacity:0}
        .d4{animation-delay:.46s;opacity:0}
        .d5{animation-delay:.58s;opacity:0}
        .bglow{animation:bglow 3s infinite}
        .plan-card{padding:28px;border-radius:16px;transition:all .3s}
        .plan-card:hover{transform:translateY(-4px)}
        .ticker-w{overflow:hidden;white-space:nowrap;flex:1}
        .ticker-i{display:inline-flex;animation:ticker 30s linear infinite}
        .t-item{display:inline-flex;align-items:center;gap:8px;padding:0 28px;font-family:var(--mono);font-size:11px;color:var(--td)}
        .t-dot{width:3px;height:3px;border-radius:50%;background:var(--b2)}
        .sep{height:1px;background:var(--b)}
        .section-grey{background:var(--grey);border-top:1px solid var(--b);border-bottom:1px solid var(--b)}
        .shimmer-bg{background:linear-gradient(90deg,var(--bg3) 25%,rgba(255,255,255,.06) 50%,var(--bg3) 75%);background-size:200% 100%;animation:shimmer 2s infinite;border-radius:6px}
      `}</style>

      <div className="noise"></div>

      {/* TICKER */}
      <div style={{ background: "#0c0c0c", borderBottom: "1px solid var(--b)", height: 34, display: "flex", alignItems: "center" }}>
        <div className="ticker-w">
          <div className="ticker-i">
            {[...Array(2)].map((_, ri) => {
              const tickerItems = [
                `Total Liquidity: ${tvlDisplay}`,
                displayScore !== null ? `Your Score: ${displayScore} ✦` : "Trust Score: — ✦",
                poolStats ? `Active Loans: ${(parseFloat(poolStats.lowRisk.totalActiveLoans)+parseFloat(poolStats.medRisk.totalActiveLoans)+parseFloat(poolStats.highRisk.totalActiveLoans)).toFixed(2)} USDC` : "Active Loans: loading…",
                `Total Liquidity: ${tvlDisplay}`,
                "Repayment Rate: 94.7%",
                "Avg APR: 5.8%",
                poolStats ? `Pool Health: ✓ Operational` : "Protocol Health: ✓ Excellent",
                account ? `Wallet: ${account.slice(0,6)}…${account.slice(-4)}` : "Connect wallet to borrow",
              ];
              return tickerItems.map((item, i) => (
                <span key={`${ri}-${i}`} className="t-item"><span className="t-dot"></span>{item}</span>
              ));
            })}
          </div>
        </div>
        <div style={{ padding: "0 14px", borderLeft: "1px solid var(--b)", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <div className="ld" style={{ width: 6, height: 6 }}></div>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)", letterSpacing: ".08em" }}>LIVE</span>
        </div>
      </div>

      <Navbar/>

      {/* HERO */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px 80px", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(181,212,168,.05) 0%, transparent 65%)", pointerEvents: "none" }}></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
          {/* LEFT */}
          <div>
            <div className="fu" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, padding: "7px 14px", borderRadius: 99, background: "rgba(181,212,168,.07)", border: "1px solid rgba(181,212,168,.2)" }}>
              <div className="ld"></div>
              <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "var(--mono)", letterSpacing: ".07em" }}>LIVE ON ETHEREUM MAINNET</span>
            </div>
            <h1 className="fu d1" style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-.04em", marginBottom: 22 }}>
              Lend without<br />
              <span style={{ color: "var(--accent)", position: "relative", display: "inline-block" }}>
                collateral.
                <span style={{ position: "absolute", bottom: -4, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--accent), transparent)", borderRadius: 2 }}></span>
              </span><br />Build trust.
            </h1>
            <p className="fu d2" style={{ fontSize: 16, color: "var(--td)", lineHeight: 1.75, marginBottom: 36, maxWidth: 430 }}>
              TrustForge replaces collateral with on-chain reputation. Your wallet history, transaction behavior, and repayment record determine your borrowing power.
            </p>
            <div className="fu d3" style={{ display: "flex", gap: 12, marginBottom: 36 }}>
              <button className="btn-p" style={{ padding: "14px 28px", fontSize: 15 }}>Start Borrowing <ArrowRight size={15} /></button>
              <button className="btn-g" style={{ padding: "14px 28px", fontSize: 15 }}>View Protocol</button>
            </div>
            <div className="fu d4" style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex" }}>
                {["#b5d4a8","#8fc47f","#6daf5c","#4d9a3a","#2d8520"].map((c, i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: "2px solid #111", marginLeft: i > 0 ? -9 : 0, boxShadow: "0 2px 10px rgba(0,0,0,.5)" }}></div>
                ))}
              </div>
              <span style={{ fontSize: 13, color: "var(--td)", lineHeight: 1.6 }}>
                {poolStats
                  ? <><strong style={{ color: "var(--t)" }}>{tvlDisplay}</strong> total liquidity in pools</>                  : <><strong style={{ color: "var(--t)" }}>12,840</strong> borrowers already building trust</>}
              </span>
            </div>
          </div>

          {/* RIGHT — dashboard card */}
          <div className="sl d2">
            <div className="card bglow" style={{ padding: 24, borderRadius: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, right: 0, height: "1px", background: "linear-gradient(90deg,transparent,rgba(181,212,168,.4),transparent)", animation: "scan 5s linear infinite", pointerEvents: "none", zIndex: 1 }}></div>
              {/* Trust score */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)", marginBottom: 6, letterSpacing: ".06em" }}>TRUST SCORE</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }}>
                      {displayScore !== null ? displayScore : account ? "…" : "784"}
                    </span>
                    {displayScore !== null && <span className="sc">{displayScore >= 700 ? "Elite ✦" : displayScore >= 400 ? "Trusted" : "Starter"}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <span className="tgg">{displayTier}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div className="ld" style={{ width: 6, height: 6 }}></div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)" }}>{account ? "Live" : "Demo"}</span>
                  </div>
                </div>
              </div>
              {/* Score bar */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ height: 6, background: "var(--bg3)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${scorePct}%`, background: "linear-gradient(90deg,var(--accent2),var(--accent))", borderRadius: 99, transition: "width 1s ease" }}></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)" }}>0</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)" }}>
                    {displayScore !== null ? `${displayScore} / 1000` : account ? "Loading…" : "784 / 1000"}
                  </span>
                </div>
              </div>
              {/* Borrow limit */}
              <div style={{ background: "var(--bg3)", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--td)" }}>Borrow Limit</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--t)" }}>
                    {displayLimit !== null ? `$${displayLimit.toFixed(2)} USDC` : account ? "Loading…" : "$5,000 USDC"}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "var(--bg2)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: displayLimit !== null ? `${Math.min(100, (displayLimit / 20) * 100)}%` : "64%", background: "var(--accent)", borderRadius: 99, transition: "width 1s ease" }}></div>
                </div>
              </div>
              {/* Mini chart */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--td)" }}>Score History</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>12W</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 52 }}>
                  {barHeights.map((h, i) => (
                    <div key={i} className={`cb ${i === activeBar ? "act" : ""}`} style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  {
                    l: "Active Loan",
                    v: activeLoan ? `$${parseFloat(activeLoan.principal).toFixed(2)}` : account ? "No loan" : "$1,200",
                    s: activeLoan ? `Due ${new Date(activeLoan.dueDate * 1000).toLocaleDateString("en-US",{month:"short",day:"numeric"})}` : account ? "— none active" : "Due Mar 15"
                  },
                  {
                    l: "Borrow Limit",
                    v: displayLimit !== null ? `$${displayLimit.toFixed(0)}` : account ? "…" : "$5,000",
                    s: displayScore !== null ? `Score: ${displayScore}` : "APR trust-based"
                  }
                ].map((item, i) => (
                  <div key={i} style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "var(--td)", marginBottom: 4 }}>{item.l}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 17, fontWeight: 600, color: "var(--accent)", marginBottom: 2 }}>{item.v}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)" }}>{item.s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP — grey section */}
      <div ref={statsRef} style={{ background: "var(--grey)", borderTop: "1px solid var(--b)", borderBottom: "1px solid var(--b)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              {
                label: "Total Liquidity",
                value: poolStats
                  ? (() => { const v = parseFloat(poolStats.lowRisk.totalLiquidity)+parseFloat(poolStats.medRisk.totalLiquidity)+parseFloat(poolStats.highRisk.totalLiquidity); return v >= 1 ? `$${v.toFixed(2)}` : `$${counter.vol.toFixed(1)}M`; })()
                  : `$${counter.vol.toFixed(1)}M`,
                change: "+live", icon: TrendingUp
              },
              {
                label: "Active Loans (USDC)",
                value: poolStats
                  ? (() => { const v = parseFloat(poolStats.lowRisk.totalActiveLoans)+parseFloat(poolStats.medRisk.totalActiveLoans)+parseFloat(poolStats.highRisk.totalActiveLoans); return `$${v.toFixed(2)}`; })()
                  : counter.users.toLocaleString(),
                change: "+live", icon: Users
              },
              { label: "Repayment Rate", value: `${counter.rate}%`, change: "+0.3%", icon: CheckCircle },
              {
                label: "Your Trust Score",
                value: displayScore !== null ? String(displayScore) : account ? "…" : "641",
                change: account && displayScore !== null ? (displayScore >= 700 ? "Elite" : displayScore >= 400 ? "Trusted" : "Starter") : "+live",
                icon: Star
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} style={{ padding: "32px 24px", borderRight: i < 3 ? "1px solid var(--b)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <Icon size={15} color="var(--td)" strokeWidth={1.5} />
                    <span className="sc">{s.change}</span>
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.04em", marginBottom: 4, fontFamily: "var(--mono)" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "var(--td)" }}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FEATURES — grey bg */}
      <section style={{ background: "var(--grey)", padding: "72px 0 80px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{ flex: 1, height: 1, background: "var(--b)" }}></div>
            <span className="tag">HOW IT WORKS</span>
            <div style={{ flex: 1, height: 1, background: "var(--b)" }}></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36 }}>
            <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-.035em", lineHeight: 1.08 }}>
              Six principles<br />powering the protocol
            </h2>
            <button className="btn-g" style={{ display: "flex", alignItems: "center", gap: 6 }}>Read whitepaper <ArrowUpRight size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="fc" style={{ animationDelay: `${i * 80}ms` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div className="iw"><Icon size={18} color="var(--accent)" strokeWidth={1.8} /></div>
                    <span className="tag">{f.tag}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, letterSpacing: "-.02em" }}>{f.title}</h3>
                  <p style={{ fontSize: 13.5, color: "var(--td)", lineHeight: 1.7, marginBottom: 20 }}>{f.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid var(--b)" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--tm)" }}>{f.stat}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--td)" }}>
                      <span style={{ fontSize: 12 }}>Explore</span><ChevronRight size={12} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DISCOVER — dark grey like Monarch */}
      <section style={{ background: "#181818", padding: "80px 0", borderTop: "1px solid var(--b)", borderBottom: "1px solid var(--b)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div>
              <div className="tag" style={{ marginBottom: 20 }}>GET STARTED</div>
              <h2 style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1.08, marginBottom: 14 }}>
                Discover what's<br />
                <em style={{ fontStyle: "italic", color: "var(--accent)", fontWeight: 600 }}>amazing</em> about<br />
                TrustForge
              </h2>
              <div style={{ width: 44, height: 2, background: "var(--accent)", borderRadius: 2, marginBottom: 20 }}></div>
              <p style={{ fontSize: 15, color: "var(--td)", lineHeight: 1.75, marginBottom: 32, maxWidth: 370 }}>
                Track and manage decentralized loans, from repayment schedules to refinancing options — all powered by your on-chain trust score.
              </p>
              <button className="btn-p">Get the App <ArrowRight size={15} /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--grey)", border: "1px solid var(--b2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Globe size={18} color="var(--td)" strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>500K+ users</div>
                  <div style={{ fontSize: 12, color: "var(--td)" }}>Most downloaded DeFi lending app</div>
                </div>
                <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={11} color="var(--accent)" fill="var(--accent)" />)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { n: "1.", icon: Wifi, title: "All your wallets, one place", desc: "Connect any EVM wallet. No KYC, no registration — just your address.", green: true },
                { n: "2.", icon: Activity, title: "Get personalized insights", desc: "We analyze your on-chain history and generate a real-time Trust Score.", green: false },
                { n: "3.", icon: Shield, title: "Your finances, safe and secure", desc: "All positions are on-chain. No custodial risk. Fully transparent.", green: false },
              ].map((step, i) => (
                <div key={i} style={{
                  padding: "20px 22px", borderRadius: 14,
                  background: step.green ? "var(--accent)" : "var(--grey)",
                  border: step.green ? "none" : "1px solid var(--b)",
                  display: "flex", alignItems: "flex-start", gap: 16, cursor: "pointer", transition: "all .25s"
                }}>
                  <div style={{ minWidth: 38, height: 38, borderRadius: 10, background: step.green ? "rgba(0,0,0,.12)" : "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <step.icon size={16} color={step.green ? "#0a150a" : "var(--accent)"} strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: step.green ? "#0a150a" : "var(--t)", marginBottom: 4 }}>{step.title}</div>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: step.green ? "rgba(10,21,10,.2)" : "var(--b2)", lineHeight: 1 }}>{step.n}</span>
                    </div>
                    <div style={{ fontSize: 13, color: step.green ? "rgba(10,21,10,.6)" : "var(--td)", lineHeight: 1.6 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LIVE ACTIVITY + INSIGHTS — grey */}
      <section style={{ background: "var(--grey)", padding: "72px 0 80px", borderBottom: "1px solid var(--b)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
            {/* Activity feed */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div className="tag" style={{ marginBottom: 10 }}>STATISTICS</div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em" }}>Live activity feed</h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div className="ld" style={{ width: 6, height: 6 }}></div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)" }}>LIVE</span>
                </div>
              </div>
              <div style={{ background: "var(--bg2)", border: "1px solid var(--b)", borderRadius: 14, padding: "0 14px" }}>
                {recentTx.map((tx, i) => (
                  <div key={i} className="tx-r">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 99, background: tx.type === "borrow" ? "var(--adim)" : "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {tx.type === "borrow" ? <ArrowRight size={13} color="var(--accent)" /> : <ArrowUpRight size={13} color="var(--tm)" />}
                      </div>
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--t)", marginBottom: 2 }}>{tx.addr}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)" }}>Score: {tx.trust}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: tx.type === "borrow" ? "var(--accent)" : "var(--tm)", marginBottom: 2 }}>{tx.amount}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)" }}>{tx.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div>
              <div style={{ marginBottom: 20 }}>
                <div className="tag" style={{ marginBottom: 10 }}>INSIGHTS</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em" }}>Get personalized insights</h3>
              </div>
              <div style={{ background: "var(--bg2)", border: "1px solid var(--b)", borderRadius: 14, padding: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)" }}>SCORE HISTORY</span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>$ 4,118</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--tm)" }}>$ 2,567</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                    {[22,35,28,50,42,60,55,75,65,85,70,95,80,88].map((h, i) => (
                      <div key={i} style={{ flex: 1, borderRadius: "3px 3px 0 0", height: `${h}%`, background: i === 13 ? "var(--accent)" : i >= 10 ? "rgba(181,212,168,.28)" : "rgba(181,212,168,.09)", boxShadow: i === 13 ? "0 0 12px rgba(181,212,168,.4)" : "none", transition: "all .3s" }}></div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul"].map(m => (
                      <span key={m} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--td)" }}>{m}</span>
                    ))}
                  </div>
                </div>
                {[
                  {
                    label: "Wallet Age",
                    value: userProfile ? `${(userProfile.walletAge / 86400).toFixed(0)} days` : "— connect wallet",
                    pct:   userProfile ? Math.min(100, (userProfile.walletAge / (90 * 86400)) * 100) : 70
                  },
                  {
                    label: "Repayment History",
                    value: userProfile && userProfile.totalLoansTaken > 0
                      ? `${Math.round((userProfile.successfulRepayments / userProfile.totalLoansTaken) * 100)}%`
                      : userProfile ? "No loans yet" : "100%",
                    pct:   userProfile && userProfile.totalLoansTaken > 0
                      ? Math.round((userProfile.successfulRepayments / userProfile.totalLoansTaken) * 100)
                      : 100
                  },
                  {
                    label: "Trust Score",
                    value: displayScore !== null ? `${displayScore} / 1000` : account ? "…" : "641 / 1000",
                    pct:   displayScore !== null ? Math.min(100, (displayScore / 1000) * 100) : 64
                  },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: i < 2 ? 14 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: "var(--td)" }}>{item.label}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--t)" }}>{item.value}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: "var(--bg3)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${item.pct}%`, background: "linear-gradient(90deg,var(--accent2),var(--accent))", borderRadius: 99 }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANS — darker grey like Monarch pricing */}
      <section style={{ background: "#181818", padding: "80px 0", borderBottom: "1px solid var(--b)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
            <div>
              <div className="tag" style={{ marginBottom: 14 }}>TRUST TIERS</div>
              <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-.035em" }}>Choose a plan</h2>
            </div>
            <p style={{ fontSize: 14, color: "var(--td)", maxWidth: 260, textAlign: "right", lineHeight: 1.7 }}>
              Your tier auto-upgrades as your trust score grows over time.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { tier: "Starter", score: "0–400 TRUST", limit: "$500", rate: "12% APR", perMonth: "per month", features: ["Up to $500 borrow limit", "Basic trust scoring", "Weekly repayments", "Email support"], cta: "Begin building", featured: false },
              { tier: "Growth", score: "401–700 TRUST", limit: "$3,000", rate: "6.5% APR", perMonth: "per month", features: ["Up to $3,000 borrow limit", "Advanced trust analytics", "Flexible repayments", "30-day moneyback guarantee"], cta: "Start borrowing", featured: true, badge: "POPULAR" },
              { tier: "Elite", score: "701–1000 TRUST", limit: "$25,000", rate: "3.2% APR", perMonth: "per month", features: ["Up to $25,000 borrow limit", "Priority scoring", "Custom repayment terms", "Dedicated training + API access"], cta: "Book a Demo", featured: false },
            ].map((plan, i) => (
              <div key={i} className="plan-card" style={{
                background: plan.featured ? "var(--accent)" : "var(--grey)",
                border: `1px solid ${plan.featured ? "transparent" : "var(--b)"}`,
                color: plan.featured ? "#0a150a" : "var(--t)",
                boxShadow: plan.featured ? "0 0 60px rgba(181,212,168,.18), 0 0 120px rgba(181,212,168,.07)" : "none",
                position: "relative", overflow: "hidden"
              }}>
                {plan.badge && (
                  <div style={{ position: "absolute", top: 16, right: 16, fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em", background: "#0a150a", color: "var(--accent)", padding: "3px 8px", borderRadius: 4 }}>{plan.badge}</div>
                )}
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".08em", opacity: .55, marginBottom: 8 }}>{plan.score}</div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 18 }}>{plan.tier}</div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-.04em" }}>{plan.limit}</span>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 17, fontWeight: 600, opacity: .65, marginBottom: 6 }}>{plan.rate}</div>
                <div style={{ fontSize: 12, opacity: .5, marginBottom: 24, fontFamily: "var(--mono)" }}>{plan.perMonth}</div>
                <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                  {plan.features.map((f, fi) => (
                    <div key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <CheckCircle size={13} color={plan.featured ? "#0a150a" : "var(--accent)"} strokeWidth={2} style={{ marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, opacity: plan.featured ? .75 : .8, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button style={{
                  width: "100%", padding: "13px", borderRadius: 10,
                  background: plan.featured ? "#0a150a" : "rgba(255,255,255,.06)",
                  color: plan.featured ? "var(--accent)" : "var(--t)",
                  border: plan.featured ? "none" : "1px solid var(--b2)",
                  fontWeight: 600, fontSize: 14, cursor: "pointer",
                  fontFamily: "DM Sans,sans-serif", transition: "all .2s"
                }}>{plan.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 24px 80px" }}>
        <div style={{ background: "var(--grey)", border: "1px solid var(--b)", borderRadius: 20, padding: "60px 64px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(181,212,168,.07) 0%, transparent 68%)", pointerEvents: "none" }}></div>
          <div>
            <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-.04em", marginBottom: 12 }}>
              Ready to build your <span style={{ color: "var(--accent)" }}>Trust?</span>
            </h2>
            <p style={{ fontSize: 15, color: "var(--td)", maxWidth: 420, lineHeight: 1.75 }}>
              Start with small loans, build your on-chain reputation, and unlock better rates as you prove yourself trustworthy.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            <button className="btn-g" style={{ whiteSpace: "nowrap" }}>View Docs</button>
            <button className="btn-p" style={{ whiteSpace: "nowrap", padding: "14px 28px" }}>Start Lending <ArrowRight size={15} /></button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "var(--grey)", borderTop: "1px solid var(--b)", padding: "36px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={12} color="#0a150a" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.02em" }}>TrustForge</span>
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              {["Documentation","Whitepaper","Community","GitHub"].map(link => (
                <a key={link} href="#" style={{ fontSize: 13, color: "var(--td)", textDecoration: "none", transition: "color .2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--t)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--td)"}>{link}</a>
              ))}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--td)" }}>© 2025 TrustForge</div>
          </div>
          <div className="sep" style={{ marginBottom: 20 }}></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--td)" }}>Secured by blockchain • Fully transparent • Community driven</span>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div className="ld" style={{ width: 6, height: 6 }}></div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)" }}>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
