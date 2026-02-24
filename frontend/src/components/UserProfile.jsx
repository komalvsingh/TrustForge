import { useEffect, useState } from "react";
import { useBlockchain } from "../context/BlockchainContext";
import Navbar from "./Navbar";
import {
  User, Shield, TrendingUp, History, Wallet, CheckCircle2,
  XCircle, Clock, ArrowRight, UserCheck, Star, Award, CircleDot,
  Activity, Zap, ArrowUpRight, ChevronRight
} from "lucide-react";

const UserProfile = () => {
  const {
    account,
    connectWallet,
    getUserProfile,
    getWalletMaturity,
    getActiveLoan,
    getLoanHistory,
    computeTrustScore,
    repayLoan,
    loading,
  } = useBlockchain();

  const [profile, setProfile]   = useState(null);
  const [maturity, setMaturity] = useState(null);
  const [loan, setLoan]         = useState(null);
  const [history, setHistory]   = useState([]);
  const [liveScore, setLiveScore] = useState(null);
  const [repaying, setRepaying] = useState(false);

  const loadProfile = async () => {
    try {
      const [p, m, l, h, score] = await Promise.all([
        getUserProfile(),
        getWalletMaturity(),
        getActiveLoan(),
        getLoanHistory(),
        computeTrustScore(),
      ]);
      setProfile(p);
      setMaturity(m);
      setLoan(l);
      setHistory(h || []);
      setLiveScore(score);
    } catch (err) {
      console.error("Profile Load Error:", err);
    }
  };

  useEffect(() => {
    if (account) loadProfile();
  }, [account]);

  const handleRepay = async () => {
    try {
      setRepaying(true);
      await repayLoan();
      await loadProfile();
    } catch (err) {
      console.error("Repay error:", err);
    } finally {
      setRepaying(false);
    }
  };

  const getRiskPoolColor = (pool) => {
    switch (Number(pool)) {
      case 0: return "var(--accent)";
      case 1: return "#f0b429";
      case 2: return "#f87171";
      default: return "var(--td)";
    }
  };

  const getRiskPoolName = (pool) => {
    switch (Number(pool)) {
      case 0: return "Low Risk";
      case 1: return "Medium Risk";
      case 2: return "High Risk";
      default: return "Unassigned";
    }
  };

  const getStatusStyle = (status) => {
    switch (Number(status)) {
      case 0: return { color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.2)" };
      case 1: return { color: "var(--accent)", bg: "var(--adim)", border: "rgba(181,212,168,0.2)" };
      case 2: return { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" };
      default: return { color: "var(--td)", bg: "rgba(255,255,255,0.05)", border: "var(--b)" };
    }
  };

  const getStatusName = (status) => {
    switch (Number(status)) {
      case 0: return "Active";
      case 1: return "Repaid";
      case 2: return "Defaulted";
      default: return "Unknown";
    }
  };

  const scoreDisplay = liveScore ?? profile?.liveTrustScore ?? 0;
  const scorePercent = Math.min((scoreDisplay / 1000) * 100, 100);

  const formatAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  // ── Not connected ────────────────────────────────────────────────────────────
  if (!account) {
    return (
      <div style={styles.pageWrap}>
        <style>{css}</style>
        <div className="noise"></div>
        <Navbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
          <div style={styles.connectCard}>
            <div style={styles.connectIcon}>
              <User size={32} color="var(--accent)" strokeWidth={1.5} />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 10 }}>
              Identity Portal
            </h1>
            <p style={{ fontSize: 14, color: "var(--td)", lineHeight: 1.75, marginBottom: 28, maxWidth: 320 }}>
              Access your TrustForge credentials and social reputation profile.
            </p>
            <button className="btn-p" style={{ width: "100%", justifyContent: "center", padding: "14px" }} onClick={connectWallet}>
              Authenticate Wallet <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading && !profile) {
    return (
      <div style={styles.pageWrap}>
        <style>{css}</style>
        <div className="noise"></div>
        <Navbar />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: 16 }}>
          <div style={styles.spinner}></div>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", letterSpacing: ".1em" }}>
            COMPILING PROFILE DATA...
          </span>
        </div>
      </div>
    );
  }

  // ── Main Profile ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.pageWrap}>
      <style>{css}</style>
      <div className="noise"></div>

      {/* bg orbs */}
      <div style={{ position: "absolute", top: 0, right: "20%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(181,212,168,.06) 0%, transparent 65%)", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: 0, left: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(181,212,168,.04) 0%, transparent 65%)", pointerEvents: "none" }}></div>

      <Navbar />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* ── Page Header ── */}
        <div className="fu" style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 44 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={styles.iconBadge}><UserCheck size={16} color="var(--accent)" strokeWidth={1.8} /></div>
              <span className="tag">IDENTITY PORTAL</span>
            </div>
            <h1 style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1 }}>
              User Profile
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <div className="ld"></div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--td)", letterSpacing: ".06em" }}>
                {formatAddress(account)}
              </span>
            </div>
          </div>

          {/* Quick stats pill */}
          <div style={styles.quickStatsPill}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--td)", letterSpacing: ".1em", marginBottom: 4 }}>TRUST SCORE</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)" }}>{scoreDisplay}</div>
            </div>
            <div style={{ width: 1, height: 36, background: "var(--b)" }}></div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--td)", letterSpacing: ".1em", marginBottom: 4 }}>RISK POOL</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: getRiskPoolColor(profile?.assignedPool) }}>
                {profile ? getRiskPoolName(profile.assignedPool) : "—"}
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: "var(--b)" }}></div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--td)", letterSpacing: ".1em", marginBottom: 4 }}>USERNAME</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>@{profile?.username || "—"}</div>
            </div>
          </div>
        </div>

        {/* ── Row 1: Identity + Score Card + Maturity ── */}
        <div className="fu d1" style={{ display: "grid", gridTemplateColumns: "1fr 340px 260px", gap: 16, marginBottom: 16 }}>

          {/* Identity Performance */}
          <div style={styles.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
              <Star size={13} color="var(--accent)" />
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)", letterSpacing: ".12em" }}>IDENTITY PERFORMANCE</span>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)", letterSpacing: ".08em", marginBottom: 6 }}>NETWORK HANDLE</div>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.03em" }}>@{profile?.username || "Incognito"}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
              <div style={styles.statBox}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--td)", letterSpacing: ".08em", marginBottom: 6 }}>MAX LIMIT</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)" }}>
                  {profile?.maxBorrowingLimit || "0"}
                  <span style={{ fontSize: 11, color: "var(--td)", marginLeft: 4 }}>USDC</span>
                </div>
              </div>
              <div style={styles.statBox}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--td)", letterSpacing: ".08em", marginBottom: 6 }}>VOUCH BONUS</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa", fontFamily: "var(--mono)" }}>
                  +{profile?.vouchBonus || 0}
                  <span style={{ fontSize: 11, color: "var(--td)", marginLeft: 4 }}>pts</span>
                </div>
              </div>
            </div>

            <div style={styles.metricsRow}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--td)" }}>Total Loans</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600 }}>{profile?.totalLoansTaken ?? "—"}</span>
              </div>
              <div style={{ height: 1, background: "var(--b)" }}></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={12} color="var(--accent)" />
                  <span style={{ fontSize: 12, color: "var(--td)" }}>Successful Repayments</span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>{profile?.successfulRepayments ?? "—"}</span>
              </div>
              <div style={{ height: 1, background: "var(--b)" }}></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <XCircle size={12} color="#f87171" />
                  <span style={{ fontSize: 12, color: "var(--td)" }}>Protocol Violations</span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: "#f87171" }}>{profile?.defaults ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Trust Score Card */}
          <div style={{ ...styles.card, background: "var(--grey)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(181,212,168,.5),transparent)", animation: "scan 5s linear infinite", pointerEvents: "none" }}></div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)", letterSpacing: ".1em", marginBottom: 14 }}>LIVE TRUST SCORE</div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1, color: "var(--accent)" }}>{scoreDisplay}</span>
              <span style={{ fontSize: 18, color: "var(--td)" }}>/1000</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ height: 6, background: "var(--bg3)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${scorePercent}%`, background: "linear-gradient(90deg, var(--accent2), var(--accent))", borderRadius: 99, boxShadow: "0 0 10px var(--aglow)", transition: "width 1s ease" }}></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)" }}>0</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)" }}>{scorePercent.toFixed(1)}%</span>
              </div>
            </div>

            {/* Score breakdown mini bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Payment History", max: 350, color: "var(--accent)" },
                { label: "Utilization", max: 300, color: "#60a5fa" },
                { label: "Wallet Age", max: 150, color: "#a78bfa" },
                { label: "Credit Mix", max: 100, color: "#f0b429" },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--td)" }}>{item.label}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--td)" }}>{item.max}pts</span>
                  </div>
                  <div style={{ height: 3, background: "var(--bg3)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "70%", background: item.color, borderRadius: 99, opacity: 0.6 }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 7 }}>
              <div className="ld" style={{ width: 6, height: 6 }}></div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)", letterSpacing: ".06em" }}>COMPUTED LIVE</span>
            </div>
          </div>

          {/* Wallet Maturity */}
          <div style={{ ...styles.card, background: "linear-gradient(135deg, #1a1a2e 0%, var(--grey) 100%)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#a78bfa", letterSpacing: ".1em", marginBottom: 18 }}>WALLET MATURITY</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: 14, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#a78bfa", fontFamily: "var(--mono)" }}>
                  {maturity?.maturityLevel ?? 0}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>Tier {maturity?.maturityLevel ?? 0} Veteran</div>
                  <div style={{ fontSize: 11, color: "var(--td)" }}>
                    Age: {maturity?.age ? Math.floor(maturity.age / 86400) : 0}d
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "var(--td)", lineHeight: 1.65 }}>
                Longevity grants exclusive benefits and higher borrowing multipliers.
              </p>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--td)" }}>Multiplier Benefit</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#a78bfa" }}>+{maturity?.maturityMultiplier ?? 0}%</span>
              </div>
              <div style={{ height: 4, background: "var(--bg3)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min((maturity?.maturityLevel ?? 0) * 25, 100)}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", borderRadius: 99, transition: "width 1s ease" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Loan ── */}
        {loan && loan.principal !== "0.0" && (
          <div className="fu d2" style={styles.activeLoanCard}>
            <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(181,212,168,.4),transparent)", animation: "scan 4s linear infinite", pointerEvents: "none" }}></div>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ width: 56, height: 56, background: "rgba(181,212,168,.1)", border: "1px solid rgba(181,212,168,.2)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TrendingUp size={24} color="var(--accent)" strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em" }}>Live Credit Operation</h2>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em", color: "var(--accent)", background: "var(--adim)", border: "1px solid rgba(181,212,168,.2)", padding: "3px 8px", borderRadius: 4 }}>
                    ACTIVE
                  </span>
                  {loan.isOverdue && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em", color: "#f87171", background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.2)", padding: "3px 8px", borderRadius: 4 }}>
                      OVERDUE
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
                  {[
                    { label: "Principal", value: `${loan.principal} USDC`, color: "var(--t)" },
                    { label: "Interest", value: `${loan.interestAmount} USDC`, color: "var(--accent)" },
                    { label: "Total Due", value: `${loan.totalRepayment} USDC`, color: "var(--t)" },
                    { label: "Deadline", value: new Date(Number(loan.dueDate) * 1000).toLocaleDateString(), color: loan.isOverdue ? "#f87171" : "#f0b429" },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--td)", letterSpacing: ".08em", marginBottom: 4 }}>{item.label.toUpperCase()}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: item.color, fontFamily: "var(--mono)" }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                className="btn-p"
                onClick={handleRepay}
                disabled={repaying || loading}
                style={{ flexShrink: 0, opacity: repaying ? 0.7 : 1 }}
              >
                {repaying ? "Processing..." : "Repay Now"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Loan History ── */}
        <div className="fu d3">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div style={styles.iconBadge}><History size={14} color="var(--td)" strokeWidth={1.8} /></div>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.03em" }}>Operational History</h2>
            <div style={{ flex: 1, height: 1, background: "var(--b)" }}></div>
            {history.length > 0 && (
              <span className="tag">{history.length} RECORDS</span>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--grey)", border: "1px dashed var(--b2)", borderRadius: 16 }}>
              <CircleDot size={40} color="var(--td)" style={{ margin: "0 auto 16px", opacity: 0.3 }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--tm)", marginBottom: 8 }}>Clean Slate Detected</h3>
              <p style={{ fontSize: 13, color: "var(--td)" }}>No historical loan data found for this identity.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {history.map((item, index) => {
                const statusStyle = getStatusStyle(item.status);
                return (
                  <div key={index} className="fc" style={{ padding: 22 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg3)", border: "1px solid var(--b)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: "var(--td)" }}>
                          #{history.length - index}
                        </div>
                        <div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--td)", letterSpacing: ".08em", marginBottom: 2 }}>PRINCIPAL</div>
                          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--mono)" }}>{item.principal} USDC</div>
                        </div>
                      </div>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".08em", padding: "3px 8px", borderRadius: 5, border: `1px solid ${statusStyle.border}`, background: statusStyle.bg, color: statusStyle.color }}>
                        {getStatusName(item.status)}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Clock size={11} color="var(--td)" />
                          <span style={{ fontSize: 11, color: "var(--td)" }}>Started</span>
                        </div>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{new Date(Number(item.startTime) * 1000).toLocaleDateString()}</span>
                      </div>
                      <div style={{ height: 1, background: "var(--b)" }}></div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--td)" }}>Total Repayment</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)" }}>{item.totalRepayment} USDC</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--td)" }}>Risk Pool</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: getRiskPoolColor(item.riskPool) }}>
                          {getRiskPoolName(item.riskPool)}
                        </span>
                      </div>
                      <div style={{ height: 1, background: "var(--b)" }}></div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--td)" }}>Interest</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{item.interestAmount} USDC</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// ── Styles Object ─────────────────────────────────────────────────────────────
