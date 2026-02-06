import { useEffect, useState } from "react";
import { useBlockchain, RiskPool } from "../../context/BlockchainContext";
import Navbar from "../../components/navbar";

const LenderDashboard = () => {
  const {
    account,
    connectWallet,
    depositToPool,
    withdrawFromPool,
    claimInterest,
    getAllPoolStats,
    loading,
  } = useBlockchain();

  const [amount, setAmount] = useState("");
  const [selectedPool, setSelectedPool] = useState(RiskPool.LOW_RISK);
  const [stats, setStats] = useState(null);
  const [autoMode, setAutoMode] = useState(false);

  const loadStats = async () => {
    const s = await getAllPoolStats();
    setStats(s);
  };

  useEffect(() => {
    if (account) loadStats();
  }, [account]);

  /* ================= AUTO CALC ================= */
  const totalNum = Number(amount || 0);
  const lowAmt = (totalNum * 0.5).toFixed(2);
  const medAmt = (totalNum * 0.3).toFixed(2);
  const highAmt = (totalNum * 0.2).toFixed(2);

  /* ================= HANDLERS ================= */

  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) return alert("Enter valid amount");

    try {
      if (autoMode) {
        await depositToPool(lowAmt, RiskPool.LOW_RISK);
        await depositToPool(medAmt, RiskPool.MEDIUM_RISK);
        await depositToPool(highAmt, RiskPool.HIGH_RISK);
      } else {
        await depositToPool(amount, selectedPool);
      }

      setAmount("");
      loadStats();
    } catch (err) {
      console.error(err);
      alert("Transaction failed");
    }
  };

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) return alert("Enter valid amount");
    await withdrawFromPool(amount, selectedPool);
    setAmount("");
    loadStats();
  };

  /* ================= WALLET ================= */

  if (!account) {
    return (
      <div className="p-6">
        <button
          onClick={connectWallet}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Navbar />
      <h2 className="text-2xl font-bold">Lender Dashboard</h2>

      {/* AUTO TOGGLE */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={autoMode}
          onChange={() => setAutoMode(!autoMode)}
        />
        Auto Allocation (50 / 30 / 20)
      </label>

      {/* POOL SELECT - ONLY MANUAL */}
      {!autoMode && (
        <select
          value={selectedPool}
          onChange={(e) => setSelectedPool(Number(e.target.value))}
          className="border p-2 rounded"
        >
          <option value={0}>Low Risk</option>
          <option value={1}>Medium Risk</option>
          <option value={2}>High Risk</option>
        </select>
      )}

      {/* AMOUNT */}
      <input
        type="number"
        placeholder="Enter TFX Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="border p-2 rounded w-full"
      />

      {/* AUTO PREVIEW */}
      {autoMode && totalNum > 0 && (
        <div className="border p-3 rounded bg-gray-50">
          <p>Low Risk: {lowAmt} TFX</p>
          <p>Medium Risk: {medAmt} TFX</p>
          <p>High Risk: {highAmt} TFX</p>
        </div>
      )}

      {/* BUTTONS */}
      <div className="space-x-3">
        <button
          onClick={handleDeposit}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Deposit
        </button>

        <button
          onClick={handleWithdraw}
          disabled={loading}
          className="bg-yellow-600 text-white px-4 py-2 rounded"
        >
          Withdraw
        </button>

        <button
          onClick={claimInterest}
          disabled={loading}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Claim Interest
        </button>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(stats).map(([key, pool]) => (
            <div key={key} className="border p-3 rounded">
              <h3 className="font-bold">{key}</h3>
              <p>Liquidity: {pool.totalLiquidity}</p>
              <p>Active Loans: {pool.totalActiveLoans}</p>
              <p>Defaults: {pool.totalDefaulted}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LenderDashboard;
