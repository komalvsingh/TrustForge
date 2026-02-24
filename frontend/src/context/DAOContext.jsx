
import { createContext, useContext, useEffect, useState } from "react";
import { Contract, formatUnits, Interface, parseUnits } from "ethers";
import { useBlockchain } from "./BlockchainContext";

import TrustForgeDAOABI from "../abis/TrustForgeDAO.json";
import TrustForgeABI    from "../abis/TrustForge.json";

// ─── Addresses ────────────────────────────────────────────────────────────────
const DAO_ADDRESS        = "0x9a9d28A7007a6d82ba294462Bf22C38C999e856e";
const TRUSTFORGE_ADDRESS = "0x3013e7F2a98F60433BAe85c4E5569A980B0C7Cf7";

// ─── USDC decimals (must match BlockchainContext) ─────────────────────────────
const USDC_DECIMALS = 6;
const fmt  = (raw) => formatUnits(raw, USDC_DECIMALS);
const prs  = (str) => parseUnits(String(str), USDC_DECIMALS);

// ─── Proposal State Labels (matching TrustForgeDAO.sol ProposalState enum) ────
export const PROPOSAL_STATE_LABELS = {
  0: "PENDING",
  1: "ACTIVE",
  2: "DEFEATED",
  3: "QUEUED",
  4: "EXECUTABLE",
  5: "EXECUTED",
  6: "CANCELLED",
};

