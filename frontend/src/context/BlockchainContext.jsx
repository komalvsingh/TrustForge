import { createContext, useContext, useEffect, useState } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";

// Import ABIs
import TFXTokenABI from "../abis/TFXToken.json";
import TrustForgeABI from "../abis/TrustForge.json";

// Addresses (from your deployments)
const TFX_ADDRESS = "0x4b821BBc5C7327A400486eFB61DA250979e32b3B";
const TRUSTFORGE_ADDRESS = "0x2caB839bB17CeB77c09d0EdE66E5349Cd2130c18";

// Risk Pool Enum (matching contract)
const RiskPool = {
  LOW_RISK: 0,
  MEDIUM_RISK: 1,
  HIGH_RISK: 2
};

// Loan Status Enum (matching contract)
const LoanStatus = {
  ACTIVE: 0,
  REPAID: 1,
  DEFAULTED: 2
};

const BlockchainContext = createContext();

export const BlockchainProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [tfx, setTfx] = useState(null);
  const [trustForge, setTrustForge] = useState(null);
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

      // Handle both ABI formats: {abi: [...]} or just [...]
      const tfxABI = TFXTokenABI.abi || TFXTokenABI;
      const trustForgeABI = TrustForgeABI.abi || TrustForgeABI;

      const tfxContract = new Contract(TFX_ADDRESS, tfxABI, signer);
      const trustForgeContract = new Contract(TRUSTFORGE_ADDRESS, trustForgeABI, signer);

      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
      setTfx(tfxContract);
      setTrustForge(trustForgeContract);
      
      console.log("Wallet connected:", accounts[0]);
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
    setTfx(null);
    setTrustForge(null);
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
     TFX TOKEN FUNCTIONS
     =================================================================== */

  const getTFXBalance = async (address) => {
    if (!tfx) return "0";
    try {
      const userAddress = address || account;
      const bal = await tfx.balanceOf(userAddress);
      return formatEther(bal);
    } catch (error) {
      console.error("Error getting TFX balance:", error);
      return "0";
    }
  };

  const approveTFX = async (amount) => {
    if (!tfx) throw new Error("TFX contract not initialized");
    try {
      const tx = await tfx.approve(TRUSTFORGE_ADDRESS, parseEther(amount));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error approving TFX:", error);
      throw error;
    }
  };

  const getTFXAllowance = async () => {
    if (!tfx || !account) return "0";
    try {
      const allowance = await tfx.allowance(account, TRUSTFORGE_ADDRESS);
      return formatEther(allowance);
    } catch (error) {
      console.error("Error getting allowance:", error);
      return "0";
    }
  };

  /* ===================================================================
     TFX TOKEN - FAUCET FUNCTIONS
     =================================================================== */

  /**
   * Claim TFX from faucet (100 TFX per claim, 1 day cooldown)
   */
  const claimTFX = async () => {
    if (!tfx) throw new Error("TFX contract not initialized");
    try {
      setLoading(true);
      const tx = await tfx.claimTFX();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error claiming TFX from faucet:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get last claim time for an address
   */
  const getLastClaimTime = async (address) => {
    if (!tfx) return "0";
    try {
      const userAddress = address || account;
      const lastClaim = await tfx.lastClaimTime(userAddress);
      return lastClaim.toString();
    } catch (error) {
      console.error("Error getting last claim time:", error);
      return "0";
    }
  };

  /**
   * Get faucet constants
   */
  const getFaucetInfo = async () => {
    if (!tfx) return null;
    try {
      const [faucetAmount, faucetCooldown] = await Promise.all([
        tfx.FAUCET_AMOUNT(),
        tfx.FAUCET_COOLDOWN(),
      ]);

      return {
        faucetAmount: formatEther(faucetAmount),
        faucetCooldown: faucetCooldown.toString(),
      };
    } catch (error) {
      console.error("Error getting faucet info:", error);
      return null;
    }
  };

  /**
   * Check if user can claim from faucet
   */
  const canClaimFaucet = async (address) => {
    if (!tfx) return false;
    try {
      const userAddress = address || account;
      const lastClaim = await tfx.lastClaimTime(userAddress);
      const cooldown = await tfx.FAUCET_COOLDOWN();
      const currentTime = Math.floor(Date.now() / 1000);
      
      return currentTime - Number(lastClaim) >= Number(cooldown);
    } catch (error) {
      console.error("Error checking faucet eligibility:", error);
      return false;
    }
  };

  /* ===================================================================
     TFX TOKEN - ADMIN FUNCTIONS
     =================================================================== */

  /**
   * Mint new TFX tokens (owner only)
   */
  const mintTFX = async (toAddress, amount) => {
    if (!tfx) throw new Error("TFX contract not initialized");
    try {
      setLoading(true);
      const tx = await tfx.mint(toAddress, parseEther(amount));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error minting TFX:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Burn TFX tokens
   */
  const burnTFX = async (amount) => {
    if (!tfx) throw new Error("TFX contract not initialized");
    try {
      setLoading(true);
      const tx = await tfx.burn(parseEther(amount));
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error burning TFX:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get token name
   */
  const getTFXName = async () => {
    if (!tfx) return "";
    try {
      return await tfx.name();
    } catch (error) {
      console.error("Error getting token name:", error);
      return "";
    }
  };

  /**
   * Get token symbol
   */
  const getTFXSymbol = async () => {
    if (!tfx) return "";
    try {
      return await tfx.symbol();
    } catch (error) {
      console.error("Error getting token symbol:", error);
      return "";
    }
  };

  /**
   * Get token decimals
   */
  const getTFXDecimals = async () => {
    if (!tfx) return 18;
    try {
      return await tfx.decimals();
    } catch (error) {
      console.error("Error getting token decimals:", error);
      return 18;
    }
  };

  /**
   * Get total supply
   */
  const getTFXTotalSupply = async () => {
    if (!tfx) return "0";
    try {
      const supply = await tfx.totalSupply();
      return formatEther(supply);
    } catch (error) {
      console.error("Error getting total supply:", error);
      return "0";
    }
  };

  /**
   * Get token owner
   */
  const getTFXOwner = async () => {
    if (!tfx) return "";
    try {
      return await tfx.owner();
    } catch (error) {
      console.error("Error getting token owner:", error);
      return "";
    }
  };

  /* ===================================================================
     USERNAME FUNCTIONS (V2)
     =================================================================== */

  /**
   * Register a username for the wallet (3-20 chars, alphanumeric + underscore)
   */
  const registerUsername = async (username) => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.registerUsername(username);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error registering username:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get address by username
   */
  const getAddressByUsername = async (username) => {
    if (!trustForge) return null;
    try {
      const address = await trustForge.getAddressByUsername(username);
      return address === "0x0000000000000000000000000000000000000000" ? null : address;
    } catch (error) {
      console.error("Error getting address by username:", error);
      return null;
    }
  };

  /**
   * Check if an address has a username
   */
  const hasUsernameRegistered = async (address) => {
    if (!trustForge) return false;
    try {
      const userAddress = address || account;
      return await trustForge.hasUsername(userAddress);
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    }
  };

  /* ===================================================================
     LENDER FUNCTIONS (RISK POOLS)
     =================================================================== */

  /**
   * Deposit tokens into a specific risk pool
   * @param {string} amount - Amount to deposit
   * @param {number} pool - Risk pool (0=LOW, 1=MEDIUM, 2=HIGH)
   */
  const depositToPool = async (amount, pool = RiskPool.LOW_RISK) => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      await approveTFX(amount);
      const tx = await trustForge.depositToPool(parseEther(amount), pool);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error depositing to pool:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Withdraw tokens from a specific pool
   * @param {string} amount - Amount to withdraw
   * @param {number} pool - Risk pool (0=LOW, 1=MEDIUM, 2=HIGH)
   */
  const withdrawFromPool = async (amount, pool = RiskPool.LOW_RISK) => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.withdrawFromPool(parseEther(amount), pool);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error withdrawing from pool:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Claim interest from all pools
   */
  const claimInterest = async () => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.claimInterest();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error claiming interest:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /* ===================================================================
     BORROWER FUNCTIONS (V2)
     =================================================================== */

  /**
   * Request a loan (pool auto-assigned based on trust score)
   * @param {string} amount - Loan amount
   * @param {number} duration - Loan duration in seconds
   */
  const requestLoan = async (amount, duration) => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.requestLoan(parseEther(amount), duration);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error requesting loan:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Repay active loan
   */
  const repayLoan = async () => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const loan = await trustForge.getActiveLoan(account);
      const totalRepayment = formatEther(loan.totalRepayment);
      await approveTFX(totalRepayment);
      const tx = await trustForge.repayLoan();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error repaying loan:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark a loan as defaulted (callable by anyone after grace period)
   */
  const markDefault = async (borrowerAddress) => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.markDefault(borrowerAddress);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error marking default:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /* ===================================================================
     TRUST & SOCIAL FUNCTIONS (V2)
     =================================================================== */

  /**
   * Vouch for another user by username
   * @param {string} voucheeUsername - Username of the person to vouch for
   */
  const vouchForUser = async (voucheeUsername) => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.vouchForUser(voucheeUsername);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error vouching for user:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if voucher has vouched for vouchee
   */
  const hasVouched = async (voucherAddress, voucheeAddress) => {
    if (!trustForge) return false;
    try {
      return await trustForge.vouches(voucherAddress, voucheeAddress);
    } catch (error) {
      console.error("Error checking vouch:", error);
      return false;
    }
  };

  /**
   * Get users who vouched for an address
   */
  const getUserVouches = async (address) => {
    if (!trustForge) return [];
    try {
      const userAddress = address || account;
      return await trustForge.getUserVouches(userAddress);
    } catch (error) {
      console.error("Error getting user vouches:", error);
      return [];
    }
  };

  /**
   * Get users that an address has vouched for
   */
  const getVouchesGiven = async (address) => {
    if (!trustForge) return [];
    try {
      const userAddress = address || account;
      return await trustForge.getVouchesGiven(userAddress);
    } catch (error) {
      console.error("Error getting vouches given:", error);
      return [];
    }
  };

  /* ===================================================================
     READ/VIEW FUNCTIONS (V2)
     =================================================================== */

  /**
   * Get comprehensive user profile
   */
  const getUserProfile = async (address) => {
    if (!trustForge) return null;
    try {
      const userAddress = address || account;
      const profile = await trustForge.getUserProfile(userAddress);
      return {
        username: profile.username,
        trustScore: profile.trustScore.toString(),
        totalLoansTaken: profile.totalLoansTaken.toString(),
        successfulRepayments: profile.successfulRepayments.toString(),
        defaults: profile.defaults.toString(),
        hasActiveLoan: profile.hasActiveLoan,
        walletAge: profile.walletAge.toString(),
        maturityLevel: profile.maturityLevel.toString(),
        maxBorrowingLimit: formatEther(profile.maxBorrowingLimit),
        assignedPool: profile.assignedPool, // 0=LOW, 1=MED, 2=HIGH
      };
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  };

  /**
   * Get active loan details
   */
  const getActiveLoan = async (address) => {
    if (!trustForge) return null;
    try {
      const userAddress = address || account;
      const loan = await trustForge.getActiveLoan(userAddress);
      return {
        principal: formatEther(loan.principal),
        interestAmount: formatEther(loan.interestAmount),
        totalRepayment: formatEther(loan.totalRepayment),
        dueDate: loan.dueDate.toString(),
        duration: loan.duration.toString(),
        status: loan.status, // 0=ACTIVE, 1=REPAID, 2=DEFAULTED
        pool: loan.pool, // 0=LOW, 1=MED, 2=HIGH
        riskPool: loan.pool, // Alias for consistency
        isOverdue: loan.isOverdue,
      };
    } catch (error) {
      console.error("Error getting active loan:", error);
      return null;
    }
  };

  /**
   * Get wallet maturity information
   */
  const getWalletMaturity = async (address) => {
    if (!trustForge) return null;
    try {
      const userAddress = address || account;
      const maturity = await trustForge.getWalletMaturity(userAddress);
      return {
        age: maturity.age.toString(),
        maturityLevel: maturity.maturityLevel.toString(),
        maturityMultiplier: maturity.maturityMultiplier.toString(),
      };
    } catch (error) {
      console.error("Error getting wallet maturity:", error);
      return null;
    }
  };

  /**
   * Get statistics for a specific risk pool
   * @param {number} pool - Risk pool (0=LOW, 1=MEDIUM, 2=HIGH)
   */
  const getPoolStatsForRisk = async (pool = RiskPool.LOW_RISK) => {
    if (!trustForge) return null;
    try {
      const stats = await trustForge.getPoolStatsForRisk(pool);
      return {
        totalLiquidity: formatEther(stats.totalLiquidity),
        totalActiveLoanAmount: formatEther(stats.totalActiveLoanAmount),
        availableLiquidity: formatEther(stats.availableLiquidity),
        utilizationRate: stats.utilizationRate.toString(),
        interestPool: formatEther(stats.interestPool),
        totalDefaulted: formatEther(stats.totalDefaulted),
      };
    } catch (error) {
      console.error("Error getting pool stats for risk:", error);
      return null;
    }
  };

  /**
   * Get all pool statistics at once
   */
  const getAllPoolStats = async () => {
    if (!trustForge) return null;
    try {
      const stats = await trustForge.getAllPoolStats();
      return {
        lowRisk: {
          totalLiquidity: formatEther(stats.lowRisk.totalLiquidity),
          totalActiveLoans: formatEther(stats.lowRisk.totalActiveLoans),
          totalDefaulted: formatEther(stats.lowRisk.totalDefaulted),
          totalInterestPool: formatEther(stats.lowRisk.totalInterestPool),
          totalLenderDeposits: formatEther(stats.lowRisk.totalLenderDeposits),
        },
        medRisk: {
          totalLiquidity: formatEther(stats.medRisk.totalLiquidity),
          totalActiveLoans: formatEther(stats.medRisk.totalActiveLoans),
          totalDefaulted: formatEther(stats.medRisk.totalDefaulted),
          totalInterestPool: formatEther(stats.medRisk.totalInterestPool),
          totalLenderDeposits: formatEther(stats.medRisk.totalLenderDeposits),
        },
        highRisk: {
          totalLiquidity: formatEther(stats.highRisk.totalLiquidity),
          totalActiveLoans: formatEther(stats.highRisk.totalActiveLoans),
          totalDefaulted: formatEther(stats.highRisk.totalDefaulted),
          totalInterestPool: formatEther(stats.highRisk.totalInterestPool),
          totalLenderDeposits: formatEther(stats.highRisk.totalLenderDeposits),
        },
      };
    } catch (error) {
      console.error("Error getting all pool stats:", error);
      return null;
    }
  };

  /**
   * Get lender information across all pools
   */
  const getLenderInfo = async (address) => {
    if (!trustForge) return null;
    try {
      const lenderAddress = address || account;
      const info = await trustForge.getLenderInfo(lenderAddress);
      return {
        depositedLowRisk: formatEther(info.depositedLowRisk),
        depositedMedRisk: formatEther(info.depositedMedRisk),
        depositedHighRisk: formatEther(info.depositedHighRisk),
        totalInterestEarned: formatEther(info.totalInterestEarned),
        pendingInterestLow: formatEther(info.pendingInterestLow),
        pendingInterestMed: formatEther(info.pendingInterestMed),
        pendingInterestHigh: formatEther(info.pendingInterestHigh),
      };
    } catch (error) {
      console.error("Error getting lender info:", error);
      return null;
    }
  };

  /**
   * Get loan history for a user
   */
  const getLoanHistory = async (address) => {
    if (!trustForge) return [];
    try {
      const userAddress = address || account;
      const history = await trustForge.getLoanHistory(userAddress);
      return history.map(loan => ({
        principal: formatEther(loan.principal),
        interestAmount: formatEther(loan.interestAmount),
        totalRepayment: formatEther(loan.totalRepayment),
        startTime: loan.startTime.toString(),
        dueDate: loan.dueDate.toString(),
        duration: loan.duration.toString(),
        status: loan.status, // 0=ACTIVE, 1=REPAID, 2=DEFAULTED
        riskPool: loan.riskPool, // 0=LOW, 1=MED, 2=HIGH
      }));
    } catch (error) {
      console.error("Error getting loan history:", error);
      return [];
    }
  };

  /**
   * Get contract constants
   */
  const getConstants = async () => {
    if (!trustForge) return null;
    try {
      const [
        initialTrustScore,
        maxTrustScore,
        maturityLevel1,
        maturityLevel2,
        maturityLevel3,
        minLoanAmount,
        minLoanDuration,
        maxLoanDuration,
        gracePeriod,
        lowRiskThreshold,
        mediumRiskThreshold,
        trustIncreasePerRepayment,
        trustDecreaseOnDefault,
        vouchPenaltyOnDefault,
        maxVouchesPerUser,
        defaultCooldownPeriod,
        lowTrustLimit,
        medTrustLimit,
        highTrustLimit,
      ] = await Promise.all([
        trustForge.INITIAL_TRUST_SCORE(),
        trustForge.MAX_TRUST_SCORE(),
        trustForge.MATURITY_LEVEL_1(),
        trustForge.MATURITY_LEVEL_2(),
        trustForge.MATURITY_LEVEL_3(),
        trustForge.MIN_LOAN_AMOUNT(),
        trustForge.MIN_LOAN_DURATION(),
        trustForge.MAX_LOAN_DURATION(),
        trustForge.GRACE_PERIOD(),
        trustForge.LOW_RISK_THRESHOLD(),
        trustForge.MEDIUM_RISK_THRESHOLD(),
        trustForge.TRUST_INCREASE_PER_REPAYMENT(),
        trustForge.TRUST_DECREASE_ON_DEFAULT(),
        trustForge.VOUCH_PENALTY_ON_DEFAULT(),
        trustForge.MAX_VOUCHES_PER_USER(),
        trustForge.DEFAULT_COOLDOWN_PERIOD(),
        trustForge.LOW_TRUST_LIMIT(),
        trustForge.MED_TRUST_LIMIT(),
        trustForge.HIGH_TRUST_LIMIT(),
      ]);

      return {
        initialTrustScore: initialTrustScore.toString(),
        maxTrustScore: maxTrustScore.toString(),
        maturityLevel1: maturityLevel1.toString(),
        maturityLevel2: maturityLevel2.toString(),
        maturityLevel3: maturityLevel3.toString(),
        minLoanAmount: formatEther(minLoanAmount),
        minLoanDuration: minLoanDuration.toString(),
        maxLoanDuration: maxLoanDuration.toString(),
        gracePeriod: gracePeriod.toString(),
        lowRiskThreshold: lowRiskThreshold.toString(),
        mediumRiskThreshold: mediumRiskThreshold.toString(),
        trustIncreasePerRepayment: trustIncreasePerRepayment.toString(),
        trustDecreaseOnDefault: trustDecreaseOnDefault.toString(),
        vouchPenaltyOnDefault: vouchPenaltyOnDefault.toString(),
        maxVouchesPerUser: maxVouchesPerUser.toString(),
        defaultCooldownPeriod: defaultCooldownPeriod.toString(),
        lowTrustLimit: formatEther(lowTrustLimit),
        medTrustLimit: formatEther(medTrustLimit),
        highTrustLimit: formatEther(highTrustLimit),
      };
    } catch (error) {
      console.error("Error getting constants:", error);
      return null;
    }
  };

  /**
   * Get interest rates for a specific pool
   * @param {number} pool - Risk pool (0=LOW, 1=MEDIUM, 2=HIGH)
   */
  const getPoolInterestRates = async (pool = RiskPool.LOW_RISK) => {
    if (!trustForge) return null;
    try {
      let baseRate, maxRate;
      
      if (pool === RiskPool.LOW_RISK) {
        [baseRate, maxRate] = await Promise.all([
          trustForge.BASE_INTEREST_RATE_LOW(),
          trustForge.MAX_INTEREST_RATE_LOW(),
        ]);
      } else if (pool === RiskPool.MEDIUM_RISK) {
        [baseRate, maxRate] = await Promise.all([
          trustForge.BASE_INTEREST_RATE_MED(),
          trustForge.MAX_INTEREST_RATE_MED(),
        ]);
      } else {
        [baseRate, maxRate] = await Promise.all([
          trustForge.BASE_INTEREST_RATE_HIGH(),
          trustForge.MAX_INTEREST_RATE_HIGH(),
        ]);
      }

      return {
        baseRate: baseRate.toString(), // in basis points (100 = 1%)
        maxRate: maxRate.toString(), // in basis points
      };
    } catch (error) {
      console.error("Error getting pool interest rates:", error);
      return null;
    }
  };

  /* ===================================================================
     ADMIN FUNCTIONS (V2)
     =================================================================== */

  /**
   * Update trust parameters (owner only)
   */
  const updateTrustParameters = async (increasePerRepayment, decreaseOnDefault, vouchPenalty) => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.updateTrustParameters(
        increasePerRepayment,
        decreaseOnDefault,
        vouchPenalty
      );
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error updating trust parameters:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update borrowing limits (owner only)
   */
  const updateBorrowingLimits = async (lowTrust, medTrust, highTrust) => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.updateBorrowingLimits(
        parseEther(lowTrust),
        parseEther(medTrust),
        parseEther(highTrust)
      );
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error updating borrowing limits:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update interest rates for a specific pool (owner only)
   * @param {number} pool - Risk pool (0=LOW, 1=MEDIUM, 2=HIGH)
   * @param {number} baseRate - Base interest rate in basis points (100 = 1%)
   * @param {number} maxRate - Max interest rate in basis points
   */
  const updatePoolInterestRates = async (pool, baseRate, maxRate) => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.updatePoolInterestRates(pool, baseRate, maxRate);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error updating pool interest rates:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Emergency withdraw stuck tokens (owner only)
   */
  const emergencyWithdraw = async (tokenAddress, amount) => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.emergencyWithdraw(tokenAddress, parseEther(amount));
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
   * Pause contract (owner only)
   */
  const pauseContract = async () => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.pause();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error pausing contract:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Unpause contract (owner only)
   */
  const unpauseContract = async () => {
    if (!trustForge) throw new Error("TrustForge contract not initialized");
    try {
      setLoading(true);
      const tx = await trustForge.unpause();
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Error unpausing contract:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <BlockchainContext.Provider
      value={{
        account,
        provider,
        signer,
        tfx,
        trustForge,
        loading,
        connectWallet,
        disconnectWallet,
        
        // TFX Token - Basic Functions
        getTFXBalance,
        approveTFX,
        getTFXAllowance,
        getTFXName,
        getTFXSymbol,
        getTFXDecimals,
        getTFXTotalSupply,
        getTFXOwner,
        
        // TFX Token - Faucet Functions
        claimTFX,
        getLastClaimTime,
        getFaucetInfo,
        canClaimFaucet,
        
        // TFX Token - Admin Functions
        mintTFX,
        burnTFX,
        
        // Username Functions
        registerUsername,
        getAddressByUsername,
        hasUsernameRegistered,
        
        // Lender Functions (Risk Pools)
        depositToPool,
        withdrawFromPool,
        claimInterest,
        
        // Borrower Functions
        requestLoan,
        repayLoan,
        markDefault,
        
        // Trust & Social Functions
        vouchForUser,
        hasVouched,
        getUserVouches,
        getVouchesGiven,
        
        // Read/View Functions
        getUserProfile,
        getActiveLoan,
        getWalletMaturity,
        getPoolStatsForRisk,
        getAllPoolStats,
        getLenderInfo,
        getLoanHistory,
        getConstants,
        getPoolInterestRates,
        
        // Admin Functions
        updateTrustParameters,
        updateBorrowingLimits,
        updatePoolInterestRates,
        emergencyWithdraw,
        pauseContract,
        unpauseContract,
        
        // Constants
        TFX_ADDRESS,
        TRUSTFORGE_ADDRESS,
        RiskPool, // Export enum for use in components
        LoanStatus, // Export enum for use in components
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
};

export const useBlockchain = () => {
  const context = useContext(BlockchainContext);
  if (!context) {
    throw new Error("useBlockchain must be used within BlockchainProvider");
  }
  return context;
};

// Export enums for use in components
export { RiskPool, LoanStatus };