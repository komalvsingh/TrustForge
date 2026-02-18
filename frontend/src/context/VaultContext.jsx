import { createContext, useContext, useEffect, useState } from "react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";

// Import ABI
import TFXReserveVaultABI from "../abis/TFXReserveVault.json";

// Addresses
const VAULT_ADDRESS = "0x1023a17d0E6094cc83Aa38791dbd094856c229fA";
const USDC_ADDRESS  = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const TFX_ADDRESS   = "0x4b821BBc5C7327A400486eFB61DA250979e32b3B";

// Decimals — centralised so any future change is one-line
const USDC_DECIMALS = 6;
const TFX_DECIMALS  = 18;

const VaultContext = createContext();

export const VaultProvider = ({ children }) => {
  const [account,  setAccount]  = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer,   setSigner]   = useState(null);
  const [vault,    setVault]    = useState(null);
  const [usdc,     setUsdc]     = useState(null);
  const [tfx,      setTfx]      = useState(null);
  const [loading,  setLoading]  = useState(false);

  // ─── Wallet ─────────────────────────────────────────────────────────────────

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this application");
      return;
    }

    try {
      setLoading(true);

      // ── Step 1: Force switch to Sepolia ─────────────────────────────────────
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }], // Sepolia chain ID
        });
      } catch (switchError) {
        // Error code 4902 = Sepolia not added to MetaMask yet → add it
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0xaa36a7",
                  chainName: "Sepolia Test Network",
                  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["https://rpc.sepolia.org"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
          } catch (addError) {
            throw new Error("Failed to add Sepolia network to MetaMask: " + addError.message);
          }
        } else {
          // User rejected the network switch
          throw new Error("Please switch to Sepolia network to use this app.");
        }
      }

      // ── Step 2: Request wallet accounts ─────────────────────────────────────
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // ── Step 3: Confirm we're actually on Sepolia now ────────────────────────
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== "0xaa36a7") {
        throw new Error("Wrong network. Please switch to Sepolia and try again.");
      }

      // ── Step 4: Init provider, signer, contracts ─────────────────────────────
      const _provider = new BrowserProvider(window.ethereum);
      const _signer   = await _provider.getSigner();
      const vaultABI  = TFXReserveVaultABI.abi || TFXReserveVaultABI;

      const erc20ABI = [
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
      ];

      setAccount(accounts[0]);
      setProvider(_provider);
      setSigner(_signer);
      setVault(new Contract(VAULT_ADDRESS, vaultABI, _signer));
      setUsdc(new Contract(USDC_ADDRESS,  erc20ABI, _signer));
      setTfx(new Contract(TFX_ADDRESS,   erc20ABI, _signer));

      console.log("✅ Wallet connected on Sepolia:", accounts[0]);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setVault(null);
    setUsdc(null);
    setTfx(null);
  };

  // Auto-connect on mount
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) await connectWallet();
        } catch (error) {
          console.error("Auto-connect failed:", error);
        }
      }
    };
    autoConnect();
  }, []);

  // Account / chain listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) disconnectWallet();
      else connectWallet();
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged",    handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged",    handleChainChanged);
    };
  }, []);

  // ─── USDC helpers ────────────────────────────────────────────────────────────

  const getUSDCBalance = async (address) => {
    if (!usdc) return "0";
    try {
      const bal = await usdc.balanceOf(address || account);
      return formatUnits(bal, USDC_DECIMALS);
    } catch (e) {
      console.error("getUSDCBalance:", e);
      return "0";
    }
  };

  const approveUSDC = async (amount) => {
    if (!usdc) throw new Error("USDC contract not initialized");
    const tx = await usdc.approve(VAULT_ADDRESS, parseUnits(amount, USDC_DECIMALS));
    await tx.wait();
    return tx;
  };

  const getUSDCAllowance = async () => {
    if (!usdc || !account) return "0";
    try {
      const allowance = await usdc.allowance(account, VAULT_ADDRESS);
      return formatUnits(allowance, USDC_DECIMALS);
    } catch (e) {
      console.error("getUSDCAllowance:", e);
      return "0";
    }
  };

  // ─── TFX helpers ─────────────────────────────────────────────────────────────

  const getTFXBalance = async (address) => {
    if (!tfx) return "0";
    try {
      const bal = await tfx.balanceOf(address || account);
      return formatUnits(bal, TFX_DECIMALS);
    } catch (e) {
      console.error("getTFXBalance:", e);
      return "0";
    }
  };

  const approveTFX = async (amount) => {
    if (!tfx) throw new Error("TFX contract not initialized");
    const tx = await tfx.approve(VAULT_ADDRESS, parseUnits(amount, TFX_DECIMALS));
    await tx.wait();
    return tx;
  };

  const getTFXAllowance = async () => {
    if (!tfx || !account) return "0";
    try {
      const allowance = await tfx.allowance(account, VAULT_ADDRESS);
      return formatUnits(allowance, TFX_DECIMALS);
    } catch (e) {
      console.error("getTFXAllowance:", e);
      return "0";
    }
  };

  // ─── Vault core ──────────────────────────────────────────────────────────────

  /**
   * Buy TFX with USDC (1:1 after decimal adjustment in contract).
   * @param {string} usdcAmount  Human-readable USDC, e.g. "10"
   */
  const buyTFX = async (usdcAmount) => {
    if (!vault) throw new Error("Vault contract not initialized");

    try {
      setLoading(true);

      const usdcAmountWei = parseUnits(usdcAmount, USDC_DECIMALS);

      // ── Pre-flight checks ──────────────────────────────────────────────────

      // 1. User has enough USDC
      const usdcBal = await usdc.balanceOf(account);
      if (usdcBal < usdcAmountWei) {
        throw new Error(
          `Insufficient USDC balance. You have ${formatUnits(usdcBal, USDC_DECIMALS)} USDC`
        );
      }

      // 2. Vault has enough TFX
      //    FIX: at 1:1 rate, buying N USDC yields N TFX.
      //    TFX is 18 decimals, so we must check against parseUnits(usdcAmount, TFX_DECIMALS).
      //    Old code used parseUnits(usdcAmount, 6) which was 1e12x too small.
      const vaultTfxBal   = await tfx.balanceOf(VAULT_ADDRESS);
      const expectedTFXWei = parseUnits(usdcAmount, TFX_DECIMALS); // ✅ FIXED (was USDC_DECIMALS)
      if (vaultTfxBal < expectedTFXWei) {
        throw new Error(
          `Vault has insufficient TFX liquidity. Vault has ${formatUnits(vaultTfxBal, TFX_DECIMALS)} TFX`
        );
      }

      // 3. Vault is not paused
      if (await vault.paused()) throw new Error("Vault is currently paused");

      // 4. Above minimum transaction
      const minTx = await vault.minTransactionAmount();
      if (usdcAmountWei < minTx) {
        throw new Error(
          `Amount below minimum. Minimum is ${formatUnits(minTx, USDC_DECIMALS)} USDC`
        );
      }

      // ── Approve if needed ─────────────────────────────────────────────────
      const currentAllowance = await usdc.allowance(account, VAULT_ADDRESS);
      if (currentAllowance < usdcAmountWei) {
        console.log("Approving USDC...");
        const approveTx = await usdc.approve(VAULT_ADDRESS, usdcAmountWei);
        await approveTx.wait();
        console.log("USDC approved");
      }

      // ── Execute ───────────────────────────────────────────────────────────
      console.log("Buying TFX...");
      const tx = await vault.buyTFX(usdcAmountWei);
      await tx.wait();
      console.log("TFX purchase successful!");
      return tx;

    } catch (error) {
      console.error("buyTFX error:", error);
      throw new Error(error.reason || error.data?.message || error.message || "Failed to buy TFX");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sell TFX for USDC (1:1 after decimal adjustment in contract).
   * @param {string} tfxAmount  Human-readable TFX, e.g. "10"
   */
  const sellTFX = async (tfxAmount) => {
    if (!vault) throw new Error("Vault contract not initialized");

    try {
      setLoading(true);

      const tfxAmountWei = parseUnits(tfxAmount, TFX_DECIMALS);

      // ── Pre-flight checks ──────────────────────────────────────────────────

      // 1. User has enough TFX
      const tfxBal = await tfx.balanceOf(account);
      if (tfxBal < tfxAmountWei) {
        throw new Error(
          `Insufficient TFX balance. You have ${formatUnits(tfxBal, TFX_DECIMALS)} TFX`
        );
      }

      // 2. Vault has enough USDC
      //    At 1:1 rate, selling N TFX yields N USDC.
      //    USDC is 6 decimals, so expected = parseUnits(tfxAmount, USDC_DECIMALS).
      const vaultUsdcBal    = await usdc.balanceOf(VAULT_ADDRESS);
      const expectedUSDCWei = parseUnits(tfxAmount, USDC_DECIMALS); // ✅ explicit & correct
      if (vaultUsdcBal < expectedUSDCWei) {
        throw new Error(
          `Vault has insufficient USDC liquidity. Vault has ${formatUnits(vaultUsdcBal, USDC_DECIMALS)} USDC`
        );
      }

      // 3. Vault is not paused
      if (await vault.paused()) throw new Error("Vault is currently paused");

      // ── Approve if needed ─────────────────────────────────────────────────
      const currentAllowance = await tfx.allowance(account, VAULT_ADDRESS);
      if (currentAllowance < tfxAmountWei) {
        console.log("Approving TFX...");
        const approveTx = await tfx.approve(VAULT_ADDRESS, tfxAmountWei);
        await approveTx.wait();
        console.log("TFX approved");
      }

      // ── Execute ───────────────────────────────────────────────────────────
      console.log("Selling TFX...");
      const tx = await vault.sellTFX(tfxAmountWei);
      await tx.wait();
      console.log("TFX sale successful!");
      return tx;

    } catch (error) {
      console.error("sellTFX error:", error);
      throw new Error(error.reason || error.data?.message || error.message || "Failed to sell TFX");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Preview: how much TFX will the user receive for a given USDC amount?
   * Contract returns TFX values in 18 decimals (after the contract decimal fix).
   */
  const calculateBuyTFX = async (usdcAmount) => {
    if (!vault) return null;
    try {
      const result = await vault.calculateBuyTFX(parseUnits(usdcAmount, USDC_DECIMALS));
      return {
        tfxAmount: formatUnits(result.tfxAmount, TFX_DECIMALS), // ✅ FIXED (was 6)
        feeAmount: formatUnits(result.feeAmount, TFX_DECIMALS), // ✅ FIXED (was 6)
        tfxToUser: formatUnits(result.tfxToUser, TFX_DECIMALS), // ✅ FIXED (was 6)
      };
    } catch (e) {
      console.error("calculateBuyTFX:", e);
      return null;
    }
  };

  /**
   * Preview: how much USDC will the user receive for a given TFX amount?
   * Contract returns USDC values in 6 decimals (after the contract decimal fix).
   */
  const calculateSellTFX = async (tfxAmount) => {
    if (!vault) return null;
    try {
      const result = await vault.calculateSellTFX(parseUnits(tfxAmount, TFX_DECIMALS));
      return {
        usdcAmount: formatUnits(result.usdcAmount, USDC_DECIMALS), // ✅ FIXED (was 18)
        feeAmount:  formatUnits(result.feeAmount,  USDC_DECIMALS), // ✅ FIXED (was 18)
        usdcToUser: formatUnits(result.usdcToUser, USDC_DECIMALS), // ✅ FIXED (was 18)
      };
    } catch (e) {
      console.error("calculateSellTFX:", e);
      return null;
    }
  };

  // ─── Vault read helpers ───────────────────────────────────────────────────

  const getVaultLiquidity = async () => {
    if (!vault) return null;
    try {
      const r = await vault.getVaultLiquidity();
      return {
        usdcBalance:       formatUnits(r.usdcBalance,       USDC_DECIMALS),
        tfxBalance:        formatUnits(r.tfxBalance,        TFX_DECIMALS),
        usdcFeesCollected: formatUnits(r.usdcFeesCollected, USDC_DECIMALS),
        tfxFeesCollected:  formatUnits(r.tfxFeesCollected,  TFX_DECIMALS),
      };
    } catch (e) {
      console.error("getVaultLiquidity:", e);
      return null;
    }
  };

  const getVaultStats = async () => {
    if (!vault) return null;
    try {
      const r = await vault.getVaultStats();
      return {
        totalUSDCDeposited: formatUnits(r._totalUSDCDeposited, USDC_DECIMALS),
        totalUSDCWithdrawn: formatUnits(r._totalUSDCWithdrawn, USDC_DECIMALS),
        totalTFXDeposited:  formatUnits(r._totalTFXDeposited,  TFX_DECIMALS),
        totalTFXWithdrawn:  formatUnits(r._totalTFXWithdrawn,  TFX_DECIMALS),
        totalBuyTx:         r._totalBuyTx.toString(),
        totalSellTx:        r._totalSellTx.toString(),
      };
    } catch (e) {
      console.error("getVaultStats:", e);
      return null;
    }
  };

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
        rate:           rate.toString(),
        ratePrecision:  ratePrecision.toString(),
        buyFee:         buyFee.toString(),
        sellFee:        sellFee.toString(),
        maxFee:         maxFee.toString(),
        minTransaction: formatUnits(minTransaction, USDC_DECIMALS),
      };
    } catch (e) {
      console.error("getVaultConfig:", e);
      return null;
    }
  };

  const isVaultPaused = async () => {
    if (!vault) return false;
    try { return await vault.paused(); }
    catch (e) { console.error("isVaultPaused:", e); return false; }
  };

  const getVaultOwner = async () => {
    if (!vault) return "";
    try { return await vault.owner(); }
    catch (e) { console.error("getVaultOwner:", e); return ""; }
  };

  // ─── Vault admin ─────────────────────────────────────────────────────────────

  const setVaultRate = async (newRate) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.setRate(newRate);
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  const setVaultFees = async (buyFee, sellFee) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.setFees(buyFee, sellFee);
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  const setMinTransaction = async (newMin) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.setMinTransaction(parseUnits(newMin, USDC_DECIMALS));
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  const addUSDCLiquidity = async (amount) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      await approveUSDC(amount);
      const tx = await vault.addUSDCLiquidity(parseUnits(amount, USDC_DECIMALS));
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  const addTFXLiquidity = async (amount) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      await approveTFX(amount);
      const tx = await vault.addTFXLiquidity(parseUnits(amount, TFX_DECIMALS));
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  const withdrawUSDC = async (amount) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.withdrawUSDC(parseUnits(amount, USDC_DECIMALS));
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  const withdrawTFX = async (amount) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.withdrawTFX(parseUnits(amount, TFX_DECIMALS));
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  const collectVaultFees = async () => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.collectFees();
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  /**
   * Emergency withdraw — caller must supply the correct token's decimals.
   * Defaults to 18; pass decimals=6 for USDC.
   */
  const emergencyWithdrawVault = async (tokenAddress, amount, toAddress, decimals = 18) => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.emergencyWithdraw(
        tokenAddress,
        parseUnits(amount, decimals),
        toAddress
      );
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  const pauseVault = async () => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.pause();
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  const unpauseVault = async () => {
    if (!vault) throw new Error("Vault contract not initialized");
    try {
      setLoading(true);
      const tx = await vault.unpause();
      await tx.wait();
      return tx;
    } finally { setLoading(false); }
  };

  // ─── Provider ─────────────────────────────────────────────────────────────

  return (
    <VaultContext.Provider
      value={{
        // State
        account, provider, signer, vault, usdc, tfx, loading,

        // Wallet
        connectWallet, disconnectWallet,

        // USDC
        getUSDCBalance, approveUSDC, getUSDCAllowance,

        // TFX
        getTFXBalance, approveTFX, getTFXAllowance,

        // Vault core
        buyTFX, sellTFX,
        calculateBuyTFX, calculateSellTFX,
        getVaultLiquidity, getVaultStats,
        getVaultConfig, isVaultPaused, getVaultOwner,

        // Vault admin
        setVaultRate, setVaultFees, setMinTransaction,
        addUSDCLiquidity, addTFXLiquidity,
        withdrawUSDC, withdrawTFX,
        collectVaultFees, emergencyWithdrawVault,
        pauseVault, unpauseVault,

        // Constants
        VAULT_ADDRESS, USDC_ADDRESS, TFX_ADDRESS,
        USDC_DECIMALS, TFX_DECIMALS,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error("useVault must be used within VaultProvider");
  return context;
};
