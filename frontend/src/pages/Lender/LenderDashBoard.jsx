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

  const formatNumber = (num) => {
    const n = parseFloat(num);
    if (isNaN(n)) return '0.00';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    if (!lenderInfo) return '0';
    return (
      parseFloat(lenderInfo.pendingInterestLow) +
      parseFloat(lenderInfo.pendingInterestMed) +
      parseFloat(lenderInfo.pendingInterestHigh)
    ).toFixed(2);
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Lender Dashboard</h1>
          <p className="text-gray-600">Manage your deposits and earn interest across risk pools</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-500 mb-1">Wallet Balance</div>
            <div className="text-2xl font-bold text-gray-800">{formatNumber(tfxBalance)} TFX</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-500 mb-1">Total Deposited</div>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(getTotalDeposited())} TFX</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-500 mb-1">Pending Interest</div>
            <div className="text-2xl font-bold text-green-600">{formatNumber(getTotalPendingInterest())} TFX</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-500 mb-1">Total Earned</div>
            <div className="text-2xl font-bold text-purple-600">
              {lenderInfo ? formatNumber(lenderInfo.totalInterestEarned) : '0.00'} TFX
            </div>
          </div>
        </div>

        {/* Claim Interest Button */}
        {parseFloat(getTotalPendingInterest()) > 0 && (
          <div className="mb-8">
            <button
              onClick={handleClaimInterest}
              disabled={txLoading}
              className="w-full md:w-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-8 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {txLoading ? 'Processing...' : `Claim ${formatNumber(getTotalPendingInterest())} TFX Interest`}
            </button>
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
                        <span><strong>Auto Mode:</strong> The smart contract automatically distributes your deposit across all three pools based on current market conditions and optimal returns.</span>
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
                          ? `${config.borderColor} ${config.bgLight}`
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="mt-2 text-sm text-gray-500">
                      Available: {formatNumber(tfxBalance)} TFX
                    </div>
                  </div>
                  <button
                    onClick={handleDeposit}
                    disabled={txLoading || !depositAmount}
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
                    disabled={txLoading || !withdrawAmount}
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
                        {formatNumber(lenderInfo.pendingInterestLow)} TFX
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Medium Risk Pool</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatNumber(lenderInfo.pendingInterestMed)} TFX
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">High Risk Pool</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatNumber(lenderInfo.pendingInterestHigh)} TFX
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
                    {lenderInfo ? formatNumber(lenderInfo.totalInterestEarned) : '0.00'} TFX
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
                      {lenderInfo ? formatNumber(lenderInfo.pendingInterestLow) : '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">TFX Pending</div>
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
                      {lenderInfo ? formatNumber(lenderInfo.pendingInterestMed) : '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">TFX Pending</div>
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
                      {lenderInfo ? formatNumber(lenderInfo.pendingInterestHigh) : '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">TFX Pending</div>
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
                      {formatNumber(getTotalPendingInterest())} TFX
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <div className="text-gray-500">Low Risk</div>
                      <div className="font-semibold text-green-600">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestLow) : '0.00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Medium Risk</div>
                      <div className="font-semibold text-yellow-600">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestMed) : '0.00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">High Risk</div>
                      <div className="font-semibold text-red-600">
                        {lenderInfo ? formatNumber(lenderInfo.pendingInterestHigh) : '0.00'}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClaimInterest}
                  disabled={txLoading || parseFloat(getTotalPendingInterest()) === 0}
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
                  ) : parseFloat(getTotalPendingInterest()) === 0 ? (
                    '✓ No Interest to Claim'
                  ) : (
                    `🎉 Claim ${formatNumber(getTotalPendingInterest())} TFX Interest`
                  )}
                </button>

                {parseFloat(getTotalPendingInterest()) === 0 && (
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
