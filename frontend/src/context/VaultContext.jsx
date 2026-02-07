import { createContext, useContext, useEffect, useState } from "react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";

// Import ABI
import TFXReserveVaultABI from "../abis/TFXReserveVault.json";

// Addresses
const VAULT_ADDRESS = "0x957cdF003B9be26812235E40449DA854b0fC0f5F";
const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const TFX_ADDRESS = "0x4b821BBc5C7327A400486eFB61DA250979e32b3B";

const VaultContext = createContext();

export const VaultProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [vault, setVault] = useState(null);
  const [usdc, setUsdc] = useState(null);
  const [tfx, setTfx] = useState(null);
  const [loading, setLoading] = useState(false);

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this application");
      return;
    }

    try {
      setLoading(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Handle both ABI formats
      const vaultABI = TFXReserveVaultABI.abi || TFXReserveVaultABI;

      // Initialize contracts
      const vaultContract = new Contract(VAULT_ADDRESS, vaultABI, signer);

      // For USDC and TFX, we just need basic ERC20 interface
      const erc20ABI = [
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)"
      ];

      const usdcContract = new Contract(USDC_ADDRESS, erc20ABI, signer);
      const tfxContract = new Contract(TFX_ADDRESS, erc20ABI, signer);

      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
      setVault(vaultContract);
      setUsdc(usdcContract);
      setTfx(tfxContract);

      console.log("Vault wallet connected:", accounts[0]);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setVault(null);
    setUsdc(null);
    setTfx(null);
  };

  // Auto connect on mount
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error("Auto-connect failed:", error);
        }
      }
    };
    autoConnect();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          connectWallet();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  /* ===================================================================
     USDC FUNCTIONS
     =================================================================== */

  /**
   * Get USDC balance (6 decimals)
   */
  const getUSDCBalance = async (address) => {
    if (!usdc) return "0";
    try {
      const userAddress = address || account;
      const bal = await usdc.balanceOf(userAddress);
      return formatUnits(bal, 6);
    } catch (error) {
      console.error("Error getting USDC balance:", error);
      return "0";
    }
  };

  /**
   * Approve USDC for vault
   */
  const approveUSDC = async (amount) => {
    if (!usdc) throw new Error("USDC contract not initialized");
    try {
      const tx = await usdc.approve(VAULT_ADDRESS, parseUnits(amount, 6));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error approving USDC:", error);
      throw error;
    }
  };

  /**
   * Get USDC allowance for vault
   */
  const getUSDCAllowance = async () => {
    if (!usdc || !account) return "0";
    try {
      const allowance = await usdc.allowance(account, VAULT_ADDRESS);
      return formatUnits(allowance, 6);
    } catch (error) {
      console.error("Error getting USDC allowance:", error);
      return "0";
    }
  };

  /* ===================================================================
     TFX FUNCTIONS (for vault operations)
     =================================================================== */

  /**
   * Get TFX balance (18 decimals)
   */
  const getTFXBalance = async (address) => {
    if (!tfx) return "0";
    try {
      const userAddress = address || account;
      const bal = await tfx.balanceOf(userAddress);
      return formatUnits(bal, 18);
    } catch (error) {
      console.error("Error getting TFX balance:", error);
      return "0";
    }
  };

  /**
   * Approve TFX for vault
   */
  const approveTFX = async (amount) => {
    if (!tfx) throw new Error("TFX contract not initialized");
    try {
      const tx = await tfx.approve(VAULT_ADDRESS, parseUnits(amount, 18));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error approving TFX:", error);
      throw error;
    }
  };

  /**
   * Get TFX allowance for vault
   */
  const getTFXAllowance = async () => {
    if (!tfx || !account) return "0";
    try {
      const allowance = await tfx.allowance(account, VAULT_ADDRESS);
      return formatUnits(allowance, 18);
    } catch (error) {
      console.error("Error getting TFX allowance:", error);
      return "0";
    }
  };

  /* ===================================================================
     VAULT CORE FUNCTIONS
     =================================================================== */

  /**
   * Buy TFX with USDC
   * @param {string} usdcAmount - Amount of USDC to spend (human readable, e.g., "100")
   */
  const buyTFX = async (usdcAmount) => {
    if (!vault) throw new Error("Vault contract not initialized");

    try {
      setLoading(true);

      // Pre-flight checks
      const usdcBal = await usdc.balanceOf(account);
      const usdcAmountWei = parseUnits(usdcAmount, 6);

      if (usdcBal < usdcAmountWei) {
        throw new Error(`Insufficient USDC balance. You have ${formatUnits(usdcBal, 6)} USDC`);
      }

      // Check vault has enough TFX
      const vaultTfxBal = await tfx.balanceOf(VAULT_ADDRESS);
      const expectedTfx = parseUnits(usdcAmount, 6); // 1:1 ratio, same numeric value

      if (vaultTfxBal < expectedTfx) {
        throw new Error(`Vault has insufficient TFX liquidity. Vault has ${formatUnits(vaultTfxBal, 18)} TFX`);
      }

      // Check if paused
      const paused = await vault.paused();
      if (paused) {
        throw new Error("Vault is currently paused");
      }

      // Check minimum
      const minTx = await vault.minTransactionAmount();
      if (usdcAmountWei < minTx) {
        throw new Error(`Amount below minimum. Minimum is ${formatUnits(minTx, 6)} USDC`);
      }

      // Approve USDC first
      const currentAllowance = await usdc.allowance(account, VAULT_ADDRESS);
      if (currentAllowance < usdcAmountWei) {
        console.log("Approving USDC...");
        const approveTx = await usdc.approve(VAULT_ADDRESS, usdcAmountWei);
        await approveTx.wait();
        console.log("USDC approved");
      }

      // Buy TFX
      console.log("Buying TFX...");
      const tx = await vault.buyTFX(usdcAmountWei);
      await tx.wait();
      console.log("TFX purchase successful!");

      return tx;
    } catch (error) {
      console.error("Error buying TFX:", error);

      // Extract meaningful error message
      let errorMessage = "Failed to buy TFX";

      if (error.message) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }

      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sell TFX for USDC
   * @param {string} tfxAmount - Amount of TFX to sell (human readable, e.g., "100")
   */
  const sellTFX = async (tfxAmount) => {
    if (!vault) throw new Error("Vault contract not initialized");

    try {
      setLoading(true);

      // Pre-flight checks
      const tfxBal = await tfx.balanceOf(account);
      const tfxAmountWei = parseUnits(tfxAmount, 18);

      if (tfxBal < tfxAmountWei) {
        throw new Error(`Insufficient TFX balance. You have ${formatUnits(tfxBal, 18)} TFX`);
      }

      // Check vault has enough USDC
      const vaultUsdcBal = await usdc.balanceOf(VAULT_ADDRESS);
      const expectedUsdc = parseUnits(tfxAmount, 6); // 1:1 ratio, same numeric value

      if (vaultUsdcBal < expectedUsdc) {
        throw new Error(`Vault has insufficient USDC liquidity. Vault has ${formatUnits(vaultUsdcBal, 6)} USDC`);
      }

      // Check if paused
      const paused = await vault.paused();
      if (paused) {
        throw new Error("Vault is currently paused");
      }

      // Approve TFX for vault first
      const currentAllowance = await tfx.allowance(account, VAULT_ADDRESS);
      if (currentAllowance < tfxAmountWei) {
        console.log("Approving TFX...");
        const approveTx = await tfx.approve(VAULT_ADDRESS, tfxAmountWei);
        await approveTx.wait();
        console.log("TFX approved");
      }

      // Sell TFX
      console.log("Selling TFX...");
      const tx = await vault.sellTFX(tfxAmountWei);
      await tx.wait();
      console.log("TFX sale successful!");

      return tx;
    } catch (error) {
      console.error("Error selling TFX:", error);

      // Extract meaningful error message
      let errorMessage = "Failed to sell TFX";

      if (error.message) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }

      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate how much TFX user will receive for USDC amount
   */
  const calculateBuyTFX = async (usdcAmount) => {
    if (!vault) return null;
    try {
      const result = await vault.calculateBuyTFX(parseUnits(usdcAmount, 6));

      // Contract calculates with USDC input (6 decimals) but doesn't convert to TFX decimals (18)
      // So the result is in 6 decimal format, but we need to interpret it as TFX amount
      // For display: treat the 6-decimal result as the actual TFX value (1:1 exchange)

      return {
        tfxAmount: formatUnits(result.tfxAmount, 6),
        feeAmount: formatUnits(result.feeAmount, 6),
        tfxToUser: formatUnits(result.tfxToUser, 6),
      };
    } catch (error) {
      console.error("Error calculating buy TFX:", error);
      return null;
    }
  };

  /**
   * Calculate how much USDC user will receive for TFX amount
   */
  const calculateSellTFX = async (tfxAmount) => {
    if (!vault) return null;
    try {
      const result = await vault.calculateSellTFX(parseUnits(tfxAmount, 18));

      // Contract calculates with TFX input (18 decimals) but doesn't convert to USDC decimals (6)
      // So the result is in 18 decimal format, but we need to interpret it as USDC amount
      // For display: treat the 18-decimal result as the actual USDC value (1:1 exchange)

      return {
        usdcAmount: formatUnits(result.usdcAmount, 18),
        feeAmount: formatUnits(result.feeAmount, 18),
        usdcToUser: formatUnits(result.usdcToUser, 18),
      };
    } catch (error) {
      console.error("Error calculating sell TFX:", error);
      return null;
    }
  };

  /**
   * Get vault liquidity status
   */
  const getVaultLiquidity = async () => {
    if (!vault) return null;
    try {
      const result = await vault.getVaultLiquidity();
      return {
        usdcBalance: formatUnits(result.usdcBalance, 6),
        tfxBalance: formatUnits(result.tfxBalance, 18),
        usdcFeesCollected: formatUnits(result.usdcFeesCollected, 6),
        tfxFeesCollected: formatUnits(result.tfxFeesCollected, 18),
      };
    } catch (error) {
      console.error("Error getting vault liquidity:", error);
      return null;
    }
  };

  /**
   * Get vault statistics
   */
  const getVaultStats = async () => {
    if (!vault) return null;
    try {
      const result = await vault.getVaultStats();
      return {
        totalUSDCDeposited: formatUnits(result._totalUSDCDeposited, 6),
        totalUSDCWithdrawn: formatUnits(result._totalUSDCWithdrawn, 6),
        totalTFXDeposited: formatUnits(result._totalTFXDeposited, 18),
        totalTFXWithdrawn: formatUnits(result._totalTFXWithdrawn, 18),
        totalBuyTx: result._totalBuyTx.toString(),
        totalSellTx: result._totalSellTx.toString(),
      };
    } catch (error) {
      console.error("Error getting vault stats:", error);
      return null;
    }
  };

  /**
   * Get vault configuration
   */
  const getVaultConfig = async () => {
    if (!vault) return null;
    try {
      const [rate, buyFee, sellFee, minTransaction, ratePrecision, maxFee] = await Promise.all([
        vault.rate(),
        vault.buyFee(),
        vault.sellFee(),
        vault.minTransactionAmount(),
        vault.RATE_PRECISION(),
        vault.MAX_FEE(),
      ]);

      return {
        rate: rate.toString(),
        ratePrecision: ratePrecision.toString(),
        buyFee: buyFee.toString(), // in basis points
        sellFee: sellFee.toString(), // in basis points
        maxFee: maxFee.toString(),
        minTransaction: formatUnits(minTransaction, 6),
      };
    } catch (error) {
      console.error("Error getting vault config:", error);
      return null;
    }
  };

  /**
   * Check if vault is paused
   */
  const isVaultPaused = async () => {
    if (!vault) return false;
    try {
      return await vault.paused();
    } catch (error) {
      console.error("Error checking vault pause status:", error);
      return false;
    }
  };

  /**
   * Get vault owner
   */
  const getVaultOwner = async () => {
    if (!vault) return "";
    try {
      return await vault.owner();
    } catch (error) {
      console.error("Error getting vault owner:", error);
      return "";
    }
  };

  /* ===================================================================
     VAULT ADMIN FUNCTIONS
     =================================================================== */

  /**
   * Set exchange rate (owner only)
   * @param {number} newRate - New rate in basis points (10000 = 1:1)
   */
  const setVaultRate = async (newRate) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.setRate(newRate);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error setting vault rate:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Set vault fees (owner only)
   * @param {number} buyFee - Buy fee in basis points
   * @param {number} sellFee - Sell fee in basis points
   */
  const setVaultFees = async (buyFee, sellFee) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.setFees(buyFee, sellFee);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error setting vault fees:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Set minimum transaction amount (owner only)
   * @param {string} newMin - New minimum in USDC (e.g., "1")
   */
  const setMinTransaction = async (newMin) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.setMinTransaction(parseUnits(newMin, 6));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error setting min transaction:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add USDC liquidity to vault (owner only)
   */
  const addUSDCLiquidity = async (amount) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      await approveUSDC(amount);
      const tx = await vault.addUSDCLiquidity(parseUnits(amount, 6));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error adding USDC liquidity:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add TFX liquidity to vault (owner only)
   */
  const addTFXLiquidity = async (amount) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      await approveTFX(amount);
      const tx = await vault.addTFXLiquidity(parseUnits(amount, 18));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error adding TFX liquidity:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Withdraw USDC from vault (owner only)
   */
  const withdrawUSDC = async (amount) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.withdrawUSDC(parseUnits(amount, 6));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error withdrawing USDC:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Withdraw TFX from vault (owner only)
   */
  const withdrawTFX = async (amount) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.withdrawTFX(parseUnits(amount, 18));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error withdrawing TFX:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Collect accumulated fees (owner only)
   */
  const collectVaultFees = async () => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.collectFees();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error collecting vault fees:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Emergency withdraw any ERC20 token (owner only)
   */
  const emergencyWithdrawVault = async (tokenAddress, amount, toAddress) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.emergencyWithdraw(
        tokenAddress,
        parseUnits(amount, 18), // assuming 18 decimals, adjust if needed
        toAddress
      );
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error emergency withdraw:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Pause vault (owner only)
   */
  const pauseVault = async () => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.pause();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error pausing vault:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Unpause vault (owner only)
   */
  const unpauseVault = async () => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.unpause();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error unpausing vault:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <VaultContext.Provider
      value={{
        // State
        account,
        provider,
        signer,
        vault,
        usdc,
        tfx,
        loading,

        // Wallet functions
        connectWallet,
        disconnectWallet,

        // USDC Functions
        getUSDCBalance,
        approveUSDC,
        getUSDCAllowance,

        // TFX Functions (for vault)
        getTFXBalance,
        approveTFX,
        getTFXAllowance,

        // Vault Core Functions
        buyTFX,
        sellTFX,
        calculateBuyTFX,
        calculateSellTFX,
        getVaultLiquidity,
        getVaultStats,
        getVaultConfig,
        isVaultPaused,
        getVaultOwner,

        // Vault Admin Functions
        setVaultRate,
        setVaultFees,
        setMinTransaction,
        addUSDCLiquidity,
        addTFXLiquidity,
        withdrawUSDC,
        withdrawTFX,
        collectVaultFees,
        emergencyWithdrawVault,
        pauseVault,
        unpauseVault,

        // Constants
        VAULT_ADDRESS,
        USDC_ADDRESS,
        TFX_ADDRESS,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within VaultProvider");
  }
  return context;
};
