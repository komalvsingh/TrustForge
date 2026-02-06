import { useEffect, useState } from "react";
import { useBlockchain } from "../context/BlockchainContext";
import Navbar from "../components/Navbar";
import {
  Droplets,
  Wallet,
  TrendingUp,
  ArrowRight,
  Coins,
  Shield,
  Zap,
  Sparkles,
  CheckCircle,
  Wifi
} from "lucide-react";

const Lend = () => {
  const {
    account,
    loading,
    connectWallet,
    getTFXBalance,
    depositToPool,
    withdrawFromPool,
    claimInterest,
    getLenderInfo,
    // Faucet functions
    claimTFX,
    canClaimFaucet,
    getFaucetInfo,
  } = useBlockchain();

  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [lenderInfo, setLenderInfo] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [canClaim, setCanClaim] = useState(false);
  const [faucetInfo, setFaucetInfo] = useState(null);
  const [txLoading, setTxLoading] = useState(false);

  // Load balance, lender info & faucet status
  const loadData = async () => {
    try {
      const bal = await getTFXBalance();
      setBalance(bal);

      const info = await getLenderInfo();
      setLenderInfo(info);

      const eligible = await canClaimFaucet();
      setCanClaim(eligible);

      const faucet = await getFaucetInfo();
      setFaucetInfo(faucet);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  // Deposit TFX
  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) {
      showMessage("error", "Enter a valid amount");
      return;
    }

    try {
      setTxLoading(true);
      showMessage("info", "Depositing...");
      await depositToPool(amount);
      showMessage("success", "Deposit successful ✅");
      setAmount("");
      loadData();
    } catch (err) {
      console.error(err);
      showMessage("error", "Deposit failed ❌");
    } finally {
      setTxLoading(false);
    }
  };

  // Withdraw TFX
  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) {
      showMessage("error", "Enter a valid amount");
      return;
    }

    try {
      setTxLoading(true);
      showMessage("info", "Withdrawing...");
      await withdrawFromPool(amount);
      showMessage("success", "Withdrawal successful ✅");
      setAmount("");
      loadData();
    } catch (err) {
      console.error(err);
      showMessage("error", "Withdrawal failed ❌");
    } finally {
      setTxLoading(false);
    }
  };

  // Claim Interest
  const handleClaimInterest = async () => {
    try {
      setTxLoading(true);
      showMessage("info", "Claiming interest...");
      await claimInterest();
      showMessage("success", "Interest claimed ✅");
      loadData();
    } catch (err) {
      console.error(err);
      showMessage("error", "Claim failed ❌");
    } finally {
      setTxLoading(false);
    }
  };

  // Claim TFX from Faucet
  const handleClaimTFX = async () => {
    try {
      setTxLoading(true);
      showMessage("info", "Claiming TFX from faucet...");
      await claimTFX();
      showMessage("success", "TFX claimed successfully ✅");
      loadData();
    } catch (err) {
      console.error(err);
      showMessage("error", "Faucet claim failed ❌");
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-inter">
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
                  Lending Protocol
                </span>
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              </div>
            </div>
          </div>

          <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tight animate-fade-in-up">
            <span className="inline-block bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
              Lend & Earn
            </span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto mb-4 leading-relaxed animate-fade-in-up animation-delay-200 font-light">
            Provide liquidity to the TrustForge ecosystem and earn interest on your TFX tokens.
            Safe, transparent, and decentralized.
          </p>

          {/* Connection Status */}
          {account && (
            <div className="mb-8 animate-fade-in-up animation-delay-300">
              <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-500/30 rounded-2xl hover:border-blue-400/50 transition-all duration-300 group">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
                  <Wifi className="w-5 h-5 text-blue-400 relative z-10" />
                </div>
                <span className="text-blue-300 font-semibold text-lg">Connected & Ready</span>
                <CheckCircle className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          )}
        </div>

        {!account ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up animation-delay-400">
            <div className="relative group mb-8">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative w-24 h-24 bg-black rounded-full flex items-center justify-center border border-white/10">
                <Wallet className="w-10 h-10 text-blue-400" />
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 text-lg mb-8 max-w-md text-center font-light leading-relaxed">
              Please connect your wallet to participate in lending and view your earnings.
            </p>
            <button
              onClick={connectWallet}
              className="group relative px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-3">
                Connect Wallet
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up animation-delay-400">
            {/* Left Column - Stats and Faucet */}
            <div className="lg:col-span-4 space-y-8">
              {/* Wallet Card */}
              <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-blue-500/50 transition-all duration-500 overflow-hidden hover:scale-105 hover:-translate-y-1">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                
                <div className="relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-400 to-purple-500 rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-r from-blue-500 via-blue-400 to-purple-500 rounded-2xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Your Balance</p>
                      <p className="text-2xl font-black text-white">{balance} TFX</p>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/10 space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Wallet Address</p>
                    <p className="text-sm font-mono text-gray-400 truncate">{account}</p>
                  </div>
                </div>

                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>

              {/* Faucet Card */}
              <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-500 overflow-hidden hover:scale-105 hover:-translate-y-1">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-purple-400 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                
                <div className="relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-purple-400 to-blue-500 rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-r from-purple-500 via-purple-400 to-blue-500 rounded-2xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500">
                        <Droplets className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-blue-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                      TFX Faucet
                    </h3>
                  </div>

                  {faucetInfo && (
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed font-light">
                      Need test tokens? Claim <span className="text-purple-400 font-bold">{faucetInfo.faucetAmount} TFX</span> tokens to start lending.
                    </p>
                  )}

                  <button
                    onClick={handleClaimTFX}
                    disabled={!canClaim || txLoading}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                      canClaim
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-[1.02]"
                        : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {canClaim ? (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Claim TFX
                      </>
                    ) : (
                      "Cooldown Active ⏳"
                    )}
                  </button>
                </div>

                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>

            {/* Right Column - Lending Actions and Stats */}
            <div className="lg:col-span-8 space-y-8">
              {/* Lend/Withdraw Section */}
              <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-10 hover:border-blue-500/30 transition-all duration-500 overflow-hidden hover:scale-[1.02] hover:-translate-y-1">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative">
                  <h3 className="text-3xl md:text-4xl font-black mb-8 flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-md opacity-50"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                        <Coins className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Lend Liquidity
                    </span>
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                        Amount to Stake
                      </label>
                      <div className="relative group/input">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                          TFX
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={handleDeposit}
                        disabled={txLoading}
                        className="group/btn relative py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          Deposit Assets
                          <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                      </button>
                      <button
                        onClick={handleWithdraw}
                        disabled={txLoading}
                        className="py-5 bg-transparent border-2 border-white/20 text-white font-black rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>

                  {message.text && (
                    <div
                      className={`mt-8 p-4 rounded-xl flex items-center gap-3 border backdrop-blur-xl animate-fade-in-up ${
                        message.type === "success"
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : message.type === "error"
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      }`}
                    >
                      {message.type === "success" ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Wifi className="w-5 h-5 animate-pulse" />
                      )}
                      <span className="text-sm font-semibold">{message.text}</span>
                    </div>
                  )}
                </div>

                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-green-500/50 transition-all duration-500 overflow-hidden hover:scale-105 hover:-translate-y-2">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-green-400 to-emerald-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                  
                  <div className="relative">
                    <h4 className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-6">
                      Interest Earned
                    </h4>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-black text-green-400 mb-1">
                          {lenderInfo ? lenderInfo.totalInterestEarned : "0.00"}
                        </p>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-tight">
                          Total Cumulative TFX
                        </p>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-green-500/30 rounded-full blur-lg"></div>
                        <div className="relative w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-500">
                          <TrendingUp className="w-6 h-6 text-green-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>

                <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-indigo-500/50 transition-all duration-500 overflow-hidden hover:scale-105 hover:-translate-y-2">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-indigo-400 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                  
                  <div className="relative">
                    <h4 className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-6">
                      Pending Interest
                    </h4>
                    <div className="flex items-end justify-between mb-6">
                      <div>
                        <p className="text-4xl font-black text-indigo-400 mb-1">
                          {lenderInfo ? lenderInfo.pendingInterest : "0.00"}
                        </p>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-tight">
                          Accrued TFX
                        </p>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-lg"></div>
                        <div className="relative w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-500">
                          <Zap className="w-6 h-6 text-indigo-400" />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleClaimInterest}
                      disabled={!lenderInfo || Number(lenderInfo.pendingInterest) <= 0 || txLoading}
                      className="w-full py-4 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold rounded-2xl hover:bg-indigo-600/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Claim Earnings
                    </button>
                  </div>

                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              </div>

              {/* Total Deposit Summary */}
              {lenderInfo && (
                <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-blue-500/30 transition-all duration-500 overflow-hidden hover:scale-[1.02] hover:-translate-y-1">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                  
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-widest">
                        Current Active Deposit
                      </p>
                      <h4 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {lenderInfo.depositedAmount} TFX
                      </h4>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"></div>
                      <div className="relative transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
                        <Shield className="w-12 h-12 text-blue-500/40" />
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Style Section */}
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
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(20px);
          }
        }

        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out forwards;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animation-delay-100 {
          animation-delay: 0.1s;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-300 {
          animation-delay: 0.3s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-500 {
          animation-delay: 0.5s;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        .animation-delay-800 {
          animation-delay: 0.8s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
};

export default Lend;