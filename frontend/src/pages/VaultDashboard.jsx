import { useEffect, useState } from "react";
import { useVault } from "../context/VaultContext";
import VaultDebugger from "./Vaultdebugger";
import Navbar from "../components/Navbar";
import {
  Shield,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Zap,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Coins,
  Lock,
  Unlock,
  Clock,
  ExternalLink
} from "lucide-react";

const VaultDashboard = () => {
  const {
    account,
    loading,
    connectWallet,
    disconnectWallet,

    // Balances
    getUSDCBalance,
    getTFXBalance,
    getUSDCAllowance,
    getTFXAllowance,

    // Core actions
    buyTFX,
    sellTFX,

    // Calculations
    calculateBuyTFX,
    calculateSellTFX,

    // Config
    getVaultConfig,
  } = useVault();

  const [usdcBalance, setUsdcBalance] = useState("0");
  const [tfxBalance, setTfxBalance] = useState("0");
  const [usdcAllowance, setUsdcAllowance] = useState("0");
  const [tfxAllowance, setTfxAllowance] = useState("0");

  const [usdcAmount, setUsdcAmount] = useState("");
  const [tfxAmount, setTfxAmount] = useState("");

  const [buyQuote, setBuyQuote] = useState(null);
  const [sellQuote, setSellQuote] = useState(null);

  const [vaultConfig, setVaultConfig] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load balances and allowances
  const loadBalances = async () => {
    if (!account) return;

    try {
      const [usdc, tfx, usdcAllow, tfxAllow] = await Promise.all([
        getUSDCBalance(),
        getTFXBalance(),
        getUSDCAllowance(),
        getTFXAllowance(),
      ]);

      setUsdcBalance(usdc);
      setTfxBalance(tfx);
      setUsdcAllowance(usdcAllow);
      setTfxAllowance(tfxAllow);
    } catch (err) {
      console.error("Error loading balances:", err);
      setError("Failed to load balances");
    }
  };

  // Load vault config
  const loadVaultConfig = async () => {
    try {
      const config = await getVaultConfig();
      setVaultConfig(config);
    } catch (err) {
      console.error("Error loading vault config:", err);
    }
  };

  // Initial load
  useEffect(() => {
    loadBalances();
    loadVaultConfig();
  }, [account]);

  // Handle buy quote
  const handleBuyQuote = async (value) => {
    setUsdcAmount(value);
    setError("");

    if (!value || parseFloat(value) <= 0) {
      setBuyQuote(null);
      return;
    }

    try {
      const q = await calculateBuyTFX(value);
      setBuyQuote(q);
    } catch (err) {
      console.error("Error calculating buy quote:", err);
      setError("Failed to calculate quote");
    }
  };

  // Handle sell quote
  const handleSellQuote = async (value) => {
    setTfxAmount(value);
    setError("");

    if (!value || parseFloat(value) <= 0) {
      setSellQuote(null);
      return;
    }

    try {
      const q = await calculateSellTFX(value);
      setSellQuote(q);
    } catch (err) {
      console.error("Error calculating sell quote:", err);
      setError("Failed to calculate quote");
    }
  };

  // Handle buy TFX
  const handleBuyTFX = async () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      setError("Please enter a valid USDC amount");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await buyTFX(usdcAmount);
      setSuccess(`Successfully bought TFX with ${usdcAmount} USDC!`);

      // Reset form
      setUsdcAmount("");
      setBuyQuote(null);

      // Refresh balances
      await loadBalances();
    } catch (err) {
      console.error("Error buying TFX:", err);
      setError(err.message || "Failed to buy TFX. Check console for details.");
    }
  };

  // Handle sell TFX
  const handleSellTFX = async () => {
    if (!tfxAmount || parseFloat(tfxAmount) <= 0) {
      setError("Please enter a valid TFX amount");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await sellTFX(tfxAmount);
      setSuccess(`Successfully sold ${tfxAmount} TFX!`);

      // Reset form
      setTfxAmount("");
      setSellQuote(null);

      // Refresh balances
      await loadBalances();
    } catch (err) {
      console.error("Error selling TFX:", err);
      setError(err.message || "Failed to sell TFX. Check console for details.");
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-inter">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] animate-float"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[120px] animate-float-delayed"></div>

      <Navbar />

      <main className="relative max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-down">
          <h1 className="text-6xl md:text-7xl font-black mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
              TFX Reserve Vault
            </span>
          </h1>
          <p className="text-gray-400 text-lg font-light">
            Exchange USDC for TFX tokens seamlessly
          </p>
        </div>

        <VaultDebugger />

        {!account ? (
          <div className="flex justify-center animate-fade-in-up">
            <button
              onClick={connectWallet}
              className="group relative px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-3">
                Connect Wallet
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in-up">
            {/* Connected Status */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-500/30 rounded-2xl">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
                  <CheckCircle className="w-5 h-5 text-blue-400 relative z-10" />
                </div>
                <span className="text-blue-300 font-semibold">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>

              <button
                onClick={disconnectWallet}
                className="px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-gray-300 hover:border-red-500/30 hover:text-red-400 transition-all duration-300 font-semibold"
              >
                Disconnect
              </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center gap-3 p-6 bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl animate-fade-in-up">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                <span className="text-red-300 font-medium">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-6 bg-green-500/10 backdrop-blur-xl border border-green-500/30 rounded-2xl animate-fade-in-up">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                <span className="text-green-300 font-medium">{success}</span>
              </div>
            )}

            {/* Balances */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-blue-500/50 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-gray-400 font-semibold text-lg">USDC Balance</span>
                  </div>
                  <div className="text-4xl font-black bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                    {parseFloat(usdcBalance).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Coins className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-gray-400 font-semibold text-lg">TFX Balance</span>
                  </div>
                  <div className="text-4xl font-black bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">
                    {parseFloat(tfxBalance).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Vault Config */}
            {vaultConfig && (
              <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Shield className="w-7 h-7 text-blue-400" />
                  Vault Configuration
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-gray-500 text-sm mb-2 font-medium">Exchange Rate</div>
                    <div className="text-white text-xl font-bold">1:1</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm mb-2 font-medium">Buy Fee</div>
                    <div className="text-blue-400 text-xl font-bold">
                      {(parseFloat(vaultConfig.buyFee) / 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm mb-2 font-medium">Sell Fee</div>
                    <div className="text-purple-400 text-xl font-bold">
                      {(parseFloat(vaultConfig.sellFee) / 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm mb-2 font-medium">Min Transaction</div>
                    <div className="text-white text-xl font-bold">{vaultConfig.minTransaction}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Trading Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Buy TFX Card */}
              <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-blue-500/30 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>

                <div className="relative">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white">Buy TFX</h3>
                      <p className="text-gray-400 text-sm">Exchange USDC for TFX</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-400 text-sm font-semibold mb-3">
                        USDC Amount
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={usdcAmount}
                        onChange={(e) => handleBuyQuote(e.target.value)}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xl font-semibold placeholder-gray-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    {buyQuote && (
                      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium">TFX Amount</span>
                          <span className="text-white font-bold text-lg">
                            {parseFloat(buyQuote.tfxAmount).toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium">Fee</span>
                          <span className="text-gray-300 font-semibold">
                            {parseFloat(buyQuote.feeAmount).toFixed(4)} TFX
                          </span>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-400 font-bold">You'll Receive</span>
                          <span className="text-blue-400 font-black text-xl">
                            {parseFloat(buyQuote.tfxToUser).toFixed(4)} TFX
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      disabled={loading || !usdcAmount || parseFloat(usdcAmount) <= 0}
                      onClick={handleBuyTFX}
                      className="group relative w-full px-8 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {loading ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5" />
                            Buy TFX
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>

                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-500 font-medium">
                        Allowance: {parseFloat(usdcAllowance).toFixed(2)} USDC
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sell TFX Card - Coming Soon */}
              <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 opacity-60">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 rounded-3xl"></div>

                <div className="relative">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
                      <Coins className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white">Sell TFX</h3>
                      <p className="text-gray-400 text-sm">Exchange TFX for USDC</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Coming Soon Notice */}
                    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <Clock className="w-8 h-8 text-yellow-400" />
                        <h4 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                          COMING SOON
                        </h4>
                      </div>
                      <p className="text-gray-300 text-lg mb-4 font-semibold">
                        This feature is currently in development
                      </p>
                      <div className="h-px bg-white/10 my-4"></div>
                      <p className="text-gray-400 text-sm mb-4">
                        In the meantime, you can swap TFX tokens on Uniswap
                      </p>
                      <a
                        href="https://app.uniswap.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all duration-300 hover:scale-105"
                      >
                        Use Uniswap
                        <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>

                    <div className="opacity-50 pointer-events-none">
                      <label className="block text-gray-400 text-sm font-semibold mb-3">
                        TFX Amount
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        disabled
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xl font-semibold placeholder-gray-600 cursor-not-allowed"
                      />
                    </div>

                    <button
                      disabled
                      className="w-full px-8 py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-2xl opacity-40 cursor-not-allowed"
                    >
                      <span className="flex items-center justify-center gap-3">
                        <Lock className="w-5 h-5" />
                        Currently Unavailable
                      </span>
                    </button>

                    <div className="flex items-center gap-2 text-sm opacity-50">
                      <Unlock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-500 font-medium">
                        Allowance: {parseFloat(tfxAllowance).toFixed(2)} TFX
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-center">
              <button
                onClick={loadBalances}
                className="group px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-gray-300 hover:border-blue-500/30 hover:text-blue-400 transition-all duration-300 font-semibold flex items-center gap-3"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                Refresh Balances
              </button>
            </div>
          </div>
        )}
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
      `}</style>
    </div>
  );
};

export default VaultDashboard;