// ─── Proposal Templates ───────────────────────────────────────────────────────
// Each template maps to a TrustForge v5 admin function.
// buildArgs returns the raw args array to pass to encodeFunctionData.
// USDC amounts in argFields should be entered as human-readable strings by the user.
export const PROPOSAL_TEMPLATES = {

  // ── Interest Rate Changes ──────────────────────────────────────────────────

  UPDATE_LOW_RISK_RATES: {
    label:        "Update Low Risk Pool Rates",
    functionName: "updatePoolInterestRates",
    argFields: [
      { name: "baseRate", label: "Base Rate (bps, 100 = 1%)", type: "number" },
      { name: "maxRate",  label: "Max Rate (bps)",             type: "number" },
    ],
    buildArgs: (f) => [0, Number(f.baseRate), Number(f.maxRate)],
    describe:  (f) => `LOW_RISK pool: base=${f.baseRate}bps (${f.baseRate/100}%), max=${f.maxRate}bps (${f.maxRate/100}%)`,
  },

  UPDATE_MED_RISK_RATES: {
    label:        "Update Medium Risk Pool Rates",
    functionName: "updatePoolInterestRates",
    argFields: [
      { name: "baseRate", label: "Base Rate (bps)", type: "number" },
      { name: "maxRate",  label: "Max Rate (bps)",  type: "number" },
    ],
    buildArgs: (f) => [1, Number(f.baseRate), Number(f.maxRate)],
    describe:  (f) => `MEDIUM_RISK pool: base=${f.baseRate}bps (${f.baseRate/100}%), max=${f.maxRate}bps (${f.maxRate/100}%)`,
  },

  UPDATE_HIGH_RISK_RATES: {
    label:        "Update High Risk Pool Rates",
    functionName: "updatePoolInterestRates",
    argFields: [
      { name: "baseRate", label: "Base Rate (bps)", type: "number" },
      { name: "maxRate",  label: "Max Rate (bps)",  type: "number" },
    ],
    buildArgs: (f) => [2, Number(f.baseRate), Number(f.maxRate)],
    describe:  (f) => `HIGH_RISK pool: base=${f.baseRate}bps (${f.baseRate/100}%), max=${f.maxRate}bps (${f.maxRate/100}%)`,
  },

  // ── Borrowing Limits ───────────────────────────────────────────────────────

  UPDATE_BORROWING_LIMITS: {
    label:        "Update Borrowing Limits",
    functionName: "updateBorrowingLimits",
    argFields: [
      { name: "lowTrust",  label: "Low Trust Limit (USDC)",  type: "number" },
      { name: "medTrust",  label: "Med Trust Limit (USDC)",  type: "number" },
      { name: "highTrust", label: "High Trust Limit (USDC)", type: "number" },
    ],
    // Parse to 6-dec USDC for the contract
    buildArgs: (f) => [prs(f.lowTrust), prs(f.medTrust), prs(f.highTrust)],
    describe:  (f) => `Borrowing limits → Low: ${f.lowTrust} USDC, Med: ${f.medTrust} USDC, High: ${f.highTrust} USDC`,
  },

  // ── Platform Fee ───────────────────────────────────────────────────────────

  SET_PLATFORM_FEE: {
    label:        "Set Platform Fee",
    functionName: "setPlatformFee",
    argFields: [
      { name: "feeBps", label: "Fee in basis points (200 = 2%, max 1000)", type: "number" },
    ],
    buildArgs: (f) => [Number(f.feeBps)],
    describe:  (f) => `Set platform fee to ${f.feeBps}bps (${f.feeBps/100}%)`,
  },

  // ── Admin Wallet ───────────────────────────────────────────────────────────

  SET_ADMIN_WALLET: {
    label:        "Change Admin Wallet (Fee Recipient)",
    functionName: "setAdminWallet",
    argFields: [
      { name: "wallet", label: "New admin wallet address", type: "text" },
    ],
    buildArgs: (f) => [f.wallet],
    describe:  (f) => `Change admin/fee-recipient wallet to ${f.wallet}`,
  },

  // ── Vouch Parameters ───────────────────────────────────────────────────────

  UPDATE_VOUCH_PARAMS: {
    label:        "Update Vouch Parameters",
    functionName: "updateVouchParameters",
    argFields: [
      { name: "penaltyPts", label: "Penalty pts per default (1–100)", type: "number" },
      { name: "maxVouches", label: "Max vouches per user (1–20)",     type: "number" },
    ],
    buildArgs: (f) => [Number(f.penaltyPts), Number(f.maxVouches)],
    describe:  (f) => `Vouch penalty=${f.penaltyPts}pts/default, max vouches per user=${f.maxVouches}`,
  },

  // ── Minimum Interest Floor ─────────────────────────────────────────────────

  SET_MIN_INTEREST: {
    label:        "Set Minimum Interest Floor",
    functionName: "setMinInterestAmount",
    argFields: [
      { name: "amount", label: "Minimum interest amount (USDC, e.g. 0.1)", type: "number" },
    ],
    // Note: setMinInterestAmount takes raw 6-dec value
    buildArgs: (f) => [prs(f.amount)],
    describe:  (f) => `Set minimum interest floor to ${f.amount} USDC`,
  },

  // ── Auto Limit Toggle ──────────────────────────────────────────────────────

  SET_AUTO_LIMIT: {
    label:        "Toggle Auto Borrowing Limits",
    functionName: "setAutoLimitEnabled",
    argFields: [
      { name: "enabled", label: "Enable auto limits (true/false)", type: "boolean" },
    ],
    buildArgs: (f) => [f.enabled === true || f.enabled === "true"],
    describe:  (f) => `${f.enabled ? "Enable" : "Disable"} automatic trust-score-based borrowing limits`,
  },

  // ── Emergency Pauser ──────────────────────────────────────────────────────

  SET_EMERGENCY_PAUSER: {
    label:        "Change Emergency Pauser",
    functionName: "setEmergencyPauser",
    argFields: [
      { name: "pauser", label: "New emergency pauser address", type: "text" },
    ],
    buildArgs: (f) => [f.pauser],
    describe:  (f) => `Change emergency pauser to ${f.pauser}`,
  },

  // ── Pause / Unpause ────────────────────────────────────────────────────────

  PAUSE_PROTOCOL: {
    label:        "Pause Protocol (Emergency via DAO)",
    functionName: "pause",
    argFields:    [],
    buildArgs:    () => [],
    describe:     () => "Emergency: Pause all TrustForge operations via DAO vote",
  },

  UNPAUSE_PROTOCOL: {
    label:        "Unpause Protocol",
    functionName: "unpause",
    argFields:    [],
    buildArgs:    () => [],
    describe:     () => "Resume TrustForge operations — requires DAO majority + quorum + 24h timelock",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────
const DAOContext = createContext();

export const DAOProvider = ({ children }) => {
  const { signer, account, usdc, trustForge: tfContract } = useBlockchain();

  const [dao,           setDao]           = useState(null);
  const [proposalCount, setProposalCount] = useState(0);
  const [proposals,     setProposals]     = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);

  // ── Init DAO contract ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!signer) { setDao(null); return; }
    const daoABI = TrustForgeDAOABI.abi || TrustForgeDAOABI;
    setDao(new Contract(DAO_ADDRESS, daoABI, signer));
  }, [signer]);

  // ─────────────────────────────────────────────────────────────────────────
  // READ FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /** Fetch current proposal count from chain */
  const fetchProposalCount = async () => {
    if (!dao) return 0;
    try {
      const n = Number(await dao.proposalCount());
      setProposalCount(n);
      return n;
    } catch (err) {
      console.error("fetchProposalCount:", err);
      return 0;
    }
  };

  /**
   * Get a single proposal by ID.
   *
   * Contract return tuple (getProposal):
   *   [0]  proposer        address
   *   [1]  target          address
   *   [2]  value           uint256 (ETH value, usually 0)
   *   [3]  data            bytes   (ABI-encoded function call)
   *   [4]  description     string
   *   [5]  yesVotes        uint256 (USDC 6-dec)
   *   [6]  noVotes         uint256 (USDC 6-dec)
   *   [7]  endTime         uint256 (unix timestamp)
   *   [8]  executableAfter uint256 (unix timestamp — endTime + 24h)
   *   [9]  executed        bool
   *   [10] cancelled       bool
   *
   * Also fetches live state via getProposalState() and decodes calldata.
   */
  const getProposal = async (proposalId) => {
    if (!dao) return null;
    try {
      const [p, stateEnum] = await Promise.all([
        dao.getProposal(proposalId),
        dao.getProposalState(proposalId),
      ]);

      return {
        id:              proposalId,
        proposer:        p[0],
        target:          p[1],
        value:           p[2].toString(),
        data:            p[3],
        description:     p[4],
        yesVotes:        fmt(p[5]),
        noVotes:         fmt(p[6]),
        endTime:         Number(p[7]),
        executableAfter: Number(p[8]),
        executed:        p[9],
        cancelled:       p[10],
        // Live state from on-chain enum
        state:           Number(stateEnum),
        stateLabel:      PROPOSAL_STATE_LABELS[Number(stateEnum)] || "UNKNOWN",
        // Decoded calldata for display
        decoded:         _decodeProposalData(p[3]),
      };
    } catch (err) {
      console.error(`getProposal(${proposalId}):`, err);
      return null;
    }
  };

  /**
   * Get on-chain proposal state enum.
   * Returns a number matching ProposalState:
   *   0=PENDING, 1=ACTIVE, 2=DEFEATED, 3=QUEUED, 4=EXECUTABLE, 5=EXECUTED, 6=CANCELLED
   */
  const getProposalState = async (proposalId) => {
    if (!dao) return null;
    try {
      const state = await dao.getProposalState(proposalId);
      return {
        state:      Number(state),
        stateLabel: PROPOSAL_STATE_LABELS[Number(state)] || "UNKNOWN",
      };
    } catch (err) {
      console.error("getProposalState:", err);
      return null;
    }
  };

  /**
   * Check if a proposal is currently executable on-chain.
   * Uses the contract's view function — single source of truth.
   */
  const isProposalExecutable = async (proposalId) => {
    if (!dao) return false;
    try {
      return await dao.isProposalExecutable(proposalId);
    } catch (err) {
      console.error("isProposalExecutable:", err);
      return false;
    }
  };

  /** Fetch all proposals (1 → proposalCount) and cache in state */
  const getAllProposals = async () => {
    if (!dao) return [];
    try {
      const count   = Number(await dao.proposalCount());
      const results = await Promise.all(
        Array.from({ length: count }, (_, i) => getProposal(i + 1))
      );
      const filtered = results.filter(Boolean);
      setProposals(filtered);
      return filtered;
    } catch (err) {
      console.error("getAllProposals:", err);
      return [];
    }
  };

  /**
   * Get the USDC voting power for an address (balance at vote time).
   * Voting power = USDC held at the moment vote() is called.
   */
  const getVotingPower = async (address) => {
    if (!usdc) return "0";
    try {
      return fmt(await usdc.balanceOf(address || account));
    } catch (err) {
      console.error("getVotingPower:", err);
      return "0";
    }
  };

  /** Check if an address has already voted on a proposal */
  const hasUserVoted = async (proposalId, address) => {
    if (!dao) return false;
    try {
      return await dao.hasVoted(proposalId, address || account);
    } catch (err) {
      console.error("hasUserVoted:", err);
      return false;
    }
  };

  /** Get the stored vote weight for a specific voter on a proposal */
  const getVoterWeight = async (proposalId, address) => {
    if (!dao) return "0";
    try {
      const weight = await dao.voterWeight(proposalId, address || account);
      return fmt(weight);
    } catch (err) {
      console.error("getVoterWeight:", err);
      return "0";
    }
  };

  /**
   * Check if an address can create a proposal.
   * Requirements:
   *   1. USDC balance >= 100 USDC (MIN_PROPOSAL_TOKENS)
   *   2. Trust score >= 500 (checked via trustForge.isEligibleForDAOProposal)
   *   3. Not in 24h proposal cooldown
   */
  const canCreateProposal = async (address) => {
    if (!dao || !usdc) return { eligible: false, reason: "Contracts not initialized" };
    try {
      const addr        = address || account;
      const minTokens   = await dao.MIN_PROPOSAL_TOKENS(); // 100 USDC in 6-dec
      const balance     = await usdc.balanceOf(addr);
      const cooldown    = await dao.PROPOSAL_COOLDOWN();
      const lastProp    = await dao.lastProposalTime(addr);
      const now         = BigInt(Math.floor(Date.now() / 1000));
      const cooldownClear = now >= lastProp + cooldown;

      // Check trust eligibility via TrustForge if available
      let trustEligible = true;
      let trustScore    = 0;
      if (tfContract) {
        trustEligible = await tfContract.isEligibleForDAOProposal(addr);
        trustScore    = Number(await tfContract.computeTrustScore(addr));
      }

      const hasEnoughUsdc = balance >= minTokens;
      const eligible = hasEnoughUsdc && trustEligible && cooldownClear;

      return {
        eligible,
        hasEnoughUsdc,
        trustEligible,
        cooldownClear,
        usdcBalance:  fmt(balance),
        minUsdc:      fmt(minTokens),
        trustScore,
        minTrust:     500,
        nextProposalAt: cooldownClear ? null : Number(lastProp + cooldown),
        reason: !eligible
          ? !hasEnoughUsdc
            ? `Need ${fmt(minTokens)} USDC, have ${fmt(balance)}`
            : !trustEligible
            ? `Trust score ${trustScore} < 500`
            : `In cooldown. Try after ${new Date(Number(lastProp + cooldown) * 1000).toLocaleString()}`
          : null,
      };
    } catch (err) {
      console.error("canCreateProposal:", err);
      return { eligible: false, reason: err.message };
    }
  };

  /**
   * Check the DAO ↔ TrustForge link status.
   * All fields should be true before the platform goes live.
   *
   * Contract return (verifyLink):
   *   trustForgeSet, daoOwnsTrustForge, quorumIsSet, readyForGovernance,
   *   trustForgeAddress, trustForgeOwner, currentQuorum
   */
  const verifyLink = async () => {
    if (!dao) return null;
    try {
      const v = await dao.verifyLink();
      return {
        trustForgeSet:      v[0],
        daoOwnsTrustForge:  v[1],   // ← most critical: owner() == DAO address
        quorumIsSet:        v[2],
        readyForGovernance: v[3],   // true only if all three above are true
        trustForgeAddress:  v[4],
        trustForgeOwner:    v[5],
        currentQuorum:      fmt(v[6]),  // human-readable USDC
      };
    } catch (err) {
      console.error("verifyLink:", err);
      return null;
    }
  };

  /** Get the current quorum threshold (in human-readable USDC) */
  const getQuorumThreshold = async () => {
    if (!dao) return "0";
    try {
      return fmt(await dao.quorumThreshold());
    } catch (err) {
      console.error("getQuorumThreshold:", err);
      return "0";
    }
  };

  /** Get last proposal time for an address (unix timestamp) */
  const getLastProposalTime = async (address) => {
    if (!dao) return 0;
    try {
      return Number(await dao.lastProposalTime(address || account));
    } catch (err) {
      console.error("getLastProposalTime:", err);
      return 0;
    }
  };

  /** Get all DAO governance constants in one call */
  const getDAOConstants = async () => {
    if (!dao) return null;
    try {
      const [minTokens, votingDuration, timelockDelay, proposalCooldown, quorum] =
        await Promise.all([
          dao.MIN_PROPOSAL_TOKENS(),
          dao.VOTING_DURATION(),
          dao.TIMELOCK_DELAY(),
          dao.PROPOSAL_COOLDOWN(),
          dao.quorumThreshold(),
        ]);
      return {
        minProposalTokens:  fmt(minTokens),      // USDC to create proposal (100)
        votingDuration:     Number(votingDuration),  // seconds (6 hours)
        timelockDelay:      Number(timelockDelay),   // seconds (24 hours)
        proposalCooldown:   Number(proposalCooldown),// seconds (24 hours)
        quorumThreshold:    fmt(quorum),             // USDC yes votes needed
      };
    } catch (err) {
      console.error("getDAOConstants:", err);
      return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // WRITE FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a raw governance proposal targeting any contract.
   * For TrustForge calls, prefer proposeTrustForgeCall() or
   * createProposalFromTemplate() — they handle encoding and validation.
   *
   * @param {string} targetAddress  Contract address the proposal will call
   * @param {string} functionName   Solidity function name (e.g. "setPlatformFee")
   * @param {Array}  args           Function arguments (already typed correctly)
   * @param {string} description    Human-readable proposal description
   */
  const createProposal = async (targetAddress, functionName, args, description) => {
    if (!dao) throw new Error("DAO not initialized");
    const iface    = new Interface(TrustForgeABI.abi || TrustForgeABI);
    const callData = iface.encodeFunctionData(functionName, args);
    return _submitProposal(targetAddress, 0n, callData, description);
  };

  /**
   * Create a proposal that calls a TrustForge admin function.
   * Uses the DAO's proposeTrustForgeCall() convenience method,
   * which automatically targets trustForge and validates eligibility on-chain.
   *
   * @param {Uint8Array|string} callData    ABI-encoded calldata
   * @param {string}            description Human-readable description
   */
  const proposeTrustForgeCall = async (callData, description) => {
    if (!dao) throw new Error("DAO not initialized");
    setLoading(true);
    setError(null);
    try {
      const tx = await dao.proposeTrustForgeCall(callData, description);
      await tx.wait();
      await fetchProposalCount();
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a TrustForge proposal from a predefined template.
   * Handles encoding, argument conversion, and description generation.
   *
   * @param {string} templateKey    Key from PROPOSAL_TEMPLATES (e.g. "SET_PLATFORM_FEE")
   * @param {object} fieldValues    User-supplied values matching template.argFields
   * @param {string} [customDesc]   Optional description override
   *
   * Example:
   *   await createProposalFromTemplate("SET_PLATFORM_FEE", { feeBps: 150 })
   *   → proposes setPlatformFee(150) with auto-generated description
   */
  const createProposalFromTemplate = async (templateKey, fieldValues, customDesc) => {
    const template = PROPOSAL_TEMPLATES[templateKey];
    if (!template) throw new Error(`Unknown proposal template: ${templateKey}`);

    const args        = template.buildArgs(fieldValues);
    const description = customDesc || template.describe(fieldValues);
    const iface       = new Interface(TrustForgeABI.abi || TrustForgeABI);
    const callData    = iface.encodeFunctionData(template.functionName, args);

    return proposeTrustForgeCall(callData, description);
  };

  /**
   * Convenience: propose an interest rate change for a specific pool.
   *
   * @param {number} pool      0=LOW, 1=MED, 2=HIGH (RiskPool enum)
   * @param {number} baseRate  Basis points (e.g. 300 = 3%)
   * @param {number} maxRate   Basis points (e.g. 800 = 8%)
   * @param {string} [desc]    Optional description override
   */
  const proposeInterestRateChange = async (pool, baseRate, maxRate, desc) => {
    const keys = ["UPDATE_LOW_RISK_RATES", "UPDATE_MED_RISK_RATES", "UPDATE_HIGH_RISK_RATES"];
    if (pool < 0 || pool > 2) throw new Error("pool must be 0, 1, or 2");
    return createProposalFromTemplate(keys[pool], { baseRate, maxRate }, desc);
  };

  /**
   * Vote on a proposal. Voting power = USDC balance at time of vote.
   * Balance is stored on-chain per voter to prevent double-counting.
   *
   * @param {number}  proposalId Proposal to vote on
   * @param {boolean} support    true = YES, false = NO
   */
  const vote = async (proposalId, support) => {
    if (!dao) throw new Error("DAO not initialized");
    setLoading(true);
    setError(null);
    try {
      const tx = await dao.vote(proposalId, support);
      await tx.wait();
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute a passed proposal after the timelock has elapsed.
   * Requirements: majority YES, quorum met, voting ended, 24h timelock passed.
   * If TrustForge rejects the call, the revert reason is bubbled up.
   */
  const executeProposal = async (proposalId) => {
    if (!dao) throw new Error("DAO not initialized");
    setLoading(true);
    setError(null);
    try {
      const tx = await dao.executeProposal(proposalId);
      await tx.wait();
      return tx;
    } catch (err) {
      // Extract the bubbled-up revert reason from TrustForge if available
      const reason = err?.reason || err?.data?.message || err.message;
      setError(reason);
      throw new Error(reason);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel a proposal (DAO owner only — emergency safeguard).
   * Can be called at any time before execution.
   */
  const cancelProposal = async (proposalId) => {
    if (!dao) throw new Error("DAO not initialized");
    setLoading(true);
    setError(null);
    try {
      const tx = await dao.cancelProposal(proposalId);
      await tx.wait();
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update the quorum threshold (DAO owner only — governance parameter).
   * @param {string|number} thresholdUsdc Human-readable USDC amount
   */
  const setQuorumThreshold = async (thresholdUsdc) => {
    if (!dao) throw new Error("DAO not initialized");
    setLoading(true);
    setError(null);
    try {
      const tx = await dao.setQuorumThreshold(prs(thresholdUsdc));
      await tx.wait();
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const _submitProposal = async (target, value, callData, description) => {
    setLoading(true);
    setError(null);
    try {
      const tx = await dao.createProposal(target, value, callData, description);
      await tx.wait();
      await fetchProposalCount();
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /** Decode ABI-encoded proposal calldata back to function name + args for display */
  const _decodeProposalData = (data) => {
    try {
      const iface   = new Interface(TrustForgeABI.abi || TrustForgeABI);
      const decoded = iface.parseTransaction({ data });
      if (!decoded) return null;
      return {
        functionName: decoded.name,
        args:         decoded.args,
        // Try to match to a template for richer display
        template: Object.entries(PROPOSAL_TEMPLATES).find(
          ([, t]) => t.functionName === decoded.name
        )?.[0] || null,
      };
    } catch {
      return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UI HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get human-readable proposal status for display.
   * Uses the on-chain stateLabel if available, otherwise derives it client-side.
   */
  const getProposalStatus = (proposal) => {
    if (!proposal) return "Unknown";
    // Prefer the on-chain state label (most accurate)
    if (proposal.stateLabel) return proposal.stateLabel;
    // Fallback client-side derivation
    const now = Math.floor(Date.now() / 1000);
    if (proposal.cancelled) return "CANCELLED";
    if (proposal.executed)  return "EXECUTED";
    if (now < proposal.endTime) return "ACTIVE";
    if (parseFloat(proposal.yesVotes) > parseFloat(proposal.noVotes)) {
      return now < proposal.executableAfter ? "QUEUED" : "EXECUTABLE";
    }
    return "DEFEATED";
  };

  /** Seconds remaining until a timestamp (0 if already passed) */
  const getTimeRemaining = (unixTimestamp) =>
    Math.max(unixTimestamp - Math.floor(Date.now() / 1000), 0);

  /** Format seconds into a human-readable countdown string */
  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return "Ended";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  /** Check if voting window is open for a proposal */
  const isVotingActive = (proposal) => {
    if (!proposal) return false;
    return !proposal.cancelled && !proposal.executed &&
           Math.floor(Date.now() / 1000) < proposal.endTime;
  };

  /** Check if the timelock has elapsed (proposal is executable) */
  const isTimelockElapsed = (proposal) => {
    if (!proposal) return false;
    return Math.floor(Date.now() / 1000) >= proposal.executableAfter;
  };

  /** Get a template's human-readable label by key */
  const getTemplateLabel = (key) => PROPOSAL_TEMPLATES[key]?.label || key;

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DAOContext.Provider value={{
      // State
      dao, loading, error, proposalCount, proposals,

      // Read
      fetchProposalCount,
      getProposal,
      getProposalState,
      getAllProposals,
      getVotingPower,
      hasUserVoted,
      getVoterWeight,
      isProposalExecutable,
      canCreateProposal,
      verifyLink,
      getQuorumThreshold,
      getLastProposalTime,
      getDAOConstants,

      // Write
      createProposal,
      proposeTrustForgeCall,
      createProposalFromTemplate,
      proposeInterestRateChange,
      vote,
      executeProposal,
      cancelProposal,
      setQuorumThreshold,

      // UI helpers
      getProposalStatus,
      getTimeRemaining,
      formatTimeRemaining,
      isVotingActive,
      isTimelockElapsed,
      getTemplateLabel,

      // Config / constants
      PROPOSAL_TEMPLATES,
      PROPOSAL_STATE_LABELS,
      DAO_ADDRESS,
      TRUSTFORGE_ADDRESS,
    }}>
      {children}
    </DAOContext.Provider>
  );
};

export const useDAO = () => {
  const ctx = useContext(DAOContext);
  if (!ctx) throw new Error("useDAO must be used within DAOProvider");
  return ctx;
};