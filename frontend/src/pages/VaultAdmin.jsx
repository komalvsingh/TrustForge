// import { useState, useEffect } from "react";
// import { useVault } from "../context/VaultContext";

// const VaultAdmin = () => {
//   const {
//     account,
//     loading,
//     getVaultOwner,
//     getVaultLiquidity,
//     getUSDCBalance,
//     getTFXBalance,
//     addUSDCLiquidity,
//     addTFXLiquidity,
//     withdrawUSDC,
//     withdrawTFX,
//     collectVaultFees,
//     setVaultFees,
//     setVaultRate,
//     pauseVault,
//     unpauseVault,
//     isVaultPaused,
//   } = useVault();

//   const [isOwner, setIsOwner] = useState(false);
//   const [vaultOwner, setVaultOwner] = useState("");
//   const [vaultLiquidity, setVaultLiquidity] = useState(null);
//   const [userBalances, setUserBalances] = useState({ usdc: "0", tfx: "0" });
//   const [paused, setPaused] = useState(false);

//   // Add liquidity form
//   const [usdcAmount, setUsdcAmount] = useState("");
//   const [tfxAmount, setTfxAmount] = useState("");

//   // Withdraw form
//   const [withdrawUsdcAmount, setWithdrawUsdcAmount] = useState("");
//   const [withdrawTfxAmount, setWithdrawTfxAmount] = useState("");

//   // Fee form
//   const [buyFee, setBuyFee] = useState("30");
//   const [sellFee, setSellFee] = useState("30");

//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   // Load initial data
//   useEffect(() => {
//     if (!account) return;

//     const loadData = async () => {
//       try {
//         const [owner, liquidity, usdcBal, tfxBal, isPaused] = await Promise.all([
//           getVaultOwner(),
//           getVaultLiquidity(),
//           getUSDCBalance(),
//           getTFXBalance(),
//           isVaultPaused(),
//         ]);

//         setVaultOwner(owner);
//         setIsOwner(account.toLowerCase() === owner.toLowerCase());
//         setVaultLiquidity(liquidity);
//         setUserBalances({ usdc: usdcBal, tfx: tfxBal });
//         setPaused(isPaused);
//       } catch (err) {
//         console.error("Error loading admin data:", err);
//       }
//     };

//     loadData();
//   }, [account]);

//   const refreshData = async () => {
//     const [liquidity, usdcBal, tfxBal, isPaused] = await Promise.all([
//       getVaultLiquidity(),
//       getUSDCBalance(),
//       getTFXBalance(),
//       isVaultPaused(),
//     ]);
//     setVaultLiquidity(liquidity);
//     setUserBalances({ usdc: usdcBal, tfx: tfxBal });
//     setPaused(isPaused);
//   };

//   const handleAddUSDC = async () => {
//     if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
//       setError("Enter valid USDC amount");
//       return;
//     }

//     setError("");
//     setSuccess("");

