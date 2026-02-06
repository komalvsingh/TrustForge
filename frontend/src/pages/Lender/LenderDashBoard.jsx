import { useEffect, useState } from 'react';
import { useBlockchain, RiskPool } from '../../context/BlockchainContext';
import Navbar from '../../components/navbar';

const LenderDashboard = () => {
  const {
    account,
    loading,
    connectWallet,
    getTFXBalance,
    depositToPool,
    withdrawFromPool,
    claimInterest,
    getLenderInfo,
    getAllPoolStats,
    getPoolInterestRates,
  } = useBlockchain();

  const [tfxBalance, setTfxBalance] = useState('0');
  const [lenderInfo, setLenderInfo] = useState(null);
  const [poolStats, setPoolStats] = useState(null);
  const [interestRates, setInterestRates] = useState({
    lowRisk: null,
    medRisk: null,
    highRisk: null,
  });

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedPool, setSelectedPool] = useState(RiskPool.LOW_RISK);
  const [activeTab, setActiveTab] = useState('overview');
  const [lendMode, setLendMode] = useState('manual'); // 'manual' or 'auto'
  const [txLoading, setTxLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showDebug, setShowDebug] = useState(false);

  // Pool configurations
  const poolConfig = {
    [RiskPool.LOW_RISK]: {
      name: 'Low Risk',
      color: 'from-green-500 to-emerald-500',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      bgGlow: 'bg-green-500/10',
      description: 'Conservative, stable returns',
    },
    [RiskPool.MEDIUM_RISK]: {
      name: 'Medium Risk',
      color: 'from-yellow-500 to-orange-500',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      bgGlow: 'bg-yellow-500/10',
      description: 'Balanced risk and reward',
    },
    [RiskPool.HIGH_RISK]: {
      name: 'High Risk',
      color: 'from-red-500 to-pink-500',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      bgGlow: 'bg-red-500/10',
      description: 'Higher returns, higher risk',
    },
  };

  useEffect(() => {
    if (account) {
      loadData();
      // Auto-refresh data every 30 seconds
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [account]);

  const loadData = async () => {
    try {
      const [balance, lender, pools, lowRates, medRates, highRates] = await Promise.all([
        getTFXBalance(),
        getLenderInfo(),
        getAllPoolStats(),
        getPoolInterestRates(RiskPool.LOW_RISK),
        getPoolInterestRates(RiskPool.MEDIUM_RISK),
        getPoolInterestRates(RiskPool.HIGH_RISK),
      ]);

      setTfxBalance(balance);
      setLenderInfo(lender);
      setPoolStats(pools);
      setInterestRates({
        lowRisk: lowRates,
        medRisk: medRates,
        highRisk: highRates,
      });

      // Debug logging
      if (showDebug) {
        console.log('=== LENDER DEBUG INFO ===');
        console.log('Lender Info:', lender);
        console.log('Pool Stats:', pools);
        console.log('Interest Rates:', { lowRates, medRates, highRates });
        console.log('Pending Interest (Low):', lender?.pendingInterestLow);
        console.log('Pending Interest (Med):', lender?.pendingInterestMed);
        console.log('Pending Interest (High):', lender?.pendingInterestHigh);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Failed to load dashboard data');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      showMessage('error', 'Please enter a valid amount');
      return;
    }

    try {
      setTxLoading(true);

      if (lendMode === 'auto') {
        // Auto deposit: distribute across all three pools
        await handleAutoDeposit();
      } else {
        // Manual deposit: deposit to selected pool
        await depositToPool(depositAmount, selectedPool);
        showMessage('success', `Successfully deposited ${depositAmount} TFX to ${poolConfig[selectedPool].name}`);
      }

      setDepositAmount('');
      await loadData();
    } catch (error) {
      console.error('Deposit error:', error);
      showMessage('error', error.message || 'Failed to deposit');
    } finally {
      setTxLoading(false);
    }
  };

  const handleAutoDeposit = async () => {
    const totalAmount = parseFloat(depositAmount);

    // Distribution: 40% low, 35% medium, 25% high
    const lowAmount = (totalAmount * 0.40).toFixed(6);
    const medAmount = (totalAmount * 0.35).toFixed(6);
    const highAmount = (totalAmount * 0.25).toFixed(6);

    // Deposit to each pool sequentially
    await depositToPool(lowAmount, RiskPool.LOW_RISK);
    await depositToPool(medAmount, RiskPool.MEDIUM_RISK);
    await depositToPool(highAmount, RiskPool.HIGH_RISK);

    showMessage('success', `Successfully auto-deposited ${depositAmount} TFX across all pools`);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showMessage('error', 'Please enter a valid amount');
      return;
    }

    try {
      setTxLoading(true);
      await withdrawFromPool(withdrawAmount, selectedPool);
      showMessage('success', `Successfully withdrew ${withdrawAmount} TFX from ${poolConfig[selectedPool].name}`);
      setWithdrawAmount('');
      await loadData();
    } catch (error) {
      console.error('Withdraw error:', error);
      showMessage('error', error.message || 'Failed to withdraw');
    } finally {
      setTxLoading(false);
    }
  };

  const handleClaimInterest = async () => {
    try {
      setTxLoading(true);
      await claimInterest();
      showMessage('success', 'Successfully claimed all pending interest!');
      await loadData();
    } catch (error) {
      console.error('Claim error:', error);
      showMessage('error', error.message || 'Failed to claim interest');
    } finally {
      setTxLoading(false);
    }
  };

  // Enhanced number formatting with more decimal places for small amounts
  const formatNumber = (num, minDecimals = 2, maxDecimals = 8) => {
    const n = parseFloat(num);
    if (isNaN(n)) return '0.00';

    // If number is very small but not zero, show more decimals
    if (n > 0 && n < 0.01) {
      return n.toLocaleString('en-US', {
        minimumFractionDigits: 6,
        maximumFractionDigits: maxDecimals
      });
    }

    return n.toLocaleString('en-US', {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals
    });
  };

  // Scientific notation for very small numbers
  const formatScientific = (num) => {
    const n = parseFloat(num);
    if (isNaN(n) || n === 0) return '0';
    if (n > 0 && n < 0.000001) {
      return n.toExponential(6);
    }
    return formatNumber(num, 2, 8);
  };

  const formatPercentage = (basisPoints) => {
    const percentage = parseFloat(basisPoints) / 100;
    return `${percentage.toFixed(2)}%`;
  };

  const calculateUtilization = (pool) => {
    if (!pool || parseFloat(pool.totalLiquidity) === 0) return '0';
    const utilized = parseFloat(pool.totalActiveLoans);
    const total = parseFloat(pool.totalLiquidity);
    return ((utilized / total) * 100).toFixed(2);
  };

  const getTotalDeposited = () => {
    if (!lenderInfo) return '0';
    return (
      parseFloat(lenderInfo.depositedLowRisk) +
      parseFloat(lenderInfo.depositedMedRisk) +
      parseFloat(lenderInfo.depositedHighRisk)
    ).toFixed(2);
  };

  const getTotalPendingInterest = () => {
    if (!lenderInfo) return 0;
    return (
      parseFloat(lenderInfo.pendingInterestLow) +
      parseFloat(lenderInfo.pendingInterestMed) +
      parseFloat(lenderInfo.pendingInterestHigh)
    );
  };

  // Check if interest is very small
  const hasSmallInterest = () => {
    const total = getTotalPendingInterest();
    return total > 0 && total < 0.01;
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden font-inter">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[120px] animate-float-delayed"></div>

        <Navbar />

        <div className="relative flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full text-center animate-fade-in-up">
            <div className="relative group mb-8">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-50 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative w-24 h-24 bg-black rounded-full mx-auto flex items-center justify-center border border-white/10">
                <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 text-lg mb-8 font-light leading-relaxed">
              Please connect your wallet to access the Lender Dashboard
            </p>
            <button
              onClick={connectWallet}
              disabled={loading}
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-2xl hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        </div>

        <style jsx>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
          
          .font-inter { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
          .bg-grid-pattern {
            background-image: linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes float-delayed {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(20px); }
          }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-float { animation: float 8s ease-in-out infinite; }
          .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
          .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
        `}</style>
      </div>
    );
  }

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
        {/* Header with Debug Toggle */}
        <div className="mb-16 flex items-center justify-between animate-fade-in-down">
          <div>
            <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
                Lender Dashboard
              </span>
            </h1>
            <p className="text-gray-400 text-lg font-light">Manage your deposits and earn interest across risk pools</p>
          </div>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-sm font-semibold text-gray-300 hover:border-purple-500/30 hover:bg-white/10 transition-all duration-300"
          >
            {showDebug ? '🔍 Hide Debug' : '🔧 Show Debug'}
          </button>
        </div>

        {/* Debug Info Panel */}
        {showDebug && lenderInfo && (
          <div className="mb-8 bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-green-500/20 rounded-3xl p-8 font-mono text-sm overflow-x-auto animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                <span className="text-green-400">🔍</span> Debug Information
              </h3>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/40 text-blue-300 rounded-xl text-xs font-semibold transition-all duration-300"
              >
                🔄 Refresh
              </button>
            </div>
            <div className="space-y-3 text-green-400">
              <div className="text-yellow-300 font-bold text-base mb-3">📊 Interest Data:</div>
              <div><span className="text-gray-500">Low Risk Pending:</span> <span className="text-white">{lenderInfo.pendingInterestLow} TFX</span></div>
              <div><span className="text-gray-500">Med Risk Pending:</span> <span className="text-white">{lenderInfo.pendingInterestMed} TFX</span></div>
              <div><span className="text-gray-500">High Risk Pending:</span> <span className="text-white">{lenderInfo.pendingInterestHigh} TFX</span></div>
              <div><span className="text-gray-500">Total Pending:</span> <span className="text-white font-bold">{getTotalPendingInterest()} TFX</span></div>
              <div><span className="text-gray-500">Total Earned:</span> <span className="text-white font-bold">{lenderInfo.totalInterestEarned} TFX</span></div>

              <div className="pt-4 mt-4 border-t border-gray-800">
                <div className="text-yellow-300 font-bold text-base mb-3">💰 Deposit Data:</div>
                <div><span className="text-gray-500">Low Risk Deposit:</span> <span className="text-white">{lenderInfo.depositedLowRisk} TFX</span></div>
                <div><span className="text-gray-500">Med Risk Deposit:</span> <span className="text-white">{lenderInfo.depositedMedRisk} TFX</span></div>
                <div><span className="text-gray-500">High Risk Deposit:</span> <span className="text-white">{lenderInfo.depositedHighRisk} TFX</span></div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-800">
                <div className="text-yellow-300 font-bold text-base mb-3">📈 Interest Rates (Basis Points):</div>
                {interestRates.lowRisk && (
                  <div>
                    <span className="text-gray-500">Low Risk:</span> <span className="text-white">{interestRates.lowRisk.baseRate} - {interestRates.lowRisk.maxRate} BP</span>
                    <span className="text-green-400"> ({formatPercentage(interestRates.lowRisk.baseRate)} - {formatPercentage(interestRates.lowRisk.maxRate)})</span>
                  </div>
                )}
                {interestRates.medRisk && (
                  <div>
                    <span className="text-gray-500">Med Risk:</span> <span className="text-white">{interestRates.medRisk.baseRate} - {interestRates.medRisk.maxRate} BP</span>
                    <span className="text-yellow-400"> ({formatPercentage(interestRates.medRisk.baseRate)} - {formatPercentage(interestRates.medRisk.maxRate)})</span>
                  </div>
                )}
                {interestRates.highRisk && (
                  <div>
                    <span className="text-gray-500">High Risk:</span> <span className="text-white">{interestRates.highRisk.baseRate} - {interestRates.highRisk.maxRate} BP</span>
                    <span className="text-red-400"> ({formatPercentage(interestRates.highRisk.baseRate)} - {formatPercentage(interestRates.highRisk.maxRate)})</span>
                  </div>
                )}
              </div>

              {hasSmallInterest() && (
                <div className="pt-4 mt-4 border-t border-red-900/50">
                  <div className="text-red-400 font-bold">⚠️ WARNING: Very Small Interest Detected!</div>
                  <div className="text-red-300 text-xs mt-2">
                    Interest rates may be too low in your smart contract. Consider increasing basis points to 800-2500 range.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning for small interest amounts */}
        {hasSmallInterest() && !showDebug && (
          <div className="mb-8 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl border-2 border-yellow-500/30 rounded-3xl p-6 animate-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-yellow-300 mb-2 text-lg">⚠️ Very Small Interest Amount Detected</h4>
                <p className="text-yellow-200/80 text-sm mb-3 leading-relaxed">
                  Your interest amount is very small ({formatScientific(getTotalPendingInterest())} TFX). This could indicate:
                </p>
                <ul className="list-disc list-inside text-yellow-200/80 text-sm space-y-1 mb-4 ml-2">
                  <li>Interest rates in smart contract are too low (should be 800-2500 basis points)</li>
                  <li>Very short time period since deposit/loan</li>
                  <li>Small principal amount</li>
                </ul>
                <button
                  onClick={() => setShowDebug(true)}
                  className="px-4 py-2 bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold hover:bg-yellow-500/30 transition-all duration-300"
                >
                  Show Debug Info
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-8 p-5 rounded-2xl flex items-center gap-3 border backdrop-blur-xl animate-fade-in-up ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success' ? (
              <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-semibold">{message.text}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 animate-fade-in-up animation-delay-200">
          <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-blue-500/50 transition-all duration-500 overflow-hidden hover:scale-105 hover:-translate-y-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Wallet Balance</div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-black text-white">{formatNumber(tfxBalance)} TFX</div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>

          <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-blue-500/50 transition-all duration-500 overflow-hidden hover:scale-105 hover:-translate-y-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Deposited</div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{formatNumber(getTotalDeposited())} TFX</div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>

          <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-green-500/50 transition-all duration-500 overflow-hidden hover:scale-105 hover:-translate-y-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Pending Interest</div>
                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-black text-green-400">
                {formatNumber(getTotalPendingInterest(), 2, 8)} TFX
              </div>
              {hasSmallInterest() && (
                <div className="text-xs text-yellow-400 mt-2 font-mono">
                  ({formatScientific(getTotalPendingInterest())})
                </div>
              )}
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>

          <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-500 overflow-hidden hover:scale-105 hover:-translate-y-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Earned</div>
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {lenderInfo ? formatNumber(lenderInfo.totalInterestEarned, 2, 8) : '0.00'} TFX
              </div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        </div>

        {/* Claim Interest Button */}
        {getTotalPendingInterest() > 0 && (
          <div className="mb-12 animate-fade-in-up animation-delay-300">
            <button
              onClick={handleClaimInterest}
              disabled={txLoading}
              className="group relative px-10 py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center gap-3">
                {txLoading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Claim {formatNumber(getTotalPendingInterest(), 2, 8)} TFX Interest
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            {hasSmallInterest() && (
              <p className="text-sm text-gray-500 mt-3 ml-2 font-light">
                Note: Actual amount is {formatScientific(getTotalPendingInterest())} TFX
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl mb-12 overflow-hidden animate-fade-in-up animation-delay-400">
          <div className="border-b border-white/10">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-5 px-8 font-bold transition-all relative ${
                  activeTab === 'overview'
                    ? 'text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {activeTab === 'overview' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                )}
                Overview
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-5 px-8 font-bold transition-all relative ${
                  activeTab === 'manage'
                    ? 'text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {activeTab === 'manage' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                )}
                Manage Deposits
              </button>
              <button
                onClick={() => setActiveTab('interest')}
                className={`py-5 px-8 font-bold transition-all relative ${
                  activeTab === 'interest'
                    ? 'text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {activeTab === 'interest' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                )}
                Interest & Earnings
              </button>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-10">
              <h2 className="text-3xl font-black text-white mb-8">Pool Statistics</h2>

              {poolStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Low Risk Pool */}
                  <div className={`group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border-2 ${poolConfig[RiskPool.LOW_RISK].borderColor} rounded-3xl p-8 hover:scale-105 hover:-translate-y-2 transition-all duration-500 overflow-hidden`}>
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                    
                    <div className="relative">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-black text-white">{poolConfig[RiskPool.LOW_RISK].name}</h3>
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${poolConfig[RiskPool.LOW_RISK].color}`}></div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Total Liquidity</div>
                          <div className="text-xl font-black text-white">{formatNumber(poolStats.lowRisk.totalLiquidity)} TFX</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Active Loans</div>
                          <div className="text-xl font-black text-white">{formatNumber(poolStats.lowRisk.totalActiveLoans)} TFX</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Utilization Rate</div>
                          <div className="text-xl font-black text-white">{calculateUtilization(poolStats.lowRisk)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Interest Pool</div>
                          <div className="text-xl font-black text-green-400">{formatNumber(poolStats.lowRisk.totalInterestPool)} TFX</div>
                        </div>
                        {interestRates.lowRisk && (
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Interest Rate</div>
                            <div className="text-xl font-black text-white">
                              {formatPercentage(interestRates.lowRisk.baseRate)} - {formatPercentage(interestRates.lowRisk.maxRate)}
                            </div>
                          </div>
                        )}
                        <div className="pt-4 border-t border-white/10">
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Your Deposit</div>
                          <div className="text-xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {lenderInfo ? formatNumber(lenderInfo.depositedLowRisk) : '0.00'} TFX
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>

                  {/* Medium Risk Pool */}
                  <div className={`group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border-2 ${poolConfig[RiskPool.MEDIUM_RISK].borderColor} rounded-3xl p-8 hover:scale-105 hover:-translate-y-2 transition-all duration-500 overflow-hidden`}>
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                    
                    <div className="relative">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-black text-white">{poolConfig[RiskPool.MEDIUM_RISK].name}</h3>
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${poolConfig[RiskPool.MEDIUM_RISK].color}`}></div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Total Liquidity</div>
                          <div className="text-xl font-black text-white">{formatNumber(poolStats.medRisk.totalLiquidity)} TFX</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Active Loans</div>
                          <div className="text-xl font-black text-white">{formatNumber(poolStats.medRisk.totalActiveLoans)} TFX</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Utilization Rate</div>
                          <div className="text-xl font-black text-white">{calculateUtilization(poolStats.medRisk)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Interest Pool</div>
                          <div className="text-xl font-black text-green-400">{formatNumber(poolStats.medRisk.totalInterestPool)} TFX</div>
                        </div>
                        {interestRates.medRisk && (
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Interest Rate</div>
                            <div className="text-xl font-black text-white">
                              {formatPercentage(interestRates.medRisk.baseRate)} - {formatPercentage(interestRates.medRisk.maxRate)}
                            </div>
                          </div>
                        )}
                        <div className="pt-4 border-t border-white/10">
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Your Deposit</div>
                          <div className="text-xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {lenderInfo ? formatNumber(lenderInfo.depositedMedRisk) : '0.00'} TFX
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>

                  {/* High Risk Pool */}
                  <div className={`group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border-2 ${poolConfig[RiskPool.HIGH_RISK].borderColor} rounded-3xl p-8 hover:scale-105 hover:-translate-y-2 transition-all duration-500 overflow-hidden`}>
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                    
                    <div className="relative">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-black text-white">{poolConfig[RiskPool.HIGH_RISK].name}</h3>
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${poolConfig[RiskPool.HIGH_RISK].color}`}></div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Total Liquidity</div>
                          <div className="text-xl font-black text-white">{formatNumber(poolStats.highRisk.totalLiquidity)} TFX</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Active Loans</div>
                          <div className="text-xl font-black text-white">{formatNumber(poolStats.highRisk.totalActiveLoans)} TFX</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Utilization Rate</div>
                          <div className="text-xl font-black text-white">{calculateUtilization(poolStats.highRisk)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Interest Pool</div>
                          <div className="text-xl font-black text-green-400">{formatNumber(poolStats.highRisk.totalInterestPool)} TFX</div>
                        </div>
                        {interestRates.highRisk && (
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Interest Rate</div>
                            <div className="text-xl font-black text-white">
                              {formatPercentage(interestRates.highRisk.baseRate)} - {formatPercentage(interestRates.highRisk.maxRate)}
                            </div>
                          </div>
                        )}
                        <div className="pt-4 border-t border-white/10">
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Your Deposit</div>
                          <div className="text-xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {lenderInfo ? formatNumber(lenderInfo.depositedHighRisk) : '0.00'} TFX
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manage Tab */}
          {activeTab === 'manage' && (
            <div className="p-10">
              <h2 className="text-3xl font-black text-white mb-8">Manage Your Deposits</h2>

              {/* Lending Mode Toggle */}
              <div className="mb-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Lending Mode</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => setLendMode('manual')}
                    className={`group p-8 rounded-2xl font-semibold transition-all duration-300 ${
                      lendMode === 'manual'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-105'
                        : 'bg-white/5 border-2 border-white/10 text-gray-400 hover:border-blue-500/30'
                    }`}
                  >
                    <div className="text-xl font-black mb-2">Manual Lending</div>
                    <div className="text-sm opacity-90 font-light">You choose which pool to deposit in</div>
                  </button>
                  <button
                    onClick={() => setLendMode('auto')}
                    className={`group p-8 rounded-2xl font-semibold transition-all duration-300 ${
                      lendMode === 'auto'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_30px_rgba(168,85,247,0.3)] scale-105'
                        : 'bg-white/5 border-2 border-white/10 text-gray-400 hover:border-purple-500/30'
                    }`}
                  >
                    <div className="text-xl font-black mb-2">Auto Lending</div>
                    <div className="text-sm opacity-90 font-light">Smart contract distributes across pools</div>
                  </button>
                </div>
                <div className="mt-6 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-gray-400 leading-relaxed font-light">
                      {lendMode === 'manual' ? (
                        <span><strong className="text-white">Manual Mode:</strong> Deposit your funds into a specific risk pool of your choice. You have full control over risk allocation.</span>
                      ) : (
                        <span><strong className="text-white">Auto Mode:</strong> The smart contract automatically distributes your deposit across all three pools (40% Low, 35% Medium, 25% High) for balanced returns.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pool Selection - Only show in manual mode */}
              {lendMode === 'manual' && (
                <div className="mb-8">
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Select Pool</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(poolConfig).map(([poolId, config]) => (
                      <button
                        key={poolId}
                        onClick={() => setSelectedPool(parseInt(poolId))}
                        className={`group p-6 rounded-2xl border-2 transition-all duration-300 ${
                          selectedPool === parseInt(poolId)
                            ? `${config.borderColor} bg-gradient-to-br from-white/10 to-white/5 shadow-lg scale-105`
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-black text-white text-lg">{config.name}</h3>
                          <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${config.color}`}></div>
                        </div>
                        <p className="text-sm text-gray-400 mb-4 font-light">{config.description}</p>
                        {lenderInfo && (
                          <div className="pt-4 border-t border-white/10">
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Your Deposit</div>
                            <div className="text-sm font-bold text-blue-400">
                              {poolId === '0' && formatNumber(lenderInfo.depositedLowRisk)}
                              {poolId === '1' && formatNumber(lenderInfo.depositedMedRisk)}
                              {poolId === '2' && formatNumber(lenderInfo.depositedHighRisk)} TFX
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto Lending Info - Only show in auto mode */}
              {lendMode === 'auto' && (
                <div className="mb-8 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-4">Auto Lending Distribution</h3>
                  <p className="text-gray-400 mb-6 font-light leading-relaxed">
                    Your deposit will be automatically distributed across all three risk pools to optimize returns while managing risk.
                  </p>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300">
                      <div className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-bold">Low Risk</div>
                      <div className="text-4xl font-black text-green-400">40%</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300">
                      <div className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-bold">Medium Risk</div>
                      <div className="text-4xl font-black text-yellow-400">35%</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300">
                      <div className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-bold">High Risk</div>
                      <div className="text-4xl font-black text-red-400">25%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Deposit and Withdraw Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Deposit */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">Deposit Funds</h3>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Amount (TFX)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600"
                    />
                    <div className="mt-3 text-sm text-gray-500 font-medium">
                      Available: <span className="text-blue-400 font-bold">{formatNumber(tfxBalance)} TFX</span>
                    </div>
                  </div>
                  <button
                    onClick={handleDeposit}
                    disabled={txLoading || !depositAmount || parseFloat(depositAmount) <= 0}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {txLoading ? 'Processing...' : lendMode === 'auto' ? 'Auto Deposit to All Pools' : 'Deposit to Pool'}
                  </button>
                </div>

                {/* Withdraw */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">Withdraw Funds</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Select Pool to Withdraw From</label>
                    <select
                      value={selectedPool}
                      onChange={(e) => setSelectedPool(parseInt(e.target.value))}
                      className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                    >
                      <option value={RiskPool.LOW_RISK}>Low Risk Pool</option>
                      <option value={RiskPool.MEDIUM_RISK}>Medium Risk Pool</option>
                      <option value={RiskPool.HIGH_RISK}>High Risk Pool</option>
                    </select>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Amount (TFX)</label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder:text-gray-600"
                    />
                    <div className="mt-3 text-sm text-gray-500 font-medium">
                      Deposited: <span className="text-purple-400 font-bold">
                        {lenderInfo && (
                          <>
                            {selectedPool === RiskPool.LOW_RISK && formatNumber(lenderInfo.depositedLowRisk)}
                            {selectedPool === RiskPool.MEDIUM_RISK && formatNumber(lenderInfo.depositedMedRisk)}
                            {selectedPool === RiskPool.HIGH_RISK && formatNumber(lenderInfo.depositedHighRisk)}
                          </>
                        )} TFX
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleWithdraw}
                    disabled={txLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {txLoading ? 'Processing...' : 'Withdraw from Pool'}
                  </button>
                </div>
              </div>

              {/* Pending Interest by Pool */}
              {lenderInfo && (
                <div className="mt-8 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">Pending Interest by Pool</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                      <div className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-bold">Low Risk Pool</div>
                      <div className="text-3xl font-black text-green-400">
                        {formatNumber(lenderInfo.pendingInterestLow, 2, 8)} TFX
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                      <div className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-bold">Medium Risk Pool</div>
                      <div className="text-3xl font-black text-green-400">
                        {formatNumber(lenderInfo.pendingInterestMed, 2, 8)} TFX
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                      <div className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-bold">High Risk Pool</div>
                      <div className="text-3xl font-black text-green-400">
                        {formatNumber(lenderInfo.pendingInterestHigh, 2, 8)} TFX
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interest Tab */}
          {activeTab === 'interest' && (
            <div className="p-10">
              <h2 className="text-3xl font-black text-white mb-8">Interest & Earnings</h2>

              {/* Total Earnings Summary */}
              <div className="mb-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl shadow-2xl p-12 text-white text-center">
                <div className="text-sm opacity-90 mb-3 uppercase tracking-wider font-bold">Total Interest Earned (All Time)</div>
                <div className="text-6xl font-black mb-4">
                  {lenderInfo ? formatNumber(lenderInfo.totalInterestEarned, 2, 8) : '0.00'} TFX
                </div>
                <div className="text-sm opacity-90 font-light">
                  Keep lending to earn more passive income!
                </div>
              </div>

              {/* Pending Interest Cards */}
              <div className="mb-12">
                <h3 className="text-2xl font-bold text-white mb-6">Pending Interest by Pool</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Low Risk Pool Interest */}
                  <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border-2 border-green-500/30 rounded-3xl p-8 hover:scale-105 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-white text-lg">Low Risk Pool</h4>
                        <div className="bg-green-500 w-4 h-4 rounded-full"></div>
                      </div>
                      <div className="text-4xl font-black text-green-400 mb-2">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestLow, 2, 8) : '0.00'}
                      </div>
                      <div className="text-sm text-gray-400 font-medium">TFX Pending</div>
                      {parseFloat(lenderInfo?.pendingInterestLow || 0) > 0 && parseFloat(lenderInfo?.pendingInterestLow || 0) < 0.01 && (
                        <div className="text-xs text-yellow-400 mt-2 font-mono">
                          ({formatScientific(lenderInfo.pendingInterestLow)})
                        </div>
                      )}
                      <div className="mt-6 pt-6 border-t border-green-500/20">
                        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Your Deposit</div>
                        <div className="text-sm font-bold text-white">
                          {lenderInfo ? formatNumber(lenderInfo.depositedLowRisk) : '0.00'} TFX
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>

                  {/* Medium Risk Pool Interest */}
                  <div className="group relative bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl border-2 border-yellow-500/30 rounded-3xl p-8 hover:scale-105 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-white text-lg">Medium Risk Pool</h4>
                        <div className="bg-yellow-500 w-4 h-4 rounded-full"></div>
                      </div>
                      <div className="text-4xl font-black text-yellow-400 mb-2">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestMed, 2, 8) : '0.00'}
                      </div>
                      <div className="text-sm text-gray-400 font-medium">TFX Pending</div>
                      {parseFloat(lenderInfo?.pendingInterestMed || 0) > 0 && parseFloat(lenderInfo?.pendingInterestMed || 0) < 0.01 && (
                        <div className="text-xs text-yellow-400 mt-2 font-mono">
                          ({formatScientific(lenderInfo.pendingInterestMed)})
                        </div>
                      )}
                      <div className="mt-6 pt-6 border-t border-yellow-500/20">
                        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Your Deposit</div>
                        <div className="text-sm font-bold text-white">
                          {lenderInfo ? formatNumber(lenderInfo.depositedMedRisk) : '0.00'} TFX
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>

                  {/* High Risk Pool Interest */}
                  <div className="group relative bg-gradient-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl border-2 border-red-500/30 rounded-3xl p-8 hover:scale-105 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-white text-lg">High Risk Pool</h4>
                        <div className="bg-red-500 w-4 h-4 rounded-full"></div>
                      </div>
                      <div className="text-4xl font-black text-red-400 mb-2">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestHigh, 2, 8) : '0.00'}
                      </div>
                      <div className="text-sm text-gray-400 font-medium">TFX Pending</div>
                      {parseFloat(lenderInfo?.pendingInterestHigh || 0) > 0 && parseFloat(lenderInfo?.pendingInterestHigh || 0) < 0.01 && (
                        <div className="text-xs text-yellow-400 mt-2 font-mono">
                          ({formatScientific(lenderInfo.pendingInterestHigh)})
                        </div>
                      )}
                      <div className="mt-6 pt-6 border-t border-red-500/20">
                        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Your Deposit</div>
                        <div className="text-sm font-bold text-white">
                          {lenderInfo ? formatNumber(lenderInfo.depositedHighRisk) : '0.00'} TFX
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                </div>
              </div>

              {/* Claim Interest Section */}
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-10">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-black text-white mb-3">Claim Your Interest</h3>
                  <p className="text-gray-400 font-light">Claim all pending interest from all pools in one transaction</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-gray-400 font-bold text-lg">Total Claimable Interest:</div>
                    <div className="text-4xl font-black text-green-400">
                      {formatNumber(getTotalPendingInterest(), 2, 8)} TFX
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider font-bold">Low Risk</div>
                      <div className="font-black text-green-400 text-xl">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestLow, 2, 8) : '0.00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider font-bold">Medium Risk</div>
                      <div className="font-black text-yellow-400 text-xl">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestMed, 2, 8) : '0.00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider font-bold">High Risk</div>
                      <div className="font-black text-red-400 text-xl">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestHigh, 2, 8) : '0.00'}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClaimInterest}
                  disabled={txLoading || getTotalPendingInterest() === 0}
                  className="w-full py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-xl rounded-2xl hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {txLoading ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Transaction...
                    </span>
                  ) : getTotalPendingInterest() === 0 ? (
                    '✓ No Interest to Claim'
                  ) : (
                    `🎉 Claim ${formatNumber(getTotalPendingInterest(), 2, 8)} TFX Interest`
                  )}
                </button>

                {getTotalPendingInterest() === 0 && (
                  <div className="mt-6 text-center text-sm text-gray-500 font-light">
                    Interest accrues over time as borrowers repay their loans. Keep your funds deposited to earn more!
                  </div>
                )}
              </div>

              {/* Interest Rate Information */}
              <div className="mt-12">
                <h3 className="text-2xl font-bold text-white mb-6">Current Interest Rates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {interestRates.lowRisk && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                      <div className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-bold">Low Risk Pool</div>
                      <div className="text-2xl font-black text-green-400">
                        {formatPercentage(interestRates.lowRisk.baseRate)} - {formatPercentage(interestRates.lowRisk.maxRate)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">APR Range</div>
                    </div>
                  )}
                  {interestRates.medRisk && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                      <div className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-bold">Medium Risk Pool</div>
                      <div className="text-2xl font-black text-yellow-400">
                        {formatPercentage(interestRates.medRisk.baseRate)} - {formatPercentage(interestRates.medRisk.maxRate)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">APR Range</div>
                    </div>
                  )}
                  {interestRates.highRisk && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                      <div className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-bold">High Risk Pool</div>
                      <div className="text-2xl font-black text-red-400">
                        {formatPercentage(interestRates.highRisk.baseRate)} - {formatPercentage(interestRates.highRisk.maxRate)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">APR Range</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Styles */}
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

export default LenderDashboard;