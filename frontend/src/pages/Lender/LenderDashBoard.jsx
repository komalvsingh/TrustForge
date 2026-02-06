import { useEffect, useState } from 'react';
import { useBlockchain, RiskPool } from '../../context/BlockchainContext';

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
      name: 'Low Risk Pool',
      color: 'bg-green-500',
      borderColor: 'border-green-500',
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
      description: 'Conservative, stable returns',
    },
    [RiskPool.MEDIUM_RISK]: {
      name: 'Medium Risk Pool',
      color: 'bg-yellow-500',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-600',
      bgLight: 'bg-yellow-50',
      description: 'Balanced risk and reward',
    },
    [RiskPool.HIGH_RISK]: {
      name: 'High Risk Pool',
      color: 'bg-red-500',
      borderColor: 'border-red-500',
      textColor: 'text-red-600',
      bgLight: 'bg-red-50',
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to access the Lender Dashboard</p>
          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Debug Toggle */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Lender Dashboard</h1>
            <p className="text-gray-600">Manage your deposits and earn interest across risk pools</p>
          </div>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            {showDebug ? '🔍 Hide Debug' : '🔧 Show Debug'}
          </button>
        </div>

        {/* Debug Info Panel */}
        {showDebug && lenderInfo && (
          <div className="mb-6 bg-gray-900 text-green-400 rounded-lg p-6 font-mono text-sm overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">🔍 Debug Information</h3>
              <button 
                onClick={loadData}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
              >
                🔄 Refresh
              </button>
            </div>
            <div className="space-y-2">
              <div className="text-yellow-300 font-bold">📊 Interest Data:</div>
              <div><span className="text-gray-400">Low Risk Pending:</span> {lenderInfo.pendingInterestLow} TFX</div>
              <div><span className="text-gray-400">Med Risk Pending:</span> {lenderInfo.pendingInterestMed} TFX</div>
              <div><span className="text-gray-400">High Risk Pending:</span> {lenderInfo.pendingInterestHigh} TFX</div>
              <div><span className="text-gray-400">Total Pending:</span> {getTotalPendingInterest()} TFX</div>
              <div><span className="text-gray-400">Total Earned:</span> {lenderInfo.totalInterestEarned} TFX</div>
              
              <div className="pt-3 mt-3 border-t border-gray-700">
                <div className="text-yellow-300 font-bold">💰 Deposit Data:</div>
                <div><span className="text-gray-400">Low Risk Deposit:</span> {lenderInfo.depositedLowRisk} TFX</div>
                <div><span className="text-gray-400">Med Risk Deposit:</span> {lenderInfo.depositedMedRisk} TFX</div>
                <div><span className="text-gray-400">High Risk Deposit:</span> {lenderInfo.depositedHighRisk} TFX</div>
              </div>
              
              <div className="pt-3 mt-3 border-t border-gray-700">
                <div className="text-yellow-300 font-bold">📈 Interest Rates (Basis Points):</div>
                {interestRates.lowRisk && (
                  <div>
                    <span className="text-gray-400">Low Risk:</span> {interestRates.lowRisk.baseRate} - {interestRates.lowRisk.maxRate} BP 
                    <span className="text-green-400"> ({formatPercentage(interestRates.lowRisk.baseRate)} - {formatPercentage(interestRates.lowRisk.maxRate)})</span>
                  </div>
                )}
                {interestRates.medRisk && (
                  <div>
                    <span className="text-gray-400">Med Risk:</span> {interestRates.medRisk.baseRate} - {interestRates.medRisk.maxRate} BP 
                    <span className="text-yellow-400"> ({formatPercentage(interestRates.medRisk.baseRate)} - {formatPercentage(interestRates.medRisk.maxRate)})</span>
                  </div>
                )}
                {interestRates.highRisk && (
                  <div>
                    <span className="text-gray-400">High Risk:</span> {interestRates.highRisk.baseRate} - {interestRates.highRisk.maxRate} BP 
                    <span className="text-red-400"> ({formatPercentage(interestRates.highRisk.baseRate)} - {formatPercentage(interestRates.highRisk.maxRate)})</span>
                  </div>
                )}
              </div>

              {hasSmallInterest() && (
                <div className="pt-3 mt-3 border-t border-red-700">
                  <div className="text-red-400 font-bold">⚠️ WARNING: Very Small Interest Detected!</div>
                  <div className="text-red-300 text-xs mt-1">
                    Interest rates may be too low in your smart contract. Consider increasing basis points to 800-2500 range.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning for small interest amounts */}
        {hasSmallInterest() && !showDebug && (
          <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="font-bold text-yellow-800 mb-1">⚠️ Very Small Interest Amount Detected</h4>
                <p className="text-yellow-700 text-sm mb-2">
                  Your interest amount is very small ({formatScientific(getTotalPendingInterest())} TFX). This could indicate:
                </p>
                <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1 mb-3">
                  <li>Interest rates in smart contract are too low (should be 800-2500 basis points)</li>
                  <li>Very short time period since deposit/loan</li>
                  <li>Small principal amount</li>
                </ul>
                <button
                  onClick={() => setShowDebug(true)}
                  className="text-sm bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-3 py-1 rounded font-medium"
                >
                  Show Debug Info
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">Wallet Balance</div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatNumber(tfxBalance)} TFX</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">Total Deposited</div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(getTotalDeposited())} TFX</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">Pending Interest</div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(getTotalPendingInterest(), 2, 8)} TFX
            </div>
            {hasSmallInterest() && (
              <div className="text-xs text-yellow-600 mt-1 font-mono">
                ({formatScientific(getTotalPendingInterest())})
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">Total Earned</div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {lenderInfo ? formatNumber(lenderInfo.totalInterestEarned, 2, 8) : '0.00'} TFX
            </div>
          </div>
        </div>

        {/* Claim Interest Button */}
        {getTotalPendingInterest() > 0 && (
          <div className="mb-8">
            <button
              onClick={handleClaimInterest}
              disabled={txLoading}
              className="w-full md:w-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-8 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
            >
              {txLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Claim {formatNumber(getTotalPendingInterest(), 2, 8)} TFX Interest
                </>
              )}
            </button>
            {hasSmallInterest() && (
              <p className="text-sm text-gray-600 mt-2 ml-2">
                Note: Actual amount is {formatScientific(getTotalPendingInterest())} TFX
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 font-semibold transition-colors ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-4 px-6 font-semibold transition-colors ${
                  activeTab === 'manage'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Manage Deposits
              </button>
              <button
                onClick={() => setActiveTab('interest')}
                className={`py-4 px-6 font-semibold transition-colors ${
                  activeTab === 'interest'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Interest & Earnings
              </button>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Pool Statistics</h2>

              {poolStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Low Risk Pool */}
                  <div className={`border-2 ${poolConfig[RiskPool.LOW_RISK].borderColor} rounded-xl p-6 ${poolConfig[RiskPool.LOW_RISK].bgLight}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800">Low Risk</h3>
                      <div className={`${poolConfig[RiskPool.LOW_RISK].color} w-4 h-4 rounded-full`}></div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-600">Total Liquidity</div>
                        <div className="text-lg font-semibold">{formatNumber(poolStats.lowRisk.totalLiquidity)} TFX</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Active Loans</div>
                        <div className="text-lg font-semibold">{formatNumber(poolStats.lowRisk.totalActiveLoans)} TFX</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Utilization Rate</div>
                        <div className="text-lg font-semibold">{calculateUtilization(poolStats.lowRisk)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Interest Pool</div>
                        <div className="text-lg font-semibold text-green-600">{formatNumber(poolStats.lowRisk.totalInterestPool)} TFX</div>
                      </div>
                      {interestRates.lowRisk && (
                        <div>
                          <div className="text-sm text-gray-600">Interest Rate</div>
                          <div className="text-lg font-semibold">
                            {formatPercentage(interestRates.lowRisk.baseRate)} - {formatPercentage(interestRates.lowRisk.maxRate)}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-gray-600">Your Deposit</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {lenderInfo ? formatNumber(lenderInfo.depositedLowRisk) : '0.00'} TFX
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medium Risk Pool */}
                  <div className={`border-2 ${poolConfig[RiskPool.MEDIUM_RISK].borderColor} rounded-xl p-6 ${poolConfig[RiskPool.MEDIUM_RISK].bgLight}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800">Medium Risk</h3>
                      <div className={`${poolConfig[RiskPool.MEDIUM_RISK].color} w-4 h-4 rounded-full`}></div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-600">Total Liquidity</div>
                        <div className="text-lg font-semibold">{formatNumber(poolStats.medRisk.totalLiquidity)} TFX</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Active Loans</div>
                        <div className="text-lg font-semibold">{formatNumber(poolStats.medRisk.totalActiveLoans)} TFX</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Utilization Rate</div>
                        <div className="text-lg font-semibold">{calculateUtilization(poolStats.medRisk)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Interest Pool</div>
                        <div className="text-lg font-semibold text-green-600">{formatNumber(poolStats.medRisk.totalInterestPool)} TFX</div>
                      </div>
                      {interestRates.medRisk && (
                        <div>
                          <div className="text-sm text-gray-600">Interest Rate</div>
                          <div className="text-lg font-semibold">
                            {formatPercentage(interestRates.medRisk.baseRate)} - {formatPercentage(interestRates.medRisk.maxRate)}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-gray-600">Your Deposit</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {lenderInfo ? formatNumber(lenderInfo.depositedMedRisk) : '0.00'} TFX
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* High Risk Pool */}
                  <div className={`border-2 ${poolConfig[RiskPool.HIGH_RISK].borderColor} rounded-xl p-6 ${poolConfig[RiskPool.HIGH_RISK].bgLight}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800">High Risk</h3>
                      <div className={`${poolConfig[RiskPool.HIGH_RISK].color} w-4 h-4 rounded-full`}></div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-600">Total Liquidity</div>
                        <div className="text-lg font-semibold">{formatNumber(poolStats.highRisk.totalLiquidity)} TFX</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Active Loans</div>
                        <div className="text-lg font-semibold">{formatNumber(poolStats.highRisk.totalActiveLoans)} TFX</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Utilization Rate</div>
                        <div className="text-lg font-semibold">{calculateUtilization(poolStats.highRisk)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Interest Pool</div>
                        <div className="text-lg font-semibold text-green-600">{formatNumber(poolStats.highRisk.totalInterestPool)} TFX</div>
                      </div>
                      {interestRates.highRisk && (
                        <div>
                          <div className="text-sm text-gray-600">Interest Rate</div>
                          <div className="text-lg font-semibold">
                            {formatPercentage(interestRates.highRisk.baseRate)} - {formatPercentage(interestRates.highRisk.maxRate)}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-gray-600">Your Deposit</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {lenderInfo ? formatNumber(lenderInfo.depositedHighRisk) : '0.00'} TFX
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manage Tab */}
          {activeTab === 'manage' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Your Deposits</h2>

              {/* Lending Mode Toggle */}
              <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Lending Mode</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setLendMode('manual')}
                    className={`flex-1 py-4 px-6 rounded-lg font-semibold transition-all ${
                      lendMode === 'manual'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-lg mb-1">Manual Lending</div>
                    <div className="text-sm opacity-90">You choose which pool to deposit in</div>
                  </button>
                  <button
                    onClick={() => setLendMode('auto')}
                    className={`flex-1 py-4 px-6 rounded-lg font-semibold transition-all ${
                      lendMode === 'auto'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-lg mb-1">Auto Lending</div>
                    <div className="text-sm opacity-90">Smart contract distributes across pools</div>
                  </button>
                </div>
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-gray-600">
                      {lendMode === 'manual' ? (
                        <span><strong>Manual Mode:</strong> Deposit your funds into a specific risk pool of your choice. You have full control over risk allocation.</span>
                      ) : (
                        <span><strong>Auto Mode:</strong> The smart contract automatically distributes your deposit across all three pools (40% Low, 35% Medium, 25% High) for balanced returns.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pool Selection - Only show in manual mode */}
              {lendMode === 'manual' && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Select Pool</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(poolConfig).map(([poolId, config]) => (
                      <button
                        key={poolId}
                        onClick={() => setSelectedPool(parseInt(poolId))}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedPool === parseInt(poolId)
                            ? `${config.borderColor} ${config.bgLight} shadow-md`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-gray-800">{config.name}</h3>
                          <div className={`${config.color} w-3 h-3 rounded-full`}></div>
                        </div>
                        <p className="text-sm text-gray-600">{config.description}</p>
                        {lenderInfo && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs text-gray-500">Your Deposit</div>
                            <div className="text-sm font-semibold text-blue-600">
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
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Auto Lending Distribution</h3>
                  <p className="text-gray-600 mb-4">
                    Your deposit will be automatically distributed across all three risk pools to optimize returns while managing risk.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-sm text-gray-600 mb-1">Low Risk</div>
                      <div className="text-2xl font-bold text-green-600">40%</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-sm text-gray-600 mb-1">Medium Risk</div>
                      <div className="text-2xl font-bold text-yellow-600">35%</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-sm text-gray-600 mb-1">High Risk</div>
                      <div className="text-2xl font-bold text-red-600">25%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Deposit Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Deposit Funds</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (TFX)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="mt-2 text-sm text-gray-500">
                      Available: {formatNumber(tfxBalance)} TFX
                    </div>
                  </div>
                  <button
                    onClick={handleDeposit}
                    disabled={txLoading || !depositAmount || parseFloat(depositAmount) <= 0}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {txLoading ? 'Processing...' : lendMode === 'auto' ? 'Auto Deposit to All Pools' : 'Deposit to Pool'}
                  </button>
                </div>

                {/* Withdraw Section */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Withdraw Funds</h3>

                  {/* Pool selection for withdrawal - always show */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Pool to Withdraw From</label>
                    <select
                      value={selectedPool}
                      onChange={(e) => setSelectedPool(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={RiskPool.LOW_RISK}>Low Risk Pool</option>
                      <option value={RiskPool.MEDIUM_RISK}>Medium Risk Pool</option>
                      <option value={RiskPool.HIGH_RISK}>High Risk Pool</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (TFX)</label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="mt-2 text-sm text-gray-500">
                      Deposited: {lenderInfo && (
                        <>
                          {selectedPool === RiskPool.LOW_RISK && formatNumber(lenderInfo.depositedLowRisk)}
                          {selectedPool === RiskPool.MEDIUM_RISK && formatNumber(lenderInfo.depositedMedRisk)}
                          {selectedPool === RiskPool.HIGH_RISK && formatNumber(lenderInfo.depositedHighRisk)}
                        </>
                      )} TFX
                    </div>
                  </div>
                  <button
                    onClick={handleWithdraw}
                    disabled={txLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {txLoading ? 'Processing...' : 'Withdraw from Pool'}
                  </button>
                </div>
              </div>

              {/* Pending Interest by Pool */}
              {lenderInfo && (
                <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Pending Interest by Pool</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Low Risk Pool</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatNumber(lenderInfo.pendingInterestLow, 2, 8)} TFX
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Medium Risk Pool</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatNumber(lenderInfo.pendingInterestMed, 2, 8)} TFX
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">High Risk Pool</div>
                      <div className="text-xl font-bold text-green-600">
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
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Interest & Earnings</h2>

              {/* Total Earnings Summary */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-8 mb-8 text-white">
                <div className="text-center">
                  <div className="text-sm opacity-90 mb-2">Total Interest Earned (All Time)</div>
                  <div className="text-5xl font-bold mb-4">
                    {lenderInfo ? formatNumber(lenderInfo.totalInterestEarned, 2, 8) : '0.00'} TFX
                  </div>
                  <div className="text-sm opacity-90">
                    Keep lending to earn more passive income!
                  </div>
                </div>
              </div>

              {/* Pending Interest Cards */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Pending Interest by Pool</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Low Risk Pool Interest */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800">Low Risk Pool</h4>
                      <div className="bg-green-500 w-3 h-3 rounded-full"></div>
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {lenderInfo ? formatNumber(lenderInfo.pendingInterestLow, 2, 8) : '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">TFX Pending</div>
                    {parseFloat(lenderInfo?.pendingInterestLow || 0) > 0 && parseFloat(lenderInfo?.pendingInterestLow || 0) < 0.01 && (
                      <div className="text-xs text-yellow-600 mt-1 font-mono">
                        ({formatScientific(lenderInfo.pendingInterestLow)})
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <div className="text-xs text-gray-500 mb-1">Your Deposit</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {lenderInfo ? formatNumber(lenderInfo.depositedLowRisk) : '0.00'} TFX
                      </div>
                    </div>
                  </div>

                  {/* Medium Risk Pool Interest */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-6 border-2 border-yellow-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800">Medium Risk Pool</h4>
                      <div className="bg-yellow-500 w-3 h-3 rounded-full"></div>
                    </div>
                    <div className="text-3xl font-bold text-yellow-600 mb-2">
                      {lenderInfo ? formatNumber(lenderInfo.pendingInterestMed, 2, 8) : '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">TFX Pending</div>
                    {parseFloat(lenderInfo?.pendingInterestMed || 0) > 0 && parseFloat(lenderInfo?.pendingInterestMed || 0) < 0.01 && (
                      <div className="text-xs text-yellow-600 mt-1 font-mono">
                        ({formatScientific(lenderInfo.pendingInterestMed)})
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-yellow-200">
                      <div className="text-xs text-gray-500 mb-1">Your Deposit</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {lenderInfo ? formatNumber(lenderInfo.depositedMedRisk) : '0.00'} TFX
                      </div>
                    </div>
                  </div>

                  {/* High Risk Pool Interest */}
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6 border-2 border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800">High Risk Pool</h4>
                      <div className="bg-red-500 w-3 h-3 rounded-full"></div>
                    </div>
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      {lenderInfo ? formatNumber(lenderInfo.pendingInterestHigh, 2, 8) : '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">TFX Pending</div>
                    {parseFloat(lenderInfo?.pendingInterestHigh || 0) > 0 && parseFloat(lenderInfo?.pendingInterestHigh || 0) < 0.01 && (
                      <div className="text-xs text-yellow-600 mt-1 font-mono">
                        ({formatScientific(lenderInfo.pendingInterestHigh)})
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-red-200">
                      <div className="text-xs text-gray-500 mb-1">Your Deposit</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {lenderInfo ? formatNumber(lenderInfo.depositedHighRisk) : '0.00'} TFX
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Claim Interest Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Claim Your Interest</h3>
                  <p className="text-gray-600">Claim all pending interest from all pools in one transaction</p>
                </div>

                <div className="bg-white rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-gray-700 font-semibold">Total Claimable Interest:</div>
                    <div className="text-3xl font-bold text-green-600">
                      {formatNumber(getTotalPendingInterest(), 2, 8)} TFX
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <div className="text-gray-500">Low Risk</div>
                      <div className="font-semibold text-green-600">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestLow, 2, 8) : '0.00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Medium Risk</div>
                      <div className="font-semibold text-yellow-600">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestMed, 2, 8) : '0.00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">High Risk</div>
                      <div className="font-semibold text-red-600">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestHigh, 2, 8) : '0.00'}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClaimInterest}
                  disabled={txLoading || getTotalPendingInterest() === 0}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-8 rounded-lg font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {txLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                  <div className="mt-4 text-center text-sm text-gray-500">
                    Interest accrues over time as borrowers repay their loans. Keep your funds deposited to earn more!
                  </div>
                )}
              </div>

              {/* Interest Rate Information */}
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Current Interest Rates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {interestRates.lowRisk && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">Low Risk Pool</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatPercentage(interestRates.lowRisk.baseRate)} - {formatPercentage(interestRates.lowRisk.maxRate)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">APR Range</div>
                    </div>
                  )}
                  {interestRates.medRisk && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">Medium Risk Pool</div>
                      <div className="text-xl font-bold text-yellow-600">
                        {formatPercentage(interestRates.medRisk.baseRate)} - {formatPercentage(interestRates.medRisk.maxRate)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">APR Range</div>
                    </div>
                  )}
                  {interestRates.highRisk && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">High Risk Pool</div>
                      <div className="text-xl font-bold text-red-600">
                        {formatPercentage(interestRates.highRisk.baseRate)} - {formatPercentage(interestRates.highRisk.maxRate)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">APR Range</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LenderDashboard;