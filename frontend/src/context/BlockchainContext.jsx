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
const USDC_ADDRESS       = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC
const TRUSTFORGE_ADDRESS = "0xC48E6f0F59F12C4d1fcDb0eCB7D6d3CcB819F6F5";
const DAO_ADDRESS        = "0xB16Bdd077856791c105ADA4FC46020f7307b182a";

// ─── Token Decimals ───────────────────────────────────────────────────────────
const USDC_DECIMALS = 6;

const fmt  = (raw) => formatUnits(raw, USDC_DECIMALS);
const prs  = (str) => parseUnits(String(str), USDC_DECIMALS);

// ─── Contract Enums ───────────────────────────────────────────────────────────
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
  const [usdc,        setUsdc]        = useState(null);
  const [trustForge,  setTrustForge]  = useState(null);
  const [dao,         setDao]         = useState(null);
  const [loading,     setLoading]     = useState(false);

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

  // ── Internal approval helper ───────────────────────────────────────────────
  const _approveUSDC = async (amount) => {
    if (!usdc) throw new Error("USDC contract not initialized");
    const raw = prs(amount);
    const allowance = await usdc.allowance(account, TRUSTFORGE_ADDRESS);
    if (allowance >= raw) return;
    const tx = await usdc.approve(TRUSTFORGE_ADDRESS, raw);
    await tx.wait();
  };

  /* ===================================================================
     USDC TOKEN FUNCTIONS
     =================================================================== */

  const getUSDCBalance = async (address) => {
    if (!usdc) return "0";
    try {
      return fmt(await usdc.balanceOf(address || account));
    } catch (err) {
      console.error("getUSDCBalance:", err);
      return "0";
    }
  };

  const approveUSDC = async (amount) => {
    if (!usdc) throw new Error("USDC not initialized");
    const tx = await usdc.approve(TRUSTFORGE_ADDRESS, prs(amount));
    await tx.wait();
    return tx;
  };

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

  const getAddressByUsername = async (username) => {
    if (!trustForge) return null;
    try {
      const addr = await trustForge.getAddressByUsername(username);
      return addr === "0x0000000000000000000000000000000000000000" ? null : addr;
    } catch (err) { console.error("getAddressByUsername:", err); return null; }
  };

  const hasUsernameRegistered = async (address) => {
    if (!trustForge) return false;
    try {
      return await trustForge.hasUsername(address || account);
    } catch (err) { console.error("hasUsernameRegistered:", err); return false; }
  };

  /* ===================================================================
     TRUST SCORE
     =================================================================== */

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

  const repayLoan = async () => {
    if (!trustForge) throw new Error("TrustForge not initialized");
    try {
      setLoading(true);
      const loan       = await trustForge.getActiveLoan(account);
      const totalRaw   = loan[2];
      const totalHuman = fmt(totalRaw);
      await _approveUSDC(totalHuman);
      const tx = await trustForge.repayLoan();
      await tx.wait();
      return tx;
    } catch (err) { console.error("repayLoan:", err); throw err; }
    finally { setLoading(false); }
  };

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

  const hasVouched = async (voucherAddress, voucheeAddress) => {
    if (!trustForge) return false;
    try {
      return await trustForge.vouches(voucherAddress, voucheeAddress);
    } catch (err) { console.error("hasVouched:", err); return false; }
  };

  const getUserVouches = async (address) => {
    if (!trustForge) return [];
    try {
      return await trustForge.getUserVouches(address || account);
    } catch (err) { console.error("getUserVouches:", err); return []; }
  };

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
   * Contract return tuple (getUserProfile):
   *   [0]  username            string
   *   [1]  liveTrustScore      uint256
   *   [2]  totalLoansTaken     uint256
   *   [3]  successfulRepayments uint256
   *   [4]  defaults            uint256
   *   [5]  hasActiveLoan       bool
   *   [6]  walletAge           uint256 (seconds)
   *   [7]  maturityLevel       uint256 (0–3)
   *   [8]  maxBorrowingLimit   uint256 (USDC 6-dec)
   *   [9]  assignedPool        RiskPool enum (0/1/2)
   *   [10] vouchBonus          uint256 (0–100)
   */
  const getUserProfile = async (address) => {
    if (!trustForge) return null;
    try {
      const p = await trustForge.getUserProfile(address || account);
      return {
        username:              p[0],
        liveTrustScore:        Number(p[1]),
        totalLoansTaken:       Number(p[2]),
        successfulRepayments:  Number(p[3]),
        defaults:              Number(p[4]),
        hasActiveLoan:         p[5],
        walletAge:             Number(p[6]),
        maturityLevel:         Number(p[7]),
        maxBorrowingLimit:     fmt(p[8]),
        assignedPool:          Number(p[9]),
        vouchBonus:            Number(p[10]),
      };
    } catch (err) { console.error("getUserProfile:", err); return null; }
  };

  /**
   * Get the caller's active loan details.
   * Contract return tuple (getActiveLoan):
   *   [0]  principal       uint256 (USDC 6-dec)
   *   [1]  interestAmount  uint256 (USDC 6-dec)
   *   [2]  totalRepayment  uint256 (USDC 6-dec)
   *   [3]  dueDate         uint256 (unix timestamp)
   *   [4]  duration        uint256 (seconds)
   *   [5]  status          LoanStatus enum
   *   [6]  pool            RiskPool enum
   *   [7]  isOverdue       bool
   */
  const getActiveLoan = async (address) => {
    if (!trustForge) return null;
    try {
      const l = await trustForge.getActiveLoan(address || account);
      if (l[0] === 0n) return null;
      return {
        principal:      fmt(l[0]),
        interestAmount: fmt(l[1]),
        totalRepayment: fmt(l[2]),
        dueDate:        Number(l[3]),
        duration:       Number(l[4]),
        status:         Number(l[5]),
        pool:           Number(l[6]),
        isOverdue:      l[7],
      };
    } catch (err) { console.error("getActiveLoan:", err); return null; }
  };

  /**
   * Get repayment cost breakdown.
   * Contract return tuple (getRepaymentBreakdown):
   *   [0]  principal
   *   [1]  totalInterest
   *   [2]  platformFee   (2% or 1.5% for elite)
   *   [3]  lenderPayout
   *   [4]  totalDue
   */
  const getRepaymentBreakdown = async (address) => {
    if (!trustForge) return null;
    try {
      const b = await trustForge.getRepaymentBreakdown(address || account);
      return {
        principal:     fmt(b[0]),
        totalInterest: fmt(b[1]),
        platformFee:   fmt(b[2]),
        lenderPayout:  fmt(b[3]),
        totalDue:      fmt(b[4]),
      };
    } catch (err) { console.error("getRepaymentBreakdown:", err); return null; }
  };

  /**
   * Get wallet maturity info.
   * Contract return struct (WalletMaturity):
   *   age, maturityLevel, maturityMultiplier
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
        utilizationRate:       Number(s[3]),
        interestPool:          fmt(s[4]),
        totalDefaulted:        fmt(s[5]),
      };
    } catch (err) { console.error("getPoolStatsForRisk:", err); return null; }
  };

  /** Get stats for all three pools in one call. */
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
   * Contract return tuple (getLenderInfo):
   *   [0]  depositedLowRisk
   *   [1]  depositedMedRisk
   *   [2]  depositedHighRisk
   *   [3]  totalInterestEarned (lifetime claimed)
   *   [4]  pendingLow
   *   [5]  pendingMed
   *   [6]  pendingHigh
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
        totalPending:        fmt(i[4] + i[5] + i[6]),
      };
    } catch (err) { console.error("getLenderInfo:", err); return null; }
  };

  /**
   * Get claimable interest for a lender, broken down by pool + total.
   * Calls getClaimableInterest() view on TrustForge v6.
   * Returns human-readable USDC strings.
   */
  const getClaimableInterest = async (address) => {
    if (!trustForge) return { lowRisk: "0", medRisk: "0", highRisk: "0", total: "0" };
    try {
      const c = await trustForge.getClaimableInterest(address || account);
      return {
        lowRisk:  fmt(c[0]),
        medRisk:  fmt(c[1]),
        highRisk: fmt(c[2]),
        total:    fmt(c[3]),
      };
    } catch (err) {
      console.error("getClaimableInterest:", err);
      return { lowRisk: "0", medRisk: "0", highRisk: "0", total: "0" };
    }
  };

  /**
   * Get full loan history for a user.
   * Loan struct field order:
   *   [0] borrower  [1] principal  [2] interestAmount  [3] totalRepayment
   *   [4] startTime [5] dueDate    [6] duration        [7] status  [8] riskPool
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
        status:         Number(l[7]),
        riskPool:       Number(l[8]),
      }));
    } catch (err) { console.error("getLoanHistory:", err); return []; }
  };

  /* ===================================================================
     BORROW COOLDOWN STATUS
     Uses v6 struct field order:
       0:username  1:trustScore  2:totalLoansTaken  3:successfulRepayments
       4:defaults  5:hasActiveLoan  6:lastDefaultTime  7:walletFirstSeen
       8:totalTransactions  9:vouchCount  10:lastActivityTime  11:lastVouchTime
       12:lastRepaymentTime  13:loanWindowStart  14:vouchBonus
     =================================================================== */

  /**
   * Get borrow cooldown status for a user.
   * Returns: { type, canBorrowAt, secondsRemaining, isCoolingDown }
   *   type: "none" | "repayment" | "default"
   *
   * Two cooldown types:
   *   1. Default cooldown   — 30 days after a missed payment
   *   2. Repayment cooldown — 10 hours after a successful repayment (v6)
   */
  const getBorrowCooldownStatus = async (address) => {
    if (!trustForge) return { type: "none", canBorrowAt: 0, secondsRemaining: 0, isCoolingDown: false };
    try {
      const target = address || account;
      const nowSec = Math.floor(Date.now() / 1000);

      const rawProfile = await trustForge.userProfiles(target);

      const totalLoansTaken   = Number(rawProfile[2]);
      const defaultsCount     = Number(rawProfile[4]);
      const hasActiveLoan     = rawProfile[5];
      const lastDefaultTime   = Number(rawProfile[6]);
      const lastRepaymentTime = Number(rawProfile[12]); // v6: lastRepaymentTime

      // ── 1. Default Cooldown (30 days) ──────────────────────────────────
      const DEFAULT_COOLDOWN_SECS = 30 * 24 * 60 * 60;
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

      // ── 2. Post-Repayment Cooldown (10 hours, v6) ──────────────────────
      const REPAYMENT_COOLDOWN_SECS = 10 * 60 * 60;
      if (totalLoansTaken > 0 && !hasActiveLoan && lastRepaymentTime > 0) {
        const canBorrowAt = lastRepaymentTime + REPAYMENT_COOLDOWN_SECS;
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

  /* ===================================================================
     FAUCET / TFX BALANCE HELPERS
     =================================================================== */

  const getTFXBalance = async (address) => {
    return getUSDCBalance(address);
  };

  const canClaimFaucet = async () => {
    return false;
  };

  const getFaucetInfo = async () => {
    return { faucetAmount: "10", cooldownHours: 24 };
  };

  const claimTFX = async () => {
    throw new Error("Faucet is not yet available. Please obtain test USDC from the Sepolia faucet.");
  };

  /* ===================================================================
     POOL INTEREST RATES
     =================================================================== */

  const getPoolInterestRates = async (pool = RiskPool.LOW_RISK) => {
    if (!trustForge) return null;
    try {
      let baseRate, maxRate;
      if      (pool === RiskPool.LOW_RISK)    [baseRate, maxRate] = await Promise.all([trustForge.BASE_INTEREST_RATE_LOW(),  trustForge.MAX_INTEREST_RATE_LOW()]);
      else if (pool === RiskPool.MEDIUM_RISK) [baseRate, maxRate] = await Promise.all([trustForge.BASE_INTEREST_RATE_MED(),  trustForge.MAX_INTEREST_RATE_MED()]);
      else                                    [baseRate, maxRate] = await Promise.all([trustForge.BASE_INTEREST_RATE_HIGH(), trustForge.MAX_INTEREST_RATE_HIGH()]);
      return {
        baseRate:    Number(baseRate),
        maxRate:     Number(maxRate),
        baseRatePct: Number(baseRate) / 100,
        maxRatePct:  Number(maxRate)  / 100,
      };
    } catch (err) { console.error("getPoolInterestRates:", err); return null; }
  };

  /* ===================================================================
     DEPLOYMENT STATUS
     =================================================================== */

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
        fullyReady: s[0] && s[1] && s[2] && s[3] && s[4] && s[5],
      };
    } catch (err) { console.error("getDeploymentStatus:", err); return null; }
  };

  /* ===================================================================
     CONSTANTS
     =================================================================== */

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
        repaymentCooldown,
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
        trustForge.REPAYMENT_COOLDOWN(),
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
        initialTrustScore:    Number(initialTrustScore),
        maxTrustScore:        Number(maxTrustScore),
        tsPaymentHistoryMax:  Number(tsPaymentHistoryMax),
        tsUtilizationMax:     Number(tsUtilizationMax),
        tsWalletAgeMax:       Number(tsWalletAgeMax),
        tsCreditMixMax:       Number(tsCreditMixMax),
        tsRecencyPenaltyMax:  Number(tsRecencyPenaltyMax),
        tsVouchBonusMax:      Number(tsVouchBonusMax),
        defaultPenaltyFade:   Number(defaultPenaltyFade),
        lowRiskThreshold:     Number(lowRiskThreshold),
        mediumRiskThreshold:  Number(mediumRiskThreshold),
        maturityLevel1:       Number(maturityLevel1),
        maturityLevel2:       Number(maturityLevel2),
        maturityLevel3:       Number(maturityLevel3),
        minLoanAmount:        fmt(minLoanAmount),
        minLoanDuration:      Number(minLoanDuration),
        maxLoanDuration:      Number(maxLoanDuration),
        gracePeriod:          Number(gracePeriod),
        defaultCooldownPeriod: Number(defaultCooldownPeriod),
        minInterestAmount:    fmt(minInterestAmount),
       repaymentCooldown:    Number(repaymentCooldown),      // 36000 seconds
repaymentCooldownHrs: Number(repaymentCooldown) / 3600, // 10
        lowTrustLimit:        fmt(lowTrustLimit),
        medTrustLimit:        fmt(medTrustLimit),
        highTrustLimit:       fmt(highTrustLimit),
        eliteLimitBonusBps:   Number(eliteLimitBonusBps),
        eliteFeeDiscountBps:  Number(eliteFeeDiscountBps),
        maxVouchesPerUser:    Number(maxVouchesPerUser),
        vouchCooldown:        Number(vouchCooldown),
        vouchPenaltyOnDefault: Number(vouchPenaltyOnDefault),
        daoPropMinTrust:      Number(daoPropMinTrust),
        platformFeeBps:       Number(platformFeeBps),
        platformFeePct:       Number(platformFeeBps) / 100,
        maxPlatformFee:       Number(maxPlatformFee),
        poolSafetyBuffer:     Number(poolSafetyBuffer),
      };
    } catch (err) { console.error("getConstants:", err); return null; }
  };

  /* ===================================================================
     ADMIN / GOVERNANCE FUNCTIONS
     =================================================================== */

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
      getClaimableInterest,   // ← FIX: was missing from context
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

      // Constants
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