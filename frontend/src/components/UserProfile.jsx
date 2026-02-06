import { useEffect, useState } from "react";
import { useBlockchain } from "../context/BlockchainContext";
import Navbar from "./Navbar";
import {
  User,
  Shield,
  TrendingUp,
  History,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  UserCheck,
  Star,
  Award,
  CircleDot
} from "lucide-react";

const UserProfile = () => {
  const {
    account,
    connectWallet,
    getUserProfile,
    getWalletMaturity,
    getActiveLoan,
    getLoanHistory,
    loading,
    formatAddress,
  } = useBlockchain();

  const [profile, setProfile] = useState(null);
  const [maturity, setMaturity] = useState(null);
  const [loan, setLoan] = useState(null);
  const [history, setHistory] = useState([]);

  const loadProfile = async () => {
    try {
      const p = await getUserProfile();
      const m = await getWalletMaturity();
      const l = await getActiveLoan();
      const h = await getLoanHistory();

      setProfile(p);
      setMaturity(m);
      setLoan(l);
      setHistory(h || []);
    } catch (err) {
      console.error("Profile Load Error:", err);
    }
  };

  useEffect(() => {
    if (account) loadProfile();
  }, [account]);

  const getRiskPoolColor = (pool) => {
    switch (Number(pool)) {
      case 0: return "text-emerald-400";
      case 1: return "text-amber-400";
      case 2: return "text-rose-400";
      default: return "text-gray-400";
    }
  };

  const getRiskPoolName = (pool) => {
    switch (Number(pool)) {
      case 0: return "Low Risk Pool";
      case 1: return "Medium Risk Pool";
      case 2: return "High Risk Pool";
      default: return "Unassigned";
    }
  };

  const getStatusColor = (status) => {
    switch (Number(status)) {
      case 0: return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case 1: return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case 2: return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/20";
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

  if (!account) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden font-inter text-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>

        <div className="relative group max-w-md w-full">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 mx-auto mb-6">
              <User className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-3xl font-black mb-4">Identity Portal</h1>
            <p className="text-gray-400 font-light mb-8">Access your TrustForge credentials and social reputation profile.</p>
            <button
              onClick={connectWallet}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-black text-white shadow-lg hover:shadow-blue-500/40 hover:scale-[1.02] transition-all duration-300"
            >
              AUTHENTICATE WALLET
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-inter text-white pb-20">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-float"></div>
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] animate-float-delayed"></div>

      <Navbar />

      <main className="relative max-w-7xl mx-auto px-6 pt-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-fade-in-down">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                <UserCheck className="w-5 h-5 text-blue-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">User Dossier</h1>
            </div>
            {/* <div className="flex items-center gap-3 text-gray-400 font-mono text-xs tracking-widest px-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              VERIFIED IDENTITY: {formatAddress(account)}
            </div> */}
          </div>

          <div className="px-5 py-3 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-6">
            <div className="text-center">
              <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Reputation</div>
              <div className="text-xl font-black text-blue-400">{profile?.trustScore || 0}</div>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Status</div>
              <div className={`text-sm font-black uppercase ${profile ? getRiskPoolColor(profile.assignedPool) : 'text-gray-500'}`}>
                {profile ? getRiskPoolName(profile.assignedPool).split(' ')[0] : 'Scanning'}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6"></div>
            <div className="text-blue-400 font-black uppercase tracking-widest">Compiling Profile Data...</div>
          </div>
        )}

        {!loading && (
          <div className="space-y-12 animate-fade-in-up">
            {/* TOP CARDS: Profile & Maturity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Identity Details Card */}
              <div className="lg:col-span-2 relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl p-8 md:p-10">
                  <h3 className="text-xs text-gray-500 font-black uppercase tracking-[0.3em] mb-10 flex items-center gap-2">
                    <Star className="w-4 h-4 text-blue-400" />
                    Identity Performance
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Network Handle</div>
                        <div className="text-3xl font-black text-white">@{profile?.username || "Incognito"}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Max Limit</div>
                          <div className="text-2xl font-black text-blue-400">{profile?.maxBorrowingLimit} <span className="text-xs text-gray-500 ml-1">TFX</span></div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Trust Ranking</div>
                          <div className={`text-2xl font-black ${getRiskPoolColor(profile?.assignedPool)}`}>{profile?.trustScore}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Total Loans Conducted</span>
                        <span className="text-lg font-black">{profile?.totalLoansTaken}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-400/80">Successful Repayments</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-emerald-400">{profile?.successfulRepayments}</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-rose-400/80">Protocol Violations</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-rose-400">{profile?.defaults}</span>
                          <XCircle className="w-4 h-4 text-rose-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Maturity Card */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative h-full bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl p-8 flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>

                  <div>
                    <h3 className="text-xs text-indigo-400 font-black uppercase tracking-[0.3em] mb-8">Wallet Maturity</h3>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 text-3xl font-black">
                        {maturity?.maturityLevel || 0}
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Maturity Class</div>
                        <div className="text-xl font-black text-white">Tier {maturity?.maturityLevel} Veteran</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 font-light leading-relaxed">
                      Your longevity in the protocol grants you exclusive benefits and higher borrowing multipliers.
                    </p>
                  </div>

                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Multiplier Benefit</span>
                      <span className="text-sm font-black text-indigo-400">+{maturity?.maturityMultiplier}% Impact</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((maturity?.maturityLevel || 0) * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTIVE LOAN SECTION */}
            {loan && loan.principal !== "0.0" && (
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 rounded-3xl blur opacity-30"></div>
                <div className="relative bg-black/60 backdrop-blur-3xl border border-emerald-500/20 rounded-3xl p-8 md:p-12">
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                      <TrendingUp className="w-12 h-12 text-emerald-400" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                        <h2 className="text-3xl font-black">Live Credit Operation</h2>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30 animate-pulse">
                          Mission Critical
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div>
                          <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Principal</div>
                          <div className="text-xl font-black">{loan.principal} TFX</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Interest</div>
                          <div className="text-xl font-black text-emerald-400">{loan.interestAmount} TFX</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Total Due</div>
                          <div className="text-xl font-black text-white">{loan.totalRepayment} TFX</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Deadline</div>
                          <div className="text-sm font-black text-rose-400 font-mono">
                            {new Date(Number(loan.dueDate) * 1000).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <button className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black text-white shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-3">
                        REPAY NOW <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LOAN HISTORY SECTION */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                  <History className="w-4 h-4 text-gray-400" />
                </div>
                <h2 className="text-2xl font-black tracking-tight uppercase">Operational History</h2>
                <div className="h-px flex-1 bg-white/10"></div>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                  <CircleDot className="w-16 h-16 text-gray-700 mx-auto mb-6 opacity-50" />
                  <h3 className="text-xl font-bold text-gray-400 mb-2">Clean Slate Detected</h3>
                  <p className="text-gray-500 font-light">No historical loan data found for this identity in our network.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.map((item, index) => (
                    <div key={index} className="group/card relative bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/[0.08] transition-all duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 font-black text-xs">
                            #{history.length - index}
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Operation</div>
                            <div className="text-base font-black tracking-tight">{item.principal} TFX</div>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(item.status)}`}>
                          {getStatusName(item.status)}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Initialized
                          </span>
                          <span className="font-mono">{new Date(Number(item.startTime) * 1000).toLocaleDateString()}</span>
                        </div>
                        <div className="h-px bg-white/5"></div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Yield Accuracy</span>
                          <span className="text-sm font-black text-emerald-400">100% Verified</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Global CSS for Grid and Animations */}
      <style jsx global>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) scale(1.05); }
          50% { transform: translateY(-20px) scale(1); }
        }

        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 12s ease-in-out infinite; }

        .animate-fade-in-down { animation: fadeInDown 0.8s ease-out forwards; }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default UserProfile;
