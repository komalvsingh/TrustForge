import { useEffect, useState } from "react";
import { useVault } from "../context/VaultContext";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Coins,
  Shield,
  Settings,
  TrendingUp,
  Wallet,
  Lock,
  Unlock,
  Database,
  Percent
} from "lucide-react";

const VaultDebugger = () => {
  const {
    account,
    getVaultLiquidity,
    getVaultConfig,
    isVaultPaused,
    getUSDCBalance,
    getTFXBalance,
    getUSDCAllowance,
    getTFXAllowance,
    VAULT_ADDRESS,
  } = useVault();

  const [vaultInfo, setVaultInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account) return;

    const loadDebugInfo = async () => {
      setLoading(true);
      try {
        const [liquidity, config, paused, usdcBal, tfxBal, usdcAllow, tfxAllow] = await Promise.all([
          getVaultLiquidity(),
          getVaultConfig(),
          isVaultPaused(),
          getUSDCBalance(),
          getTFXBalance(),
          getUSDCAllowance(),
          getTFXAllowance(),
        ]);

        setVaultInfo({
          liquidity,
          config,
          paused,
          userBalances: {
            usdc: usdcBal,
            tfx: tfxBal,
            usdcAllowance: usdcAllow,
            tfxAllowance: tfxAllow,
          },
        });
      } catch (error) {
        console.error("Error loading vault info:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDebugInfo();
  }, [account]);

  if (!account) {
    return (
      <div className="mb-8 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 text-gray-400">
          <Activity className="w-6 h-6" />
          <span className="font-medium">Connect wallet to see debug info</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mb-8 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium">Loading vault info...</span>
        </div>
      </div>
    );
  }

  if (!vaultInfo) {
    return (
      <div className="mb-8 bg-gradient-to-br from-red-500/10 to-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8">
        <div className="flex items-center gap-3 text-red-400">
          <XCircle className="w-6 h-6" />
          <span className="font-medium">Error loading vault info</span>
        </div>
      </div>
    );
  }

  const { liquidity, config, paused, userBalances } = vaultInfo;

  // Calculate warnings
  const warnings = [];
  if (paused) warnings.push({ type: 'critical', message: 'Vault is PAUSED - transactions will fail' });
  if (parseFloat(liquidity.tfxBalance) < 1) warnings.push({ type: 'critical', message: 'Vault has insufficient TFX for buy orders' });
  if (parseFloat(liquidity.usdcBalance) < 1) warnings.push({ type: 'critical', message: 'Vault has insufficient USDC for sell orders' });
  if (parseFloat(userBalances.usdc) < parseFloat(config.minTransaction)) warnings.push({ type: 'warning', message: 'Your USDC balance is below minimum transaction amount' });
  if (parseFloat(userBalances.tfx) < 1) warnings.push({ type: 'warning', message: 'You have very low TFX balance for selling' });

  return (
    <div className="mb-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Vault Debug Info</h3>
              <p className="text-gray-400 text-sm">Real-time system diagnostics</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold ${
            paused
              ? 'bg-red-500/20 border border-red-500/30 text-red-400'
              : 'bg-green-500/20 border border-green-500/30 text-green-400'
          }`}>
            {paused ? (
              <>
                <XCircle className="w-5 h-5" />
                PAUSED
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                ACTIVE
              </>
            )}
          </div>
        </div>

        {/* Vault Address */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Shield className="w-4 h-4" />
            <span className="font-mono">{VAULT_ADDRESS}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vault Liquidity */}
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-bold text-white">Vault Liquidity</h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">USDC</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">
                  {parseFloat(liquidity.usdcBalance).toFixed(2)}
                </span>
                {parseFloat(liquidity.usdcBalance) < 1 && (
                  <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold">
                    LOW
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Coins className="w-5 h-5" />
                <span className="font-semibold">TFX</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">
                  {parseFloat(liquidity.tfxBalance).toFixed(2)}
                </span>
                {parseFloat(liquidity.tfxBalance) < 1 && (
                  <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold">
                    LOW
                  </span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <TrendingUp className="w-4 h-4" />
                <span>Fees Collected</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">USDC</div>
                  <div className="text-blue-400 font-bold">
                    {parseFloat(liquidity.usdcFeesCollected).toFixed(2)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">TFX</div>
                  <div className="text-purple-400 font-bold">
                    {parseFloat(liquidity.tfxFeesCollected).toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vault Configuration */}
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-bold text-white">Configuration</h4>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">Exchange Rate</div>
              <div className="text-white font-bold text-lg">
                {config.rate} / {config.ratePrecision} (1:1)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                  <Percent className="w-3 h-3" />
                  <span>Buy Fee</span>
                </div>
                <div className="text-blue-400 font-bold text-lg">
                  {(parseFloat(config.buyFee) / 100).toFixed(2)}%
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                  <Percent className="w-3 h-3" />
                  <span>Sell Fee</span>
                </div>
                <div className="text-purple-400 font-bold text-lg">
                  {(parseFloat(config.sellFee) / 100).toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">Min Transaction</div>
              <div className="text-white font-bold text-lg">
                {config.minTransaction} USDC
              </div>
            </div>
          </div>
        </div>

        {/* User Balances */}
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-bold text-white">Your Wallet</h4>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">USDC Balance</div>
                <div className="text-blue-400 font-bold text-lg">
                  {parseFloat(userBalances.usdc).toFixed(2)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">TFX Balance</div>
                <div className="text-purple-400 font-bold text-lg">
                  {parseFloat(userBalances.tfx).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                <Lock className="w-4 h-4" />
                <span>Allowances</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span>USDC</span>
                  </div>
                  <span className="text-white font-semibold">
                    {parseFloat(userBalances.usdcAllowance).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Coins className="w-4 h-4" />
                    <span>TFX</span>
                  </div>
                  <span className="text-white font-semibold">
                    {parseFloat(userBalances.tfxAllowance).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 backdrop-blur-xl border border-yellow-500/20 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-xl font-bold text-yellow-400">Potential Issues</h4>
            </div>

            <div className="space-y-3">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-4 rounded-xl ${
                    warning.type === 'critical'
                      ? 'bg-red-500/10 border border-red-500/20'
                      : 'bg-yellow-500/10 border border-yellow-500/20'
                  }`}
                >
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    warning.type === 'critical' ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    warning.type === 'critical' ? 'text-red-300' : 'text-yellow-300'
                  }`}>
                    {warning.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Good Message */}
        {warnings.length === 0 && (
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 backdrop-blur-xl border border-green-500/20 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-xl font-bold text-green-400">All Systems Operational</h4>
            </div>
            <p className="text-green-300 text-sm">
              No issues detected. The vault is ready for transactions.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default VaultDebugger;
