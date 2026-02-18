import { useEffect, useState } from "react";
import { useVault } from "../context/VaultContext";
import VaultDebugger from "./Vaultdebugger";
import Navbar from "../components/Navbar";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Zap,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Coins,
  Lock,
  Unlock,
  ExternalLink,
} from "lucide-react";

const VaultDashboard = () => {
  const {
    account,
    loading,
    connectWallet,
    disconnectWallet,
    getUSDCBalance,
    getTFXBalance,
    getUSDCAllowance,
    getTFXAllowance,
    buyTFX,
    sellTFX,
    calculateBuyTFX,
    calculateSellTFX,
    getVaultConfig,
  } = useVault();

  const [usdcBalance,   setUsdcBalance]   = useState("0");
  const [tfxBalance,    setTfxBalance]    = useState("0");
  const [usdcAllowance, setUsdcAllowance] = useState("0");
  const [tfxAllowance,  setTfxAllowance]  = useState("0");

  const [usdcAmount, setUsdcAmount] = useState("");
  const [tfxAmount,  setTfxAmount]  = useState("");

  const [buyQuote,  setBuyQuote]  = useState(null);
  const [sellQuote, setSellQuote] = useState(null);

  const [vaultConfig, setVaultConfig] = useState(null);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  // ── Load balances ──────────────────────────────────────────────────────────
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
      console.error("loadBalances:", err);
      setError("Failed to load balances");
    }
  };

  const loadVaultConfig = async () => {
    try {
      const config = await getVaultConfig();
      setVaultConfig(config);
    } catch (err) {
      console.error("loadVaultConfig:", err);
    }
  };

  useEffect(() => {
    loadBalances();
    loadVaultConfig();
  }, [account]);

  // ── Quotes ─────────────────────────────────────────────────────────────────
  const handleBuyQuote = async (value) => {
    setUsdcAmount(value);
    setError("");
    if (!value || parseFloat(value) <= 0) { setBuyQuote(null); return; }
    try { setBuyQuote(await calculateBuyTFX(value)); }
    catch (err) { console.error(err); setError("Failed to calculate buy quote"); }
  };

  const handleSellQuote = async (value) => {
    setTfxAmount(value);
    setError("");
    if (!value || parseFloat(value) <= 0) { setSellQuote(null); return; }
    try { setSellQuote(await calculateSellTFX(value)); }
    catch (err) { console.error(err); setError("Failed to calculate sell quote"); }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleBuyTFX = async () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      setError("Please enter a valid USDC amount");
      return;
    }
    setError(""); setSuccess("");
    try {
      await buyTFX(usdcAmount);
      setSuccess(`Successfully bought TFX with ${usdcAmount} USDC!`);
      setUsdcAmount(""); setBuyQuote(null);
      await loadBalances();
    } catch (err) {
      setError(err.message || "Failed to buy TFX");
    }
  };

  const handleSellTFX = async () => {
    if (!tfxAmount || parseFloat(tfxAmount) <= 0) {
      setError("Please enter a valid TFX amount");
      return;
    }
    setError(""); setSuccess("");
    try {
      await sellTFX(tfxAmount);
      setSuccess(`Successfully sold ${tfxAmount} TFX for USDC!`);
      setTfxAmount(""); setSellQuote(null);
      await loadBalances();
    } catch (err) {
      setError(err.message || "Failed to sell TFX");
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-inter">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] animate-float"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[120px] animate-float-delayed"></div>

      <Navbar />

      <main className="relative max-w-7xl mx-auto px-6 py-16">
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

            {/* Alerts */}
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
                    <div className="text-white text-xl font-bold">{vaultConfig.minTransaction} USDC</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Trading Cards: 3 columns ───────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* ── Card 1: Buy TFX ──────────────────────────────────────────── */}
              <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-blue-500/30 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>

                <div className="relative">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white">Buy TFX</h3>
                      <p className="text-gray-400 text-sm">USDC → TFX</p>
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
                      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium text-sm">TFX Amount</span>
                          <span className="text-white font-bold">{parseFloat(buyQuote.tfxAmount).toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium text-sm">Fee</span>
                          <span className="text-gray-300 font-semibold text-sm">{parseFloat(buyQuote.feeAmount).toFixed(4)} TFX</span>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-400 font-bold">You'll Receive</span>
                          <span className="text-blue-400 font-black text-lg">{parseFloat(buyQuote.tfxToUser).toFixed(4)} TFX</span>
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
                          <><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</>
                        ) : (
                          <><Zap className="w-5 h-5" /> Buy TFX <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
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

              {/* ── Card 2: Sell TFX (LIVE) ───────────────────────────────────── */}
              <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-purple-500/30 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>

                <div className="relative">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                      <TrendingDown className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white">Sell TFX</h3>
                      <p className="text-gray-400 text-sm">TFX → USDC</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-400 text-sm font-semibold mb-3">
                        TFX Amount
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={tfxAmount}
                        onChange={(e) => handleSellQuote(e.target.value)}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xl font-semibold placeholder-gray-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                    </div>

                    {sellQuote && (
                      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium text-sm">USDC Amount</span>
                          <span className="text-white font-bold">{parseFloat(sellQuote.usdcAmount).toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium text-sm">Fee</span>
                          <span className="text-gray-300 font-semibold text-sm">{parseFloat(sellQuote.feeAmount).toFixed(4)} USDC</span>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-purple-400 font-bold">You'll Receive</span>
                          <span className="text-purple-400 font-black text-lg">{parseFloat(sellQuote.usdcToUser).toFixed(4)} USDC</span>
                        </div>
                      </div>
                    )}

                    <button
                      disabled={loading || !tfxAmount || parseFloat(tfxAmount) <= 0}
                      onClick={handleSellTFX}
                      className="group relative w-full px-8 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {loading ? (
                          <><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</>
                        ) : (
                          <><Coins className="w-5 h-5" /> Sell TFX <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>

                    <div className="flex items-center gap-2 text-sm">
                      <Unlock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-500 font-medium">
                        Allowance: {parseFloat(tfxAllowance).toFixed(2)} TFX
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card 3: Uniswap ───────────────────────────────────────────── */}
              <div className="relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-pink-500/30 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-pink-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>

                <div className="relative flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-8">
                    {/* Uniswap unicorn icon via SVG */}
                    <div className="w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center text-2xl">
                      🦄
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white">Uniswap</h3>
                      <p className="text-gray-400 text-sm">External DEX</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-5">
                    <p className="text-gray-300 text-base font-medium leading-relaxed">
                      Need better rates or deeper liquidity? Swap TFX on Uniswap for access to the full DeFi ecosystem.
                    </p>

                    <div className="space-y-3">
                      {[
                        "Access to all liquidity pools",
                        "Competitive market rates",
                        "Swap with any ERC-20 token",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 flex-shrink-0"></div>
                          <span className="text-gray-400 text-sm font-medium">{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* Rate comparison note */}
                    <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-2xl p-4">
                      <p className="text-pink-300 text-sm font-medium text-center">
                        ⚡ Vault rate is always 1:1 — Uniswap rates vary with market
                      </p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-8">
                    <a
                      href={`https://app.uniswap.org/swap?outputCurrency=0x4b821BBc5C7327A400486eFB61DA250979e32b3B`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative w-full px-8 py-5 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:scale-[1.02] flex items-center justify-center gap-3"
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        Open Uniswap
                        <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </a>

                    <p className="text-center text-gray-600 text-xs mt-3 font-medium">
                      Opens Uniswap with TFX pre-selected
                    </p>
                  </div>
                </div>
              </div>

            </div>
            {/* ── End Trading Cards ──────────────────────────────────────────── */}

            {/* Refresh */}
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

        .font-inter { font-family: 'Inter', system-ui, -apple-system, sans-serif; }

        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(20px); }
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .animate-gradient-x    { animation: gradient-x 3s ease infinite; }
        .animate-float         { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-fade-in-down  { animation: fade-in-down 0.8s ease-out forwards; }
        .animate-fade-in-up    { animation: fade-in-up 0.8s ease-out forwards; opacity: 0; }
      `}</style>
    </div>
  );
};

export default VaultDashboard;
