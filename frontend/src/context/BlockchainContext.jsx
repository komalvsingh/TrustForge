
import { createContext, useContext, useEffect, useState } from "react";
import {
  BrowserProvider,
  Contract,
  formatUnits,
  parseUnits,
} from "ethers";

import TrustForgeABI    from "../abis/TrustForge.json";
import TrustForgeDAOABI from "../abis/TrustForgeDAO.json";

// ─── Contract Addresses ───────────────────────────────────────────────────────
// Update these after running deploy.js + link.js
const USDC_ADDRESS       = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC
const TRUSTFORGE_ADDRESS = "0x3013e7F2a98F60433BAe85c4E5569A980B0C7Cf7";
const DAO_ADDRESS        = "0x235bf11EE405648895Bc14c78993aa593D0E3284";

// ─── Token Decimals ───────────────────────────────────────────────────────────
// USDC has 6 decimals. NEVER use parseEther/formatEther for USDC amounts.
const USDC_DECIMALS = 6;

const fmt  = (raw) => formatUnits(raw, USDC_DECIMALS);   // BigInt → "1.500000"
const prs  = (str) => parseUnits(String(str), USDC_DECIMALS); // "1.5" → 1500000n

// ─── Contract Enums (matching Solidity exactly) ───────────────────────────────
export const RiskPool = {
  LOW_RISK:    0,
  MEDIUM_RISK: 1,
  HIGH_RISK:   2,
};

export const LoanStatus = {
  ACTIVE:    0,
  REPAID:    1,
  DEFAULTED: 2,
};

export const ProposalState = {
  PENDING:    0,
  ACTIVE:     1,
  DEFEATED:   2,
  QUEUED:     3,
  EXECUTABLE: 4,
  EXECUTED:   5,
  CANCELLED:  6,
};

// ─── Context ──────────────────────────────────────────────────────────────────
const BlockchainContext = createContext();