//     try {
//       await addUSDCLiquidity(usdcAmount);
//       setSuccess(`Added ${usdcAmount} USDC to vault!`);
//       setUsdcAmount("");
//       await refreshData();
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   const handleAddTFX = async () => {
//     if (!tfxAmount || parseFloat(tfxAmount) <= 0) {
//       setError("Enter valid TFX amount");
//       return;
//     }

//     setError("");
//     setSuccess("");

//     try {
//       await addTFXLiquidity(tfxAmount);
//       setSuccess(`Added ${tfxAmount} TFX to vault!`);
//       setTfxAmount("");
//       await refreshData();
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   const handleWithdrawUSDC = async () => {
//     if (!withdrawUsdcAmount || parseFloat(withdrawUsdcAmount) <= 0) {
//       setError("Enter valid USDC amount");
//       return;
//     }

//     setError("");
//     setSuccess("");

//     try {
//       await withdrawUSDC(withdrawUsdcAmount);
//       setSuccess(`Withdrew ${withdrawUsdcAmount} USDC from vault!`);
//       setWithdrawUsdcAmount("");
//       await refreshData();
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   const handleWithdrawTFX = async () => {
//     if (!withdrawTfxAmount || parseFloat(withdrawTfxAmount) <= 0) {
//       setError("Enter valid TFX amount");
//       return;
//     }

//     setError("");
//     setSuccess("");

//     try {
//       await withdrawTFX(withdrawTfxAmount);
//       setSuccess(`Withdrew ${withdrawTfxAmount} TFX from vault!`);
//       setWithdrawTfxAmount("");
//       await refreshData();
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   const handleCollectFees = async () => {
//     setError("");
//     setSuccess("");

//     try {
//       await collectVaultFees();
//       setSuccess("Collected fees successfully!");
//       await refreshData();
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   const handleUpdateFees = async () => {
//     setError("");
//     setSuccess("");

//     try {
//       await setVaultFees(parseInt(buyFee), parseInt(sellFee));
//       setSuccess("Fees updated successfully!");
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   const handleTogglePause = async () => {
//     setError("");
//     setSuccess("");

//     try {
//       if (paused) {
//         await unpauseVault();
//         setSuccess("Vault unpaused!");
//       } else {
//         await pauseVault();
//         setSuccess("Vault paused!");
//       }
//       await refreshData();
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   if (!account) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-8 flex items-center justify-center">
//         <div className="max-w-2xl w-full bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12 text-center animate-fade-in">
//           <div className="text-6xl mb-6">🔒</div>
//           <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
//             Wallet Connection Required
//           </h3>
//           <p className="text-slate-400 text-lg">
//             Connect your wallet to access the Vault Admin Panel
//           </p>
//         </div>
//       </div>
//     );
//   }

//   if (!isOwner) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-8 flex items-center justify-center">
//         <div className="max-w-2xl w-full bg-slate-900/60 backdrop-blur-xl border border-red-500/30 rounded-3xl p-12 text-center animate-fade-in">
//           <div className="text-6xl mb-6">⛔</div>
//           <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 text-transparent bg-clip-text">
//             Access Denied
//           </h3>
//           <p className="text-slate-400 text-lg mb-8">
//             Only the vault owner can access this panel.
//           </p>
//           <div className="bg-black/30 rounded-2xl p-6 space-y-4">
//             <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
//               <span className="text-slate-500 text-sm font-semibold">Vault Owner:</span>
//               <span className="text-purple-400 font-mono text-sm break-all text-right ml-4">
//                 {vaultOwner}
//               </span>
//             </div>
//             <div className="flex justify-between items-center">
//               <span className="text-slate-500 text-sm font-semibold">Your Address:</span>
//               <span className="text-purple-400 font-mono text-sm break-all text-right ml-4">
//                 {account}
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-8 relative overflow-hidden">
//       {/* Animated background gradient */}
//       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(167,139,250,0.08)_0%,transparent_50%)] animate-spin-slow pointer-events-none" />

//       <div className="relative z-10 max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="text-center mb-12 animate-fade-in-down">
//           <div className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full text-sm font-medium mb-4 backdrop-blur-sm">
//             <span className="animate-pulse">✨</span>
//             Admin Control Panel
//             <span className="animate-pulse">✨</span>
//           </div>
//           <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text tracking-tight">
//             Vault Administration
//           </h1>
//           <p className="text-slate-400 text-xl font-light">
//             Manage liquidity, fees, and vault operations
//           </p>
//         </div>

//         {/* Messages */}
//         {error && (
//           <div className="max-w-4xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 backdrop-blur-sm animate-slide-in">
//             <span className="text-2xl">⚠️</span>
//             <span className="text-red-400 font-medium">{error}</span>
//           </div>
//         )}

//         {success && (
//           <div className="max-w-4xl mx-auto mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center gap-3 backdrop-blur-sm animate-slide-in">
//             <span className="text-2xl">✓</span>
//             <span className="text-green-400 font-medium">{success}</span>
//           </div>
//         )}

//         {/* Stats Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
//           {/* Vault Status */}
//           <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-900/80 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/20 animate-scale-in">
//             <div className="flex items-center gap-3 mb-6">
//               <span className="text-3xl">⚡</span>
//               <h3 className="text-xl font-semibold text-slate-200">Vault Status</h3>
//             </div>
//             <div className={`flex items-center gap-3 mb-6 p-4 bg-black/20 rounded-2xl ${
//               paused ? 'border border-red-500/20' : 'border border-green-500/20'
//             }`}>
//               <div className={`w-3 h-3 rounded-full animate-pulse ${
//                 paused ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,1)]'
//               }`} />
//               <span className={`font-bold text-lg tracking-wide ${
//                 paused ? 'text-red-400' : 'text-green-400'
//               }`}>
//                 {paused ? "PAUSED" : "ACTIVE"}
//               </span>
//             </div>
//             <button
//               onClick={handleTogglePause}
//               disabled={loading}
//               className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group ${
//                 paused
//                   ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
//                   : 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
//               }`}
//             >
//               <span className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-600 origin-center" />
//               <span className="relative z-10">{paused ? "▶ Unpause Vault" : "⏸ Pause Vault"}</span>
//             </button>
//           </div>

//           {/* Current Liquidity */}
//           {vaultLiquidity && (
//             <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-900/80 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/20 animate-scale-in animation-delay-100">
//               <div className="flex items-center gap-3 mb-6">
//                 <span className="text-3xl">💎</span>
//                 <h3 className="text-xl font-semibold text-slate-200">Vault Liquidity</h3>
//               </div>
//               <div className="space-y-3 mb-6">
//                 <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-slate-700/30">
//                   <span className="text-purple-400 font-semibold text-sm tracking-wider">USDC</span>
//                   <span className="text-slate-200 font-mono text-lg font-semibold">
//                     {parseFloat(vaultLiquidity.usdcBalance).toFixed(2)}
//                   </span>
//                 </div>
//                 <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-slate-700/30">
//                   <span className="text-purple-400 font-semibold text-sm tracking-wider">TFX</span>
//                   <span className="text-slate-200 font-mono text-lg font-semibold">
//                     {parseFloat(vaultLiquidity.tfxBalance).toFixed(2)}
//                   </span>
//                 </div>
//               </div>
//               <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl mb-4">
//                 <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Fees Collected</div>
//                 <div className="text-sm text-purple-400 font-mono">
//                   {parseFloat(vaultLiquidity.usdcFeesCollected).toFixed(2)} USDC • {parseFloat(vaultLiquidity.tfxFeesCollected).toFixed(4)} TFX
//                 </div>
//               </div>
//               <button
//                 onClick={handleCollectFees}
//                 disabled={loading}
//                 className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 💰 Collect Fees
//               </button>
//             </div>
//           )}

//           {/* Your Balances */}
//           <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-900/80 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/20 animate-scale-in animation-delay-200">
//             <div className="flex items-center gap-3 mb-6">
//               <span className="text-3xl">👛</span>
//               <h3 className="text-xl font-semibold text-slate-200">Your Wallet</h3>
//             </div>
//             <div className="space-y-3">
//               <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-slate-700/30">
//                 <span className="text-purple-400 font-semibold text-sm tracking-wider">USDC</span>
//                 <span className="text-slate-200 font-mono text-lg font-semibold">
//                   {parseFloat(userBalances.usdc).toFixed(2)}
//                 </span>
//               </div>
//               <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-slate-700/30">
//                 <span className="text-purple-400 font-semibold text-sm tracking-wider">TFX</span>
//                 <span className="text-slate-200 font-mono text-lg font-semibold">
//                   {parseFloat(userBalances.tfx).toFixed(2)}
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Operations Grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
//           {/* Add Liquidity */}
//           <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-900/80 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20 animate-scale-in animation-delay-300">
//             <div className="flex items-center gap-3 mb-6">
//               <span className="text-3xl">➕</span>
//               <h3 className="text-xl font-semibold text-slate-200">Add Liquidity</h3>
//             </div>

//             <div className="space-y-6">
//               <div>
//                 <label className="block text-sm font-medium text-slate-400 mb-2 tracking-wide">
//                   USDC Amount
//                 </label>
//                 <input
//                   type="number"
//                   placeholder="0.00"
//                   value={usdcAmount}
//                   onChange={(e) => setUsdcAmount(e.target.value)}
//                   className="w-full px-4 py-3 bg-black/30 border border-slate-700/50 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 placeholder:text-slate-600 mb-3"
//                 />
//                 <button
//                   onClick={handleAddUSDC}
//                   disabled={loading}
//                   className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
//                 >
//                   <span className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-600 origin-center" />
//                   <span className="relative z-10">{loading ? "Processing..." : "Add USDC"}</span>
//                 </button>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-slate-400 mb-2 tracking-wide">
//                   TFX Amount
//                 </label>
//                 <input
//                   type="number"
//                   placeholder="0.00"
//                   value={tfxAmount}
//                   onChange={(e) => setTfxAmount(e.target.value)}
//                   className="w-full px-4 py-3 bg-black/30 border border-slate-700/50 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 placeholder:text-slate-600 mb-3"
//                 />
//                 <button
//                   onClick={handleAddTFX}
//                   disabled={loading}
//                   className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
//                 >
//                   <span className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-600 origin-center" />
//                   <span className="relative z-10">{loading ? "Processing..." : "Add TFX"}</span>
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Withdraw Liquidity */}
//           <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-900/80 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20 animate-scale-in animation-delay-400">
//             <div className="flex items-center gap-3 mb-6">
//               <span className="text-3xl">➖</span>
//               <h3 className="text-xl font-semibold text-slate-200">Withdraw Liquidity</h3>
//             </div>

//             <div className="space-y-6">
//               <div>
//                 <label className="block text-sm font-medium text-slate-400 mb-2 tracking-wide">
//                   USDC Amount
//                 </label>
//                 <input
//                   type="number"
//                   placeholder="0.00"
//                   value={withdrawUsdcAmount}
//                   onChange={(e) => setWithdrawUsdcAmount(e.target.value)}
//                   className="w-full px-4 py-3 bg-black/30 border border-slate-700/50 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 placeholder:text-slate-600 mb-3"
//                 />
//                 <button
//                   onClick={handleWithdrawUSDC}
//                   disabled={loading}
//                   className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
//                 >
//                   <span className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-600 origin-center" />
//                   <span className="relative z-10">{loading ? "Processing..." : "Withdraw USDC"}</span>
//                 </button>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-slate-400 mb-2 tracking-wide">
//                   TFX Amount
//                 </label>
//                 <input
//                   type="number"
//                   placeholder="0.00"
//                   value={withdrawTfxAmount}
//                   onChange={(e) => setWithdrawTfxAmount(e.target.value)}
//                   className="w-full px-4 py-3 bg-black/30 border border-slate-700/50 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 placeholder:text-slate-600 mb-3"
//                 />
//                 <button
//                   onClick={handleWithdrawTFX}
//                   disabled={loading}
//                   className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
//                 >
//                   <span className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-600 origin-center" />
//                   <span className="relative z-10">{loading ? "Processing..." : "Withdraw TFX"}</span>
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Update Fees */}
//           <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-900/80 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20 animate-scale-in animation-delay-500">
//             <div className="flex items-center gap-3 mb-2">
//               <span className="text-3xl">⚙️</span>
//               <h3 className="text-xl font-semibold text-slate-200">Update Fees</h3>
//             </div>
//             <p className="text-sm text-slate-500 mb-6">Fees in basis points (100 = 1%)</p>

//             <div className="space-y-6">
//               <div>
//                 <label className="block text-sm font-medium text-slate-400 mb-2 tracking-wide">
//                   Buy Fee (basis points)
//                 </label>
//                 <input
//                   type="number"
//                   value={buyFee}
//                   onChange={(e) => setBuyFee(e.target.value)}
//                   className="w-full px-4 py-3 bg-black/30 border border-slate-700/50 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 placeholder:text-slate-600"
//                 />
//                 <small className="block mt-2 text-xs text-purple-400 font-mono">
//                   Current: {(parseFloat(buyFee) / 100).toFixed(2)}%
//                 </small>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-slate-400 mb-2 tracking-wide">
//                   Sell Fee (basis points)
//                 </label>
//                 <input
//                   type="number"
//                   value={sellFee}
//                   onChange={(e) => setSellFee(e.target.value)}
//                   className="w-full px-4 py-3 bg-black/30 border border-slate-700/50 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 placeholder:text-slate-600"
//                 />
//                 <small className="block mt-2 text-xs text-purple-400 font-mono">
//                   Current: {(parseFloat(sellFee) / 100).toFixed(2)}%
//                 </small>
//               </div>

//               <button
//                 onClick={handleUpdateFees}
//                 disabled={loading}
//                 className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
//               >
//                 <span className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-600 origin-center" />
//                 <span className="relative z-10">{loading ? "Processing..." : "Update Fees"}</span>
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Refresh Button */}
//         <div className="flex justify-center">
//           <button
//             onClick={refreshData}
//             className="px-8 py-4 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl text-slate-200 font-semibold hover:bg-slate-900 hover:border-purple-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
//           >
//             🔄 Refresh Data
//           </button>
//         </div>
//       </div>

//       <style jsx>{`
//         @keyframes fade-in {
//           from { opacity: 0; }
//           to { opacity: 1; }
//         }

//         @keyframes fade-in-down {
//           from { opacity: 0; transform: translateY(-20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }

//         @keyframes scale-in {
//           from { opacity: 0; transform: scale(0.9); }
//           to { opacity: 1; transform: scale(1); }
//         }

//         @keyframes slide-in {
//           from { opacity: 0; transform: translateX(-20px); }
//           to { opacity: 1; transform: translateX(0); }
//         }

//         @keyframes spin-slow {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }

//         .animate-fade-in {
//           animation: fade-in 0.6s ease-out;
//         }

//         .animate-fade-in-down {
//           animation: fade-in-down 0.6s ease-out;
//         }

//         .animate-scale-in {
//           animation: scale-in 0.5s ease-out backwards;
//         }

//         .animate-slide-in {
//           animation: slide-in 0.3s ease-out;
//         }

//         .animate-spin-slow {
//           animation: spin-slow 60s linear infinite;
//         }

//         .animation-delay-100 {
//           animation-delay: 0.1s;
//         }

//         .animation-delay-200 {
//           animation-delay: 0.2s;
//         }

//         .animation-delay-300 {
//           animation-delay: 0.3s;
//         }

//         .animation-delay-400 {
//           animation-delay: 0.4s;
//         }

//         .animation-delay-500 {
//           animation-delay: 0.5s;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default VaultAdmin;
