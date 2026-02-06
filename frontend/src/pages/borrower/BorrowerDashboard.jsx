import { useEffect, useState } from "react";
import { useBlockchain } from "../../context/BlockchainContext";
import Navbar from "../../components/Navbar";
import {
  User,
  Shield,
  TrendingUp,
  ArrowRight,
  History,
  Clock,
  AlertCircle,
  Sparkles,
  CheckCircle,
  Award,
  Wallet,
  Wifi,
  BarChart3
} from "lucide-react";

const BorrowerDashboard = () => {
  const {
    account,
    connectWallet,
    getUserProfile,
    getActiveLoan,
    getWalletMaturity,
    requestLoan,
    repayLoan,
    getLoanHistory,
    loading,
  } = useBlockchain();

  const [profile, setProfile] = useState(null);
  const [loan, setLoan] = useState(null);
  const [maturity, setMaturity] = useState(null);
  const [history, setHistory] = useState([]);
  const [repayLoading, setRepayLoading] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const poolMap = ["LOW", "MEDIUM", "HIGH"];
  const statusMap = ["ACTIVE", "REPAID", "DEFAULTED"];

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const loadData = async () => {
    try {
      const p = await getUserProfile();
      const l = await getActiveLoan();
      const m = await getWalletMaturity();
      const h = await getLoanHistory();

      setProfile(p);
      setLoan(l);
      setMaturity(m);
      setHistory(h);
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  useEffect(() => {
    if (account) loadData();
  }, [account, repayLoading]);

  const handleRequestLoan = async () => {
    const amt = parseFloat(loanAmount);
    const dur = parseInt(duration);

    if (isNaN(amt) || amt <= 0) return showMessage("error", "Enter valid amount");
    if (isNaN(dur) || dur <= 0) return showMessage("error", "Enter valid duration");

    try {
      setTxLoading(true);
      showMessage("info", "Requesting loan...");
      await requestLoan(amt.toString(), dur * 86400);
      showMessage("success", "Loan Requested Successfully! ✅");
      setLoanAmount("");
      setDuration("");
      loadData();
    } catch (err) {
      console.error(err);
      showMessage("error", "Failed to request loan ❌");
    } finally {
      setTxLoading(false);
    }
  };

  const handleRepay = async () => {
    try {
      setRepayLoading(true);
      showMessage("info", "Processing repayment...");
      await repayLoan();

      showMessage("success", "Loan repaid successfully! ✅");
      loadData();
    } catch (err) {
      console.error(err);
      showMessage("error", "Repay failed ❌");
    } finally {
      setRepayLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden font-inter text-white flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] animate-float-delayed"></div>

        <div className="relative z-10 text-center animate-fade-in-up">
          <div className="relative group mb-8 inline-block">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-50"></div>
            <div className="relative w-24 h-24 bg-black rounded-full flex items-center justify-center border border-white/10">
              <Wallet className="w-10 h-10 text-blue-400" />
            </div>
          </div>
          <h2 className="text-4xl font-black mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg font-light leading-relaxed">
            Please connect your wallet to access your borrower stats and request new loans.
          </p>
          <button
            onClick={connectWallet}
            className="group relative px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold text-lg hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:scale-105 transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-3">
              Connect Wallet
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>
    );
  }

  const isActiveLoan =
    loan &&
    loan.principal &&
    Number(loan.principal) > 0 &&
    Number(loan.status) === 0;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-inter text-white">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] animate-float"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[120px] animate-float-delayed"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse-slow"></div>

      <Navbar />

      <main className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in-down">
          <div className="inline-block mb-8">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative px-6 py-3 bg-black ring-1 ring-white/10 rounded-full flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Credit Protocol
                </span>
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
              Borrower Dashboard
            </span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto mb-4 leading-relaxed font-light">
            Monitor your trust profile, manage active loans, and grow your credit limit through responsible behavior.
          </p>

          {account && (
            <div className="mb-8 animate-fade-in-up animation-delay-300">
              <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-500/30 rounded-2xl hover:border-blue-400/50 transition-all duration-300 group">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
                  <Wifi className="w-5 h-5 text-blue-400 relative z-10" />
                </div>
                <span className="text-blue-300 font-semibold text-lg">Active Session</span>
                <CheckCircle className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up animation-delay-400">
          {/* Left Column - Profiles */}
          <div className="lg:col-span-4 space-y-8">
            {/* Trust Profile Card */}
            {profile && (
              <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-blue-500/50 transition-all duration-500 overflow-hidden hover:scale-105 hover:-translate-y-1">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                <div className="relative">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-400 to-purple-500 rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-r from-blue-500 via-blue-400 to-purple-500 rounded-2xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500">
                        <User className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{profile.username || "Anonymous"}</h3>
                      <p className="text-sm text-gray-500">Trust Member</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Trust Score</p>
                      <p className="text-2xl font-black text-blue-400">{profile.trustScore}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Repayments</p>
                      <p className="text-2xl font-black text-green-400">{profile.successfulRepayments}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4 pt-6 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-light">Maturity Level</span>
                      <span className="text-white font-bold">{profile.maturityLevel}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-light">Assigned Pool</span>
                      <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full text-xs font-bold">
                        {poolMap[profile.assignedPool]}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-light">Max Borrow</span>
                      <span className="text-white font-bold">{profile.maxBorrowingLimit} TFX</span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            )}

            {/* Wallet Maturity Card */}
            {maturity && (
              <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-500 overflow-hidden hover:scale-105 hover:-translate-y-1">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-purple-400 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                <div className="relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-purple-400 to-blue-500 rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-r from-purple-500 via-purple-400 to-blue-500 rounded-2xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold">Wallet Maturity</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <span className="text-gray-400 font-light">Wallet Age</span>
                      <span className="text-white font-bold">{(Number(maturity.age) / 86400).toFixed(2)} days</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <span className="text-gray-400 font-light">Status</span>
                      <span className="text-purple-400 font-bold uppercase tracking-widest text-xs">Verified</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-light">Multiplier</span>
                      <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full text-xs font-bold">
                        {maturity.maturityMultiplier}% Bonus
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            )}
          </div>

          {/* Right Column - Actions and History */}
          <div className="lg:col-span-8 space-y-8">
            {/* Active Loan Section */}
            {isActiveLoan ? (
              <div className="group relative bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-10 overflow-hidden animate-pulse-slow">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-full blur-2xl"></div>
                <div className="relative">
                  <h3 className="text-3xl font-black mb-8 flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                    Active Credit
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-1">Principal</p>
                      <p className="text-3xl font-black text-white">{loan.principal} TFX</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-1">Repayment</p>
                      <p className="text-3xl font-black text-indigo-400">{loan.totalRepayment} TFX</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-1">Due Date</p>
                      <p className="text-lg font-bold text-gray-300">
                        {new Date(Number(loan.dueDate) * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-center border-t border-white/10 pt-8">
                    <div className="flex-1">
                      {loan.isOverdue ? (
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertCircle className="w-5 h-5 animate-bounce" />
                          <span className="font-bold">URGENT: Repayment is overdue!</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-blue-400">
                          <Clock className="w-5 h-5" />
                          <span className="font-medium text-sm">Account in good standing</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleRepay}
                      disabled={repayLoading}
                      className="group/btn relative px-12 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-105 disabled:opacity-50"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {repayLoading ? "Processing..." : "Full Repayment"}
                        <CheckCircle className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Request Loan Form */
              profile && (
                <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-10 hover:border-blue-500/30 transition-all duration-500 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative">
                    <h3 className="text-3xl font-black mb-8 flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-md opacity-50"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Apply for Credit
                      </span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div>
                        <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 italic">
                          Loan Amount
                        </label>
                        <div className="relative group/input font-inter">
                          <input
                            type="number"
                            placeholder="0.00"
                            value={loanAmount}
                            onChange={(e) => setLoanAmount(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600"
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 font-bold">TFX</div>
                        </div>
                        <p className="mt-3 text-xs text-blue-400 font-medium tracking-tight">
                          Limit available: {profile.maxBorrowingLimit} TFX
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 italic">
                          Duration (Days)
                        </label>
                        <div className="relative group/input font-inter">
                          <input
                            type="number"
                            placeholder="7"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600"
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Days</div>
                        </div>
                        <p className="mt-3 text-xs text-purple-400 font-medium tracking-tight">
                          Min: 1 • Max: 180 days
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleRequestLoan}
                      disabled={txLoading}
                      className="group/btn relative w-full py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:scale-[1.01] disabled:opacity-50"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        Submit Loan Request
                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                    </button>

                    {message.text && (
                      <div className={`mt-8 p-4 rounded-xl flex items-center gap-3 border backdrop-blur-xl animate-fade-in-up ${message.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                          message.type === "error" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                            "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        }`}>
                        {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <Wifi className="w-5 h-5 animate-pulse" />}
                        <span className="text-sm font-semibold">{message.text}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              )
            )}

            {/* Loan History Table */}
            <div className="group relative bg-gradient-to-br from-white/[0.04] to-transparent backdrop-blur-xl border border-white/10 rounded-3xl p-10 overflow-hidden">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                <History className="w-7 h-7 text-gray-400" />
                Credit History
              </h3>

              {history.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <BarChart3 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-light italic">No repayment records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="p-6 text-xs uppercase tracking-widest font-black text-gray-500 italic">Amount</th>
                        <th className="p-6 text-xs uppercase tracking-widest font-black text-gray-500 italic">Pool</th>
                        <th className="p-6 text-xs uppercase tracking-widest font-black text-gray-500 italic">Duration</th>
                        <th className="p-6 text-xs uppercase tracking-widest font-black text-gray-500 italic">Repaid On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {history.map((h, i) => (
                        <tr key={i} className="group/row hover:bg-white/[0.02] transition-colors">
                          <td className="p-6">
                            <div className="flex flex-col">
                              <span className="text-white font-bold">{h.principal} TFX</span>
                              <span className="text-xs text-gray-600 font-medium">Interest: {h.interestAmount}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${Number(h.riskPool) === 0 ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                                Number(h.riskPool) === 1 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                                  "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}>
                              {poolMap[h.riskPool]} RISK
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <Clock className="w-3 h-3" />
                              {(Number(h.duration) / 86400).toFixed(0)}d
                            </div>
                          </td>
                          <td className="p-6 text-gray-500 text-sm font-light">
                            {new Date(Number(h.dueDate) * 1000).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .font-inter {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }

        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        .animate-gradient-x { animation: gradient-x 3s ease infinite; }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-fade-in-down { animation: fade-in-down 0.8s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; opacity: 0; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }

        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
};

export default BorrowerDashboard;