const styles = {
  pageWrap: {
    fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
    background: "#111",
    minHeight: "100vh",
    color: "#f0ede8",
    overflowX: "hidden",
    position: "relative",
  },
  card: {
    background: "var(--bg2)",
    border: "1px solid var(--b)",
    borderRadius: 16,
    padding: "24px",
    transition: "border-color .3s",
  },
  statBox: {
    background: "var(--bg3)",
    borderRadius: 12,
    padding: "14px 16px",
  },
  metricsRow: {
    background: "var(--bg3)",
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    background: "rgba(255,255,255,.04)",
    border: "1px solid var(--b)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  quickStatsPill: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    background: "var(--grey)",
    border: "1px solid var(--b)",
    borderRadius: 14,
    padding: "14px 22px",
  },
  connectCard: {
    background: "var(--grey)",
    border: "1px solid var(--b)",
    borderRadius: 20,
    padding: "48px",
    textAlign: "center",
    maxWidth: 400,
    width: "100%",
  },
  connectIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: "var(--adim)",
    border: "1px solid rgba(181,212,168,.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  activeLoanCard: {
    background: "var(--grey)",
    border: "1px solid rgba(181,212,168,.2)",
    borderRadius: 16,
    padding: "24px 28px",
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid rgba(181,212,168,.15)",
    borderTop: "3px solid var(--accent)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

// ── Shared CSS (mirroring homepage) ──────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#111;--bg2:#1a1a1a;--bg3:#222;
    --grey:#1d1d1d;--grey2:#252525;--grey3:#2c2c2c;
    --accent:#b5d4a8;--accent2:#8fc47f;
    --adim:rgba(181,212,168,0.1);--aglow:rgba(181,212,168,0.22);
    --b:rgba(255,255,255,0.06);--b2:rgba(255,255,255,0.1);
    --t:#f0ede8;--tm:#999;--td:#555;
    --mono:'DM Mono',monospace;
  }
  body{font-family:'DM Sans',sans-serif}
  .btn-p{background:var(--accent);color:#0a150a;border:none;padding:11px 22px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .25s;font-family:'DM Sans',sans-serif}
  .btn-p:hover{background:var(--accent2);transform:translateY(-2px);box-shadow:0 8px 28px var(--aglow)}
  .btn-p:disabled{opacity:0.6;cursor:not-allowed;transform:none}
  .tag{font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--accent);background:var(--adim);border:1px solid rgba(181,212,168,.18);padding:3px 8px;border-radius:4px;display:inline-block}
  .fc{background:var(--grey);border:1px solid var(--b);border-radius:16px;transition:all .3s;position:relative;overflow:hidden;cursor:pointer}
  .fc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0;transition:opacity .4s}
  .fc:hover::before{opacity:1}
  .fc:hover{border-color:rgba(181,212,168,.2);transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,.3)}
  .ld{width:7px;height:7px;background:var(--accent);border-radius:50%;animation:pdot 2s infinite;position:relative;flex-shrink:0}
  .ld::after{content:'';position:absolute;inset:-3px;border:1px solid var(--accent);border-radius:50%;animation:pring 2s infinite}
  .noise{position:fixed;inset:0;pointer-events:none;z-index:999;opacity:.018;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:150px}
  .fu{animation:fadeInUp .7s ease forwards}
  .d1{animation-delay:.1s;opacity:0}
  .d2{animation-delay:.2s;opacity:0}
  .d3{animation-delay:.3s;opacity:0}
  @keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}
  @keyframes pring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}
  @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(2000%);opacity:0}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`;

export default UserProfile;