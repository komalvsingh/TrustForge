import { useState, useEffect } from "react";
import { useVault } from "../context/VaultContext";

const VaultAdmin = () => {
  const {
    account,
    loading,
    getVaultOwner,
    getVaultLiquidity,
    getUSDCBalance,
    getTFXBalance,
    addUSDCLiquidity,
    addTFXLiquidity,
    withdrawUSDC,
    withdrawTFX,
    collectVaultFees,
    setVaultFees,
    setVaultRate,
    pauseVault,
    unpauseVault,
    isVaultPaused,
  } = useVault();

  const [isOwner, setIsOwner] = useState(false);
  const [vaultOwner, setVaultOwner] = useState("");
  const [vaultLiquidity, setVaultLiquidity] = useState(null);
  const [userBalances, setUserBalances] = useState({ usdc: "0", tfx: "0" });
  const [paused, setPaused] = useState(false);

  // Add liquidity form
  const [usdcAmount, setUsdcAmount] = useState("");
  const [tfxAmount, setTfxAmount] = useState("");

  // Withdraw form
  const [withdrawUsdcAmount, setWithdrawUsdcAmount] = useState("");
  const [withdrawTfxAmount, setWithdrawTfxAmount] = useState("");

  // Fee form
  const [buyFee, setBuyFee] = useState("30");
  const [sellFee, setSellFee] = useState("30");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load initial data
  useEffect(() => {
    if (!account) return;

    const loadData = async () => {
      try {
        const [owner, liquidity, usdcBal, tfxBal, isPaused] = await Promise.all([
          getVaultOwner(),
          getVaultLiquidity(),
          getUSDCBalance(),
          getTFXBalance(),
          isVaultPaused(),
        ]);

        setVaultOwner(owner);
        setIsOwner(account.toLowerCase() === owner.toLowerCase());
        setVaultLiquidity(liquidity);
        setUserBalances({ usdc: usdcBal, tfx: tfxBal });
        setPaused(isPaused);
      } catch (err) {
        console.error("Error loading admin data:", err);
      }
    };

    loadData();
  }, [account]);

  const refreshData = async () => {
    const [liquidity, usdcBal, tfxBal, isPaused] = await Promise.all([
      getVaultLiquidity(),
      getUSDCBalance(),
      getTFXBalance(),
      isVaultPaused(),
    ]);
    setVaultLiquidity(liquidity);
    setUserBalances({ usdc: usdcBal, tfx: tfxBal });
    setPaused(isPaused);
  };

  const handleAddUSDC = async () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      setError("Enter valid USDC amount");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await addUSDCLiquidity(usdcAmount);
      setSuccess(`Added ${usdcAmount} USDC to vault!`);
      setUsdcAmount("");
      await refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddTFX = async () => {
    if (!tfxAmount || parseFloat(tfxAmount) <= 0) {
      setError("Enter valid TFX amount");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await addTFXLiquidity(tfxAmount);
      setSuccess(`Added ${tfxAmount} TFX to vault!`);
      setTfxAmount("");
      await refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWithdrawUSDC = async () => {
    if (!withdrawUsdcAmount || parseFloat(withdrawUsdcAmount) <= 0) {
      setError("Enter valid USDC amount");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await withdrawUSDC(withdrawUsdcAmount);
      setSuccess(`Withdrew ${withdrawUsdcAmount} USDC from vault!`);
      setWithdrawUsdcAmount("");
      await refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWithdrawTFX = async () => {
    if (!withdrawTfxAmount || parseFloat(withdrawTfxAmount) <= 0) {
      setError("Enter valid TFX amount");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await withdrawTFX(withdrawTfxAmount);
      setSuccess(`Withdrew ${withdrawTfxAmount} TFX from vault!`);
      setWithdrawTfxAmount("");
      await refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCollectFees = async () => {
    setError("");
    setSuccess("");

    try {
      await collectVaultFees();
      setSuccess("Collected fees successfully!");
      await refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateFees = async () => {
    setError("");
    setSuccess("");

    try {
      await setVaultFees(parseInt(buyFee), parseInt(sellFee));
      setSuccess("Fees updated successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTogglePause = async () => {
    setError("");
    setSuccess("");

    try {
      if (paused) {
        await unpauseVault();
        setSuccess("Vault unpaused!");
      } else {
        await pauseVault();
        setSuccess("Vault paused!");
      }
      await refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!account) {
    return <div style={{ padding: 20 }}>Connect wallet to access admin panel</div>;
  }

  if (!isOwner) {
    return (
      <div style={{ padding: 20, border: "2px solid red", borderRadius: 8 }}>
        <h3>⛔ Access Denied</h3>
        <p>Only the vault owner can access this panel.</p>
        <p><strong>Vault Owner:</strong> {vaultOwner}</p>
        <p><strong>Your Address:</strong> {account}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, border: "2px solid #4CAF50", borderRadius: 8 }}>
      <h2>🔐 Vault Admin Panel</h2>

      {/* Messages */}
      {error && (
        <div style={{ padding: 10, backgroundColor: "#ffebee", color: "#c62828", borderRadius: 4, marginBottom: 10 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: 10, backgroundColor: "#e8f5e9", color: "#2e7d32", borderRadius: 4, marginBottom: 10 }}>
          {success}
        </div>
      )}

      {/* Vault Status */}
      <div style={{ marginBottom: 20, padding: 15, backgroundColor: "#f5f5f5", borderRadius: 4 }}>
        <h3>Vault Status</h3>
        <p style={{ color: paused ? "red" : "green", fontWeight: "bold" }}>
          {paused ? "⏸️ PAUSED" : "▶️ ACTIVE"}
        </p>
        <button onClick={handleTogglePause} disabled={loading}>
          {paused ? "Unpause Vault" : "Pause Vault"}
        </button>
      </div>

      {/* Current Liquidity */}
      {vaultLiquidity && (
        <div style={{ marginBottom: 20, padding: 15, backgroundColor: "#e3f2fd", borderRadius: 4 }}>
          <h3>Current Vault Liquidity</h3>
          <p><strong>USDC:</strong> {parseFloat(vaultLiquidity.usdcBalance).toFixed(2)}</p>
          <p><strong>TFX:</strong> {parseFloat(vaultLiquidity.tfxBalance).toFixed(2)}</p>
          <p style={{ fontSize: 12, color: "#666" }}>
            Fees: {parseFloat(vaultLiquidity.usdcFeesCollected).toFixed(2)} USDC, {parseFloat(vaultLiquidity.tfxFeesCollected).toFixed(4)} TFX
          </p>
          <button onClick={handleCollectFees} disabled={loading}>
            💰 Collect Fees
          </button>
        </div>
      )}

      {/* Your Balances */}
      <div style={{ marginBottom: 20, padding: 15, backgroundColor: "#fff3e0", borderRadius: 4 }}>
        <h3>Your Wallet Balances</h3>
        <p><strong>USDC:</strong> {parseFloat(userBalances.usdc).toFixed(2)}</p>
        <p><strong>TFX:</strong> {parseFloat(userBalances.tfx).toFixed(2)}</p>
      </div>

      <hr />

      {/* Add Liquidity */}
      <div style={{ marginBottom: 30 }}>
        <h3>➕ Add Liquidity</h3>

        <div style={{ marginBottom: 15 }}>
          <label>Add USDC</label>
          <input
            type="number"
            placeholder="USDC amount"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 5 }}
          />
          <button onClick={handleAddUSDC} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Processing..." : "Add USDC"}
          </button>
        </div>

        <div style={{ marginBottom: 15 }}>
          <label>Add TFX</label>
          <input
            type="number"
            placeholder="TFX amount"
            value={tfxAmount}
            onChange={(e) => setTfxAmount(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 5 }}
          />
          <button onClick={handleAddTFX} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Processing..." : "Add TFX"}
          </button>
        </div>
      </div>

      <hr />

      {/* Withdraw Liquidity */}
      <div style={{ marginBottom: 30 }}>
        <h3>➖ Withdraw Liquidity</h3>

        <div style={{ marginBottom: 15 }}>
          <label>Withdraw USDC</label>
          <input
            type="number"
            placeholder="USDC amount"
            value={withdrawUsdcAmount}
            onChange={(e) => setWithdrawUsdcAmount(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 5 }}
          />
          <button onClick={handleWithdrawUSDC} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Processing..." : "Withdraw USDC"}
          </button>
        </div>

        <div style={{ marginBottom: 15 }}>
          <label>Withdraw TFX</label>
          <input
            type="number"
            placeholder="TFX amount"
            value={withdrawTfxAmount}
            onChange={(e) => setWithdrawTfxAmount(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 5 }}
          />
          <button onClick={handleWithdrawTFX} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Processing..." : "Withdraw TFX"}
          </button>
        </div>
      </div>

      <hr />

      {/* Update Fees */}
      <div style={{ marginBottom: 30 }}>
        <h3>⚙️ Update Fees</h3>
        <p style={{ fontSize: 12, color: "#666" }}>Fees are in basis points (100 = 1%)</p>

        <div style={{ marginBottom: 10 }}>
          <label>Buy Fee (basis points)</label>
          <input
            type="number"
            value={buyFee}
            onChange={(e) => setBuyFee(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
          <small>Current: {(parseFloat(buyFee) / 100).toFixed(2)}%</small>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Sell Fee (basis points)</label>
          <input
            type="number"
            value={sellFee}
            onChange={(e) => setSellFee(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
          <small>Current: {(parseFloat(sellFee) / 100).toFixed(2)}%</small>
        </div>

        <button onClick={handleUpdateFees} disabled={loading} style={{ width: "100%" }}>
          {loading ? "Processing..." : "Update Fees"}
        </button>
      </div>

      <button onClick={refreshData} style={{ width: "100%", padding: 10 }}>
        🔄 Refresh Data
      </button>
    </div>
  );
};

export default VaultAdmin;