export const BlockchainProvider = ({ children }) => {
  const [account,     setAccount]     = useState(null);
  const [provider,    setProvider]    = useState(null);
  const [signer,      setSigner]      = useState(null);
  const [usdc,        setUsdc]        = useState(null);   // USDC ERC-20
  const [trustForge,  setTrustForge]  = useState(null);   // TrustForge v5
  const [dao,         setDao]         = useState(null);   // TrustForgeDAO v3
  const [loading,     setLoading]     = useState(false);

  // ── Minimal ERC-20 ABI (USDC) ──────────────────────────────────────────────
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)",
    "function transfer(address,uint256) returns (bool)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
  ];

  // ── Connect Wallet ─────────────────────────────────────────────────────────
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this application");
      return;
    }
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const _provider = new BrowserProvider(window.ethereum);
      const _signer   = await _provider.getSigner();

      const tfABI  = TrustForgeABI.abi    || TrustForgeABI;
      const daoABI = TrustForgeDAOABI.abi || TrustForgeDAOABI;

      setAccount(accounts[0]);
      setProvider(_provider);
      setSigner(_signer);
      setUsdc(      new Contract(USDC_ADDRESS,       ERC20_ABI, _signer));
      setTrustForge(new Contract(TRUSTFORGE_ADDRESS, tfABI,     _signer));
      setDao(       new Contract(DAO_ADDRESS,        daoABI,    _signer));
    } catch (err) {
      console.error("connectWallet:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null); setProvider(null); setSigner(null);
    setUsdc(null); setTrustForge(null); setDao(null);
  };

  // Auto-connect on mount
  useEffect(() => {
    (async () => {
      if (!window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) await connectWallet();
      } catch {}
    })();
  }, []);

  // Account / chain change listeners
  useEffect(() => {
    if (!window.ethereum) return;
    const onAccountsChanged = (accs) => accs.length === 0 ? disconnectWallet() : connectWallet();
    const onChainChanged    = () => window.location.reload();
    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged",    onChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged",    onChainChanged);
    };
  }, []);

  // ── Internal approval helper (USDC only) ──────────────────────────────────
  // amount: string or number in human units (e.g. "5.5" = 5.5 USDC)
  const _approveUSDC = async (amount) => {
    if (!usdc) throw new Error("USDC contract not initialized");
    const raw = prs(amount);
    const allowance = await usdc.allowance(account, TRUSTFORGE_ADDRESS);
    if (allowance >= raw) return; // already approved
    const tx = await usdc.approve(TRUSTFORGE_ADDRESS, raw);
    await tx.wait();
  };

  /* ===================================================================
     USDC TOKEN FUNCTIONS
     =================================================================== */

  /** Get USDC balance for any address (returns human-readable string, e.g. "5.500000") */
  const getUSDCBalance = async (address) => {
    if (!usdc) return "0";
    try {
      return fmt(await usdc.balanceOf(address || account));
    } catch (err) {
      console.error("getUSDCBalance:", err);
      return "0";
    }
  };

  /** Approve TrustForge to spend USDC. amount = human units string */
  const approveUSDC = async (amount) => {
    if (!usdc) throw new Error("USDC not initialized");
    const tx = await usdc.approve(TRUSTFORGE_ADDRESS, prs(amount));
    await tx.wait();
    return tx;
  };

  /** Get current USDC allowance granted to TrustForge */
  const getUSDCAllowance = async () => {
    if (!usdc || !account) return "0";
    try {
      return fmt(await usdc.allowance(account, TRUSTFORGE_ADDRESS));
    } catch (err) {
      console.error("getUSDCAllowance:", err);
      return "0";
    }
  };

  /* ===================================================================
     USERNAME FUNCTIONS
     =================================================================== */

  /** Register username (3–20 chars, alphanumeric + underscore) */
  const registerUsername = async (username) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.registerUsername(username);
      await tx.wait();
      return tx;
    } catch (err) { console.error("registerUsername:", err); throw err; }
    finally { setLoading(false); }
  };

  /** Resolve username → address. Returns null if not found. */
  const getAddressByUsername = async (username) => {
    if (!trustForge) return null;
    try {
      const addr = await trustForge.getAddressByUsername(username);
      return addr === "0x0000000000000000000000000000000000000000" ? null : addr;
    } catch (err) { console.error("getAddressByUsername:", err); return null; }
  };

  /** Check if an address has a registered username */
  const hasUsernameRegistered = async (address) => {
    if (!trustForge) return false;
    try {
      return await trustForge.hasUsername(address || account);
    } catch (err) { console.error("hasUsernameRegistered:", err); return false; }
  };

  /* ===================================================================
     TRUST SCORE (FICO-STYLE COMPUTED)
     =================================================================== */

  /**
   * Get the live FICO-style trust score (0–1000) for any address.
   * This is the single source of truth — NOT the stored trustScore field.
   *
   * Score breakdown:
   *   350  Payment History  (repay rate × 350)
   *   300  Utilization      (1 − debt/limit) × 300
   *   150  Wallet Age       (maturity level → 0/50/100/150)
   *   100  Credit Mix       (pools used × 34, capped 100)
   *   100  Vouch Bonus      (accumulated vouchBonus field)
   *  −100  Recency Penalty  (recent default, fades over 90 days)
   */
  const computeTrustScore = async (address) => {
    if (!trustForge) return 0;
    try {
      const score = await trustForge.computeTrustScore(address || account);
      return Number(score);
    } catch (err) { console.error("computeTrustScore:", err); return 0; }
  };

  /* ===================================================================
     LENDER FUNCTIONS
     =================================================================== */

  /**
   * Deposit USDC into a risk pool.
   * Automatically approves TrustForge to spend USDC first.
   * @param {string|number} amount  Human-readable USDC (e.g. "10" = 10 USDC)
   * @param {number}        pool    RiskPool enum (0=LOW, 1=MED, 2=HIGH)
   */
  const depositToPool = async (amount, pool = RiskPool.LOW_RISK) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      await _approveUSDC(amount);
      const tx = await trustForge.depositToPool(prs(amount), pool);
      await tx.wait();
      return tx;
    } catch (err) { console.error("depositToPool:", err); throw err; }
    finally { setLoading(false); }
  };

  /**
   * Withdraw USDC from a risk pool.
   * @param {string|number} amount  Human-readable USDC
   * @param {number}        pool    RiskPool enum
   */
  const withdrawFromPool = async (amount, pool = RiskPool.LOW_RISK) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.withdrawFromPool(prs(amount), pool);
      await tx.wait();
      return tx;
    } catch (err) { console.error("withdrawFromPool:", err); throw err; }
    finally { setLoading(false); }
  };

  /** Claim all pending interest from every pool the lender is in */
  const claimInterest = async () => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.claimInterest();
      await tx.wait();
      return tx;
    } catch (err) { console.error("claimInterest:", err); throw err; }
    finally { setLoading(false); }
  };

  /* ===================================================================
     BORROWER FUNCTIONS
     =================================================================== */

  /**
   * Request a loan. Pool is auto-assigned by computeTrustScore().
   * Requires: registered username, no active loan, within frequency window.
   * @param {string|number} amount    Human-readable USDC
   * @param {number}        duration  Seconds (min 86400 = 1 day, max 15552000 = 180 days)
   */
  const requestLoan = async (amount, duration) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.requestLoan(prs(amount), duration);
      await tx.wait();
      return tx;
    } catch (err) { console.error("requestLoan:", err); throw err; }
    finally { setLoading(false); }
  };

  /**
   * Repay the caller's active loan in full.
   * Fetches totalRepayment from contract, approves USDC, then repays.
   * Platform fee (2%) is deducted from interest and sent to adminWallet.
   * Remaining interest goes to the pool interest bucket for lenders.
   */
  const repayLoan = async () => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      // Fetch exact repayment amount from contract (use raw value for approval)
      const loan       = await trustForge.getActiveLoan(account);
      const totalRaw   = loan[2]; // totalRepayment at index 2
      const totalHuman = fmt(totalRaw);
      await _approveUSDC(totalHuman);
      const tx = await trustForge.repayLoan();
      await tx.wait();
      return tx;
    } catch (err) { console.error("repayLoan:", err); throw err; }
    finally { setLoading(false); }
  };

  /**
   * Mark a borrower's loan as defaulted.
   * Callable by ANYONE after dueDate + 3-day grace period.
   * @param {string} borrowerAddress
   */
  const markDefault = async (borrowerAddress) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.markDefault(borrowerAddress);
      await tx.wait();
      return tx;
    } catch (err) { console.error("markDefault:", err); throw err; }
    finally { setLoading(false); }
  };

  /* ===================================================================
     VOUCH FUNCTIONS
     =================================================================== */

  /**
   * Vouch for another user by their registered username.
   * Requirements: voucher needs trust ≥ 500, 2+ repayments, 7-day cooldown.
   * Adds +30 to vouchee's vouchBonus (capped at 100), visible in computeTrustScore.
   */
  const vouchForUser = async (voucheeUsername) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.vouchForUser(voucheeUsername);
      await tx.wait();
      return tx;
    } catch (err) { console.error("vouchForUser:", err); throw err; }
    finally { setLoading(false); }
  };

  /** Check if voucherAddress has vouched for voucheeAddress */
  const hasVouched = async (voucherAddress, voucheeAddress) => {
    if (!trustForge) return false;
    try {
      return await trustForge.vouches(voucherAddress, voucheeAddress);
    } catch (err) { console.error("hasVouched:", err); return false; }
  };

  /** Get list of addresses that have vouched for a given address */
  const getUserVouches = async (address) => {
    if (!trustForge) return [];
    try {
      return await trustForge.getUserVouches(address || account);
    } catch (err) { console.error("getUserVouches:", err); return []; }
  };

  /** Get list of addresses a given address has vouched for */
  const getVouchesGiven = async (address) => {
    if (!trustForge) return [];
    try {
      return await trustForge.getVouchesGiven(address || account);
    } catch (err) { console.error("getVouchesGiven:", err); return []; }
  };

  /* ===================================================================
     READ / VIEW FUNCTIONS
     =================================================================== */

  /**
   * Get full user profile.
   *
   * Contract return tuple (getUserProfile):
   *   [0]  username            string
   *   [1]  liveTrustScore      uint256  ← computed live score (0–1000)
   *   [2]  totalLoansTaken     uint256
   *   [3]  successfulRepayments uint256
   *   [4]  defaults            uint256
   *   [5]  hasActiveLoan       bool
   *   [6]  walletAge           uint256  (seconds)
   *   [7]  maturityLevel       uint256  (0–3)
   *   [8]  maxBorrowingLimit   uint256  (USDC 6-dec)
   *   [9]  assignedPool        RiskPool enum (0/1/2)
   *   [10] vouchBonus          uint256  (0–100, feeds into trust score)
   */
  const getUserProfile = async (address) => {
    if (!trustForge) return null;
    try {
      const p = await trustForge.getUserProfile(address || account);
      return {
        username:              p[0],
        liveTrustScore:        Number(p[1]),          // use computeTrustScore() for live value
        totalLoansTaken:       Number(p[2]),
        successfulRepayments:  Number(p[3]),
        defaults:              Number(p[4]),
        hasActiveLoan:         p[5],
        walletAge:             Number(p[6]),           // seconds
        maturityLevel:         Number(p[7]),           // 0–3
        maxBorrowingLimit:     fmt(p[8]),              // human-readable USDC
        assignedPool:          Number(p[9]),           // RiskPool enum
        vouchBonus:            Number(p[10]),          // 0–100 pts
      };
    } catch (err) { console.error("getUserProfile:", err); return null; }
  };

  /**
   * Get the caller's active loan details.
   *
   * Contract return tuple (getActiveLoan):
   *   [0]  principal       uint256 (USDC 6-dec)
   *   [1]  interestAmount  uint256 (USDC 6-dec)
   *   [2]  totalRepayment  uint256 (USDC 6-dec)
   *   [3]  dueDate         uint256 (unix timestamp)
   *   [4]  duration        uint256 (seconds)
   *   [5]  status          LoanStatus enum (0=ACTIVE, 1=REPAID, 2=DEFAULTED)
   *   [6]  pool            RiskPool enum (0=LOW, 1=MED, 2=HIGH)
   *   [7]  isOverdue       bool
   *
   * Returns null if no active loan (principal will be 0).
   */
  const getActiveLoan = async (address) => {
    if (!trustForge) return null;
    try {
      const l = await trustForge.getActiveLoan(address || account);
      if (l[0] === 0n) return null; // no active loan
      return {
        principal:      fmt(l[0]),
        interestAmount: fmt(l[1]),
        totalRepayment: fmt(l[2]),
        dueDate:        Number(l[3]),           // unix timestamp
        duration:       Number(l[4]),           // seconds
        status:         Number(l[5]),           // LoanStatus enum
        pool:           Number(l[6]),           // RiskPool enum
        isOverdue:      l[7],
      };
    } catch (err) { console.error("getActiveLoan:", err); return null; }
  };

  /**
   * Get the repayment cost breakdown for a borrower's active loan.
   * Shows exactly where every USDC goes.
   *
   * Contract return tuple (getRepaymentBreakdown):
   *   [0]  principal     — stays in pool as liquidity (recycled)
   *   [1]  totalInterest — full interest owed by borrower
   *   [2]  platformFee   — interest × 2% → adminWallet
   *   [3]  lenderPayout  — interest − fee → pool interest bucket
   *   [4]  totalDue      — principal + totalInterest (what borrower sends)
   *
   * Elite users (score = 1000) pay 1.5% fee instead of 2%.
   */
  const getRepaymentBreakdown = async (address) => {
    if (!trustForge) return null;
    try {
      const b = await trustForge.getRepaymentBreakdown(address || account);
      return {
        principal:    fmt(b[0]),
        totalInterest: fmt(b[1]),
        platformFee:  fmt(b[2]),   // → adminWallet (2% or 1.5% for elite)
        lenderPayout: fmt(b[3]),   // → pool interest bucket for lenders to claim
        totalDue:     fmt(b[4]),   // what the borrower must send to repayLoan()
      };
    } catch (err) { console.error("getRepaymentBreakdown:", err); return null; }
  };

  /**
   * Get wallet maturity info.
   *
   * Contract return struct (WalletMaturity):
   *   age               seconds since wallet first seen
   *   maturityLevel     0=<7d, 1=7–30d, 2=30–90d, 3=90d+
   *   maturityMultiplier 30/50/100/150 (applied to borrowing limit)
   */
  const getWalletMaturity = async (address) => {
    if (!trustForge) return null;
    try {
      const m = await trustForge.getWalletMaturity(address || account);
      return {
        age:                Number(m.age),
        maturityLevel:      Number(m.maturityLevel),
        maturityMultiplier: Number(m.maturityMultiplier),
      };
    } catch (err) { console.error("getWalletMaturity:", err); return null; }
  };

  /**
   * Get stats for a single risk pool.
   *
   * Contract return: (totalLiquidity, totalActiveLoanAmount, availableLiquidity,
   *                   utilizationRate, interestPool, totalDefaulted)
   * utilizationRate is in basis points (10000 = 100%)
   */
  const getPoolStatsForRisk = async (pool = RiskPool.LOW_RISK) => {
    if (!trustForge) return null;
    try {
      const s = await trustForge.getPoolStatsForRisk(pool);
      return {
        totalLiquidity:        fmt(s[0]),
        totalActiveLoanAmount: fmt(s[1]),
        availableLiquidity:    fmt(s[2]),
        utilizationRate:       Number(s[3]),  // basis points — divide by 100 for %
        interestPool:          fmt(s[4]),
        totalDefaulted:        fmt(s[5]),
      };
    } catch (err) { console.error("getPoolStatsForRisk:", err); return null; }
  };

  /**
   * Get stats for all three pools in one call.
   *
   * Contract return: (PoolStats lowRisk, PoolStats medRisk, PoolStats highRisk)
   * Each PoolStats: { totalLiquidity, totalActiveLoans, totalDefaulted,
   *                   totalInterestPool, totalLenderDeposits }
   */
  const getAllPoolStats = async () => {
    if (!trustForge) return null;
    try {
      const [low, med, high] = await trustForge.getAllPoolStats();
      const mapPool = (s) => ({
        totalLiquidity:      fmt(s.totalLiquidity),
        totalActiveLoans:    fmt(s.totalActiveLoans),
        totalDefaulted:      fmt(s.totalDefaulted),
        totalInterestPool:   fmt(s.totalInterestPool),
        totalLenderDeposits: fmt(s.totalLenderDeposits),
      });
      return {
        lowRisk:  mapPool(low),
        medRisk:  mapPool(med),
        highRisk: mapPool(high),
      };
    } catch (err) { console.error("getAllPoolStats:", err); return null; }
  };

  /**
   * Get lender's deposit and pending interest info.
   *
   * Contract return tuple (getLenderInfo):
   *   [0]  depositedLowRisk    USDC 6-dec
   *   [1]  depositedMedRisk    USDC 6-dec
   *   [2]  depositedHighRisk   USDC 6-dec
   *   [3]  totalInterestEarned USDC 6-dec (lifetime claimed)
   *   [4]  pendingLow          USDC 6-dec (claimable now from LOW pool)
   *   [5]  pendingMed          USDC 6-dec (claimable now from MED pool)
   *   [6]  pendingHigh         USDC 6-dec (claimable now from HIGH pool)
   */
  const getLenderInfo = async (address) => {
    if (!trustForge) return null;
    try {
      const i = await trustForge.getLenderInfo(address || account);
      return {
        depositedLowRisk:    fmt(i[0]),
        depositedMedRisk:    fmt(i[1]),
        depositedHighRisk:   fmt(i[2]),
        totalInterestEarned: fmt(i[3]),
        pendingLow:          fmt(i[4]),
        pendingMed:          fmt(i[5]),
        pendingHigh:         fmt(i[6]),
        // Convenience total pending
        totalPending:        fmt(i[4] + i[5] + i[6]),
      };
    } catch (err) { console.error("getLenderInfo:", err); return null; }
  };

  /**
   * Get full loan history for a user.
   *
   * Loan struct field order:
   *   [0]  borrower        address
   *   [1]  principal       uint256 (USDC 6-dec)
   *   [2]  interestAmount  uint256 (USDC 6-dec)
   *   [3]  totalRepayment  uint256 (USDC 6-dec)
   *   [4]  startTime       uint256 (unix timestamp)
   *   [5]  dueDate         uint256 (unix timestamp)
   *   [6]  duration        uint256 (seconds)
   *   [7]  status          LoanStatus enum (0=ACTIVE, 1=REPAID, 2=DEFAULTED)
   *   [8]  riskPool        RiskPool enum (0=LOW, 1=MED, 2=HIGH)
   */
  const getLoanHistory = async (address) => {
    if (!trustForge) return [];
    try {
      const history = await trustForge.getLoanHistory(address || account);
      return history.map((l) => ({
        borrower:       l[0],
        principal:      fmt(l[1]),
        interestAmount: fmt(l[2]),
        totalRepayment: fmt(l[3]),
        startTime:      Number(l[4]),
        dueDate:        Number(l[5]),
        duration:       Number(l[6]),
        status:         Number(l[7]),   // LoanStatus enum
        riskPool:       Number(l[8]),   // RiskPool enum
      }));
    } catch (err) { console.error("getLoanHistory:", err); return []; }
  };

  /* ===================================================================
     FAUCET / TFX BALANCE HELPERS
     (The lending token is USDC, referred to as TFX in the UI)
     =================================================================== */

  /** Get USDC (TFX) balance for connected account */
  const getTFXBalance = async (address) => {
    return getUSDCBalance(address);
  };

  /**
   * Check if user can claim from faucet.
   * No on-chain faucet contract is deployed yet — always returns false.
   * When a faucet is deployed, replace this with the actual check.
   */
  const canClaimFaucet = async () => {
    return false;
  };

  /**
   * Get faucet info (amount, cooldown etc).
   * Returns static info since no on-chain faucet contract exists yet.
   */
  const getFaucetInfo = async () => {
    return { faucetAmount: "10", cooldownHours: 24 };
  };

  /**
   * Claim TFX from faucet.
   * No on-chain faucet contract is deployed — throws a user-friendly error.
   */
  const claimTFX = async () => {
    throw new Error("Faucet is not yet available. Please obtain test USDC from the Sepolia faucet.");
  };

  /* ===================================================================
     BORROW COOLDOWN STATUS
     Two types of cooldown:
       1. Default cooldown  — 30 days after a missed payment (contract-enforced)
       2. Repayment cooldown — 24 hrs after a successful repayment (UX guard)
     =================================================================== */

  /**
   * Get borrow cooldown status for a user.
   *
   * Returns:
   *   type               "none" | "repayment" | "default"
   *   canBorrowAt        unix timestamp (0 if no cooldown)
   *   secondsRemaining   seconds until they can borrow (0 if no cooldown)
   *   isCoolingDown      bool
   *
   * Reads raw userProfiles mapping for lastDefaultTime and lastActivityTime
   * (these fields are not exposed by getUserProfile view function).
   */
  const getBorrowCooldownStatus = async (address) => {
    if (!trustForge) return { type: "none", canBorrowAt: 0, secondsRemaining: 0, isCoolingDown: false };
    try {
      const target = address || account;
      const nowSec = Math.floor(Date.now() / 1000);

      // Read raw profile fields (mapping is public)
      const rawProfile = await trustForge.userProfiles(target);
      // UserProfile struct field order:
      // 0:username 1:trustScore 2:totalLoansTaken 3:successfulRepayments
      // 4:defaults 5:hasActiveLoan 6:lastDefaultTime 7:walletFirstSeen
      // 8:totalTransactions 9:vouchCount 10:lastActivityTime 11:lastVouchTime
      // 12:loansInCurrentWindow 13:loanWindowStart 14:vouchBonus
      const defaultsCount    = Number(rawProfile[4]);
      const hasActiveLoan    = rawProfile[5];
      const lastDefaultTime  = Number(rawProfile[6]);
      const lastActivityTime = Number(rawProfile[10]);
      const totalLoansTaken  = Number(rawProfile[2]);
      const successfulRepays = Number(rawProfile[3]);

      // ── 1. Default Cooldown (30 days, contract-enforced) ────────────────
      const DEFAULT_COOLDOWN_SECS = 30 * 24 * 60 * 60; // 30 days
      if (defaultsCount > 0 && lastDefaultTime > 0) {
        const canBorrowAt = lastDefaultTime + DEFAULT_COOLDOWN_SECS;
        if (nowSec < canBorrowAt) {
          return {
            type: "default",
            canBorrowAt,
            secondsRemaining: canBorrowAt - nowSec,
            isCoolingDown: true,
          };
        }
      }

      // ── 2. Post-Repayment Cooldown (24 hrs, UX guard) ───────────────────
      // Only applies if: user has taken at least one loan, has no active loan,
      // and made a transaction (repayment) within the last 24 hours.
      const REPAYMENT_COOLDOWN_SECS = 24 * 60 * 60; // 24 hours
      if (
        totalLoansTaken > 0 &&
        !hasActiveLoan &&
        lastActivityTime > 0
      ) {
        const canBorrowAt = lastActivityTime + REPAYMENT_COOLDOWN_SECS;
        if (nowSec < canBorrowAt) {
          return {
            type: "repayment",
            canBorrowAt,
            secondsRemaining: canBorrowAt - nowSec,
            isCoolingDown: true,
          };
        }
      }

      return { type: "none", canBorrowAt: 0, secondsRemaining: 0, isCoolingDown: false };
    } catch (err) {
      console.error("getBorrowCooldownStatus:", err);
      return { type: "none", canBorrowAt: 0, secondsRemaining: 0, isCoolingDown: false };
    }
  };

  /**
   * Get interest rates for a specific risk pool.
   * Returns basis points (300 = 3%, 800 = 8%).
   */
  const getPoolInterestRates = async (pool = RiskPool.LOW_RISK) => {
    if (!trustForge) return null;
    try {
      let baseRate, maxRate;
      if      (pool === RiskPool.LOW_RISK)    [baseRate, maxRate] = await Promise.all([trustForge.BASE_INTEREST_RATE_LOW(),  trustForge.MAX_INTEREST_RATE_LOW()]);
      else if (pool === RiskPool.MEDIUM_RISK) [baseRate, maxRate] = await Promise.all([trustForge.BASE_INTEREST_RATE_MED(),  trustForge.MAX_INTEREST_RATE_MED()]);
      else                                    [baseRate, maxRate] = await Promise.all([trustForge.BASE_INTEREST_RATE_HIGH(), trustForge.MAX_INTEREST_RATE_HIGH()]);
      return {
        baseRate: Number(baseRate),  // basis points
        maxRate:  Number(maxRate),   // basis points
        baseRatePct: Number(baseRate) / 100,  // human % e.g. 3.0
        maxRatePct:  Number(maxRate)  / 100,  // human % e.g. 8.0
      };
    } catch (err) { console.error("getPoolInterestRates:", err); return null; }
  };

  /**
   * Get deployment / system status.
   * Use this to show a health dashboard or gate the UI if not ready.
   *
   * Contract return (getDeploymentStatus):
   *   hasLendingToken, hasAdminWallet, hasDAOContract, hasEmergencyPauser,
   *   daoIsOwner, isNotPaused, currentOwner, currentDAO, currentPauser, currentAdminWallet
   */
  const getDeploymentStatus = async () => {
    if (!trustForge) return null;
    try {
      const s = await trustForge.getDeploymentStatus();
      return {
        hasLendingToken:    s[0],
        hasAdminWallet:     s[1],
        hasDAOContract:     s[2],
        hasEmergencyPauser: s[3],
        daoIsOwner:         s[4],
        isNotPaused:        s[5],
        currentOwner:       s[6],
        currentDAO:         s[7],
        currentPauser:      s[8],
        currentAdminWallet: s[9],
        // true only if all systems are go
        fullyReady: s[0] && s[1] && s[2] && s[3] && s[4] && s[5],
      };
    } catch (err) { console.error("getDeploymentStatus:", err); return null; }
  };

  /**
   * Read all contract constants in one batch call.
   * USDC amounts are formatted to human-readable strings.
   * Time values are in seconds (divide by 86400 for days).
   */
  const getConstants = async () => {
    if (!trustForge) return null;
    try {
      const [
        initialTrustScore,    maxTrustScore,
        tsPaymentHistoryMax,  tsUtilizationMax, tsWalletAgeMax,
        tsCreditMixMax,       tsRecencyPenaltyMax, tsVouchBonusMax,
        defaultPenaltyFade,
        lowRiskThreshold,     mediumRiskThreshold,
        maturityLevel1,       maturityLevel2,       maturityLevel3,
        minLoanAmount,        minLoanDuration,      maxLoanDuration,
        gracePeriod,          defaultCooldownPeriod, minInterestAmount,
        maxLoansPerWindow,    loanWindowDuration,
        lowTrustLimit,        medTrustLimit,        highTrustLimit,
        eliteLimitBonusBps,   eliteFeeDiscountBps,
        maxVouchesPerUser,    vouchCooldown,        vouchPenaltyOnDefault,
        daoPropMinTrust,      platformFeeBps,       maxPlatformFee,
        poolSafetyBuffer,
      ] = await Promise.all([
        trustForge.INITIAL_TRUST_SCORE(),
        trustForge.MAX_TRUST_SCORE(),
        trustForge.TS_PAYMENT_HISTORY_MAX(),
        trustForge.TS_UTILIZATION_MAX(),
        trustForge.TS_WALLET_AGE_MAX(),
        trustForge.TS_CREDIT_MIX_MAX(),
        trustForge.TS_RECENCY_PENALTY_MAX(),
        trustForge.TS_VOUCH_BONUS_MAX(),
        trustForge.DEFAULT_PENALTY_FADE(),
        trustForge.LOW_RISK_THRESHOLD(),
        trustForge.MEDIUM_RISK_THRESHOLD(),
        trustForge.MATURITY_LEVEL_1(),
        trustForge.MATURITY_LEVEL_2(),
        trustForge.MATURITY_LEVEL_3(),
        trustForge.MIN_LOAN_AMOUNT(),
        trustForge.MIN_LOAN_DURATION(),
        trustForge.MAX_LOAN_DURATION(),
        trustForge.GRACE_PERIOD(),
        trustForge.DEFAULT_COOLDOWN_PERIOD(),
        trustForge.MIN_INTEREST_AMOUNT(),
        trustForge.MAX_LOANS_PER_WINDOW(),
        trustForge.LOAN_WINDOW_DURATION(),
        trustForge.LOW_TRUST_LIMIT(),
        trustForge.MED_TRUST_LIMIT(),
        trustForge.HIGH_TRUST_LIMIT(),
        trustForge.ELITE_LIMIT_BONUS_BPS(),
        trustForge.ELITE_FEE_DISCOUNT_BPS(),
        trustForge.MAX_VOUCHES_PER_USER(),
        trustForge.VOUCH_COOLDOWN(),
        trustForge.VOUCH_PENALTY_ON_DEFAULT(),
        trustForge.DAO_PROPOSAL_MIN_TRUST(),
        trustForge.platformFeeBps(),
        trustForge.MAX_PLATFORM_FEE(),
        trustForge.POOL_SAFETY_BUFFER(),
      ]);

      return {
        // Trust score system
        initialTrustScore:    Number(initialTrustScore),
        maxTrustScore:        Number(maxTrustScore),
        // FICO weights (max pts per component)
        tsPaymentHistoryMax:  Number(tsPaymentHistoryMax),  // 350
        tsUtilizationMax:     Number(tsUtilizationMax),     // 300
        tsWalletAgeMax:       Number(tsWalletAgeMax),       // 150
        tsCreditMixMax:       Number(tsCreditMixMax),       // 100
        tsRecencyPenaltyMax:  Number(tsRecencyPenaltyMax),  // 100
        tsVouchBonusMax:      Number(tsVouchBonusMax),      // 100
        defaultPenaltyFade:   Number(defaultPenaltyFade),   // seconds (90 days)
        // Risk pool thresholds
        lowRiskThreshold:     Number(lowRiskThreshold),     // 600
        mediumRiskThreshold:  Number(mediumRiskThreshold),  // 300
        // Wallet maturity (seconds)
        maturityLevel1:       Number(maturityLevel1),       // 7 days
        maturityLevel2:       Number(maturityLevel2),       // 30 days
        maturityLevel3:       Number(maturityLevel3),       // 90 days
        // Loan params
        minLoanAmount:        fmt(minLoanAmount),           // USDC human
        minLoanDuration:      Number(minLoanDuration),      // seconds
        maxLoanDuration:      Number(maxLoanDuration),      // seconds
        gracePeriod:          Number(gracePeriod),          // seconds
        defaultCooldownPeriod: Number(defaultCooldownPeriod), // seconds
        minInterestAmount:    fmt(minInterestAmount),       // USDC human (0.1)
        maxLoansPerWindow:    Number(maxLoansPerWindow),    // 3
        loanWindowDuration:   Number(loanWindowDuration),   // seconds (30 days)
        // Borrowing limits (USDC human)
        lowTrustLimit:        fmt(lowTrustLimit),
        medTrustLimit:        fmt(medTrustLimit),
        highTrustLimit:       fmt(highTrustLimit),
        // Elite tier
        eliteLimitBonusBps:   Number(eliteLimitBonusBps),  // 1000 = +10%
        eliteFeeDiscountBps:  Number(eliteFeeDiscountBps), // 50 = -0.5%
        // Vouch
        maxVouchesPerUser:    Number(maxVouchesPerUser),
        vouchCooldown:        Number(vouchCooldown),        // seconds
        vouchPenaltyOnDefault: Number(vouchPenaltyOnDefault),
        // Platform
        daoPropMinTrust:      Number(daoPropMinTrust),      // 500
        platformFeeBps:       Number(platformFeeBps),       // 200 = 2%
        platformFeePct:       Number(platformFeeBps) / 100, // 2.0
        maxPlatformFee:       Number(maxPlatformFee),       // 1000 = 10%
        poolSafetyBuffer:     Number(poolSafetyBuffer),     // 500 = 5%
      };
    } catch (err) { console.error("getConstants:", err); return null; }
  };

  /* ===================================================================
     ADMIN / GOVERNANCE FUNCTIONS
     (These are called by the DAO via proposal execution after handoff.
      During initial setup, the deployer wallet can call them directly.)
     =================================================================== */

  /**
   * [DEPLOY-03] Register DAO contract in TrustForge.
   * Must be called BEFORE transferOwnershipToDAO().
   */
  const setDAO = async (daoAddress) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.setDAO(daoAddress);
      await tx.wait();
      return tx;
    } catch (err) { console.error("setDAO:", err); throw err; }
    finally { setLoading(false); }
  };

  /**
   * [DEPLOY-01] Set the emergency pauser address.
   * The pauser can ONLY call pause() — nothing else.
   */
  const setEmergencyPauser = async (pauserAddress) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.setEmergencyPauser(pauserAddress);
      await tx.wait();
      return tx;
    } catch (err) { console.error("setEmergencyPauser:", err); throw err; }
    finally { setLoading(false); }
  };

  /**
   * [DEPLOY-02] ONE-SHOT atomic DAO handoff.
   * Sets emergencyPauser, sets daoContract, transfers Ownable ownership.
   * IRREVERSIBLE — only call after verifying everything is configured.
   *
   * After this: DAO owns TrustForge. Deployer wallet loses all admin access.
   * pauserAddress can still call pause() in emergencies.
   */
  const transferOwnershipToDAO = async (daoAddress, pauserAddress) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.transferOwnershipToDAO(daoAddress, pauserAddress);
      await tx.wait();
      return tx;
    } catch (err) { console.error("transferOwnershipToDAO:", err); throw err; }
    finally { setLoading(false); }
  };

  /** Set platform fee. Requires onlyOwnerOrDAO. Max 10% (1000 bps). */
  const setPlatformFee = async (feeBps) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.setPlatformFee(feeBps);
      await tx.wait();
      return tx;
    } catch (err) { console.error("setPlatformFee:", err); throw err; }
    finally { setLoading(false); }
  };

  /** Update borrowing limits (USDC human strings → parsed to 6-dec internally) */
  const updateBorrowingLimits = async (lowTrust, medTrust, highTrust) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.updateBorrowingLimits(
        prs(lowTrust), prs(medTrust), prs(highTrust)
      );
      await tx.wait();
      return tx;
    } catch (err) { console.error("updateBorrowingLimits:", err); throw err; }
    finally { setLoading(false); }
  };

  /** Update interest rates for a specific pool. Rates in basis points. */
  const updatePoolInterestRates = async (pool, baseRate, maxRate) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.updatePoolInterestRates(pool, baseRate, maxRate);
      await tx.wait();
      return tx;
    } catch (err) { console.error("updatePoolInterestRates:", err); throw err; }
    finally { setLoading(false); }
  };

  /** Change the admin (fee recipient) wallet */
  const setAdminWallet = async (newAdminWallet) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.setAdminWallet(newAdminWallet);
      await tx.wait();
      return tx;
    } catch (err) { console.error("setAdminWallet:", err); throw err; }
    finally { setLoading(false); }
  };

  /** Toggle between auto-limit (trust-score-based) and manual limits */
  const setAutoLimitEnabled = async (enabled) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.setAutoLimitEnabled(enabled);
      await tx.wait();
      return tx;
    } catch (err) { console.error("setAutoLimitEnabled:", err); throw err; }
    finally { setLoading(false); }
  };

  /** Set the minimum interest floor (USDC human string) */
  const setMinInterestAmount = async (amount) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.setMinInterestAmount(prs(amount));
      await tx.wait();
      return tx;
    } catch (err) { console.error("setMinInterestAmount:", err); throw err; }
    finally { setLoading(false); }
  };

  /** Update vouch parameters: penalty pts per default, max vouches per user */
  const updateVouchParameters = async (penaltyPts, maxVouches) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.updateVouchParameters(penaltyPts, maxVouches);
      await tx.wait();
      return tx;
    } catch (err) { console.error("updateVouchParameters:", err); throw err; }
    finally { setLoading(false); }
  };

  /**
   * Emergency withdraw stuck tokens. Only callable by Ownable owner.
   * amount is in human USDC string.
   */
  const emergencyWithdraw = async (tokenAddress, amount) => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.emergencyWithdraw(tokenAddress, prs(amount));
      await tx.wait();
      return tx;
    } catch (err) { console.error("emergencyWithdraw:", err); throw err; }
    finally { setLoading(false); }
  };

  /**
   * Pause contract. Callable by: emergencyPauser, owner, or DAO.
   * Does NOT require governance — emergency pauser can call this instantly.
   */
  const pauseContract = async () => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.pause();
      await tx.wait();
      return tx;
    } catch (err) { console.error("pauseContract:", err); throw err; }
    finally { setLoading(false); }
  };

  /**
   * Unpause contract. Only callable by owner (DAO after handoff).
   * Resuming requires a DAO governance proposal to pass.
   */
  const unpauseContract = async () => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.unpause();
      await tx.wait();
      return tx;
    } catch (err) { console.error("unpauseContract:", err); throw err; }
    finally { setLoading(false); }
  };

  // ── Context Value ──────────────────────────────────────────────────────────
  return (
    <BlockchainContext.Provider value={{
      // Wallet state
      account, provider, signer, loading,

      // Contract instances (for advanced use)
      usdc, trustForge, dao,

      // Wallet
      connectWallet, disconnectWallet,

      // USDC
      getUSDCBalance, approveUSDC, getUSDCAllowance,

      // Username
      registerUsername, getAddressByUsername, hasUsernameRegistered,

      // Trust score
      computeTrustScore,

      // Lender
      depositToPool, withdrawFromPool, claimInterest,

      // Borrower
      requestLoan, repayLoan, markDefault,

      // Vouch
      vouchForUser, hasVouched, getUserVouches, getVouchesGiven,

      // Read / view
      getUserProfile,
      getActiveLoan,
      getRepaymentBreakdown,
      getWalletMaturity,
      getPoolStatsForRisk,
      getAllPoolStats,
      getLenderInfo,
      getLoanHistory,
      getPoolInterestRates,
      getDeploymentStatus,
      getConstants,

      // TFX / Faucet helpers
      getTFXBalance,
      canClaimFaucet,
      getFaucetInfo,
      claimTFX,

      // Borrow cooldown
      getBorrowCooldownStatus,

      // Admin / governance
      setDAO,
      setEmergencyPauser,
      transferOwnershipToDAO,
      setPlatformFee,
      updateBorrowingLimits,
      updatePoolInterestRates,
      setAdminWallet,
      setAutoLimitEnabled,
      setMinInterestAmount,
      updateVouchParameters,
      emergencyWithdraw,
      pauseContract,
      unpauseContract,

      // Constants (static — use getConstants() for live on-chain values)
      USDC_ADDRESS,
      TRUSTFORGE_ADDRESS,
      DAO_ADDRESS,
      USDC_DECIMALS,
      RiskPool,
      LoanStatus,
      ProposalState,
    }}>
      {children}
    </BlockchainContext.Provider>
  );
};

export const useBlockchain = () => {
  const ctx = useContext(BlockchainContext);
  if (!ctx) throw new Error("useBlockchain must be used within BlockchainProvider");
  return ctx;
};
