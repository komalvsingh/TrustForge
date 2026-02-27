import { createContext, useContext, useEffect, useState } from "react";
import { Contract, formatUnits, Interface, parseUnits } from "ethers";
import { useBlockchain } from "./BlockchainContext";

import TrustForgeDAOABI from "../abis/TrustForgeDAO.json";
import TrustForgeABI    from "../abis/TrustForge.json";

// ─── Addresses ────────────────────────────────────────────────────────────────
const DAO_ADDRESS        = "0x235bf11EE405648895Bc14c78993aa593D0E3284";
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
export const PROPOSAL_TEMPLATES = {

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

  UPDATE_BORROWING_LIMITS: {
    label:        "Update Borrowing Limits",
    functionName: "updateBorrowingLimits",
    argFields: [
      { name: "lowTrust",  label: "Low Trust Limit (USDC)",  type: "number" },
      { name: "medTrust",  label: "Med Trust Limit (USDC)",  type: "number" },
      { name: "highTrust", label: "High Trust Limit (USDC)", type: "number" },
    ],
    buildArgs: (f) => [prs(f.lowTrust), prs(f.medTrust), prs(f.highTrust)],
    describe:  (f) => `Borrowing limits → Low: ${f.lowTrust} USDC, Med: ${f.medTrust} USDC, High: ${f.highTrust} USDC`,
  },

  SET_PLATFORM_FEE: {
    label:        "Set Platform Fee",
    functionName: "setPlatformFee",
    argFields: [
      { name: "feeBps", label: "Fee in basis points (200 = 2%, max 1000)", type: "number" },
    ],
    buildArgs: (f) => [Number(f.feeBps)],
    describe:  (f) => `Set platform fee to ${f.feeBps}bps (${f.feeBps/100}%)`,
  },

  SET_ADMIN_WALLET: {
    label:        "Change Admin Wallet (Fee Recipient)",
    functionName: "setAdminWallet",
    argFields: [
      { name: "wallet", label: "New admin wallet address", type: "text" },
    ],
    buildArgs: (f) => [f.wallet],
    describe:  (f) => `Change admin/fee-recipient wallet to ${f.wallet}`,
  },

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

  SET_MIN_INTEREST: {
    label:        "Set Minimum Interest Floor",
    functionName: "setMinInterestAmount",
    argFields: [
      { name: "amount", label: "Minimum interest amount (USDC, e.g. 0.1)", type: "number" },
    ],
    buildArgs: (f) => [prs(f.amount)],
    describe:  (f) => `Set minimum interest floor to ${f.amount} USDC`,
  },

  SET_AUTO_LIMIT: {
    label:        "Toggle Auto Borrowing Limits",
    functionName: "setAutoLimitEnabled",
    argFields: [
      { name: "enabled", label: "Enable auto limits (true/false)", type: "boolean" },
    ],
    buildArgs: (f) => [f.enabled === true || f.enabled === "true"],
    describe:  (f) => `${f.enabled ? "Enable" : "Disable"} automatic trust-score-based borrowing limits`,
  },

  SET_EMERGENCY_PAUSER: {
    label:        "Change Emergency Pauser",
    functionName: "setEmergencyPauser",
    argFields: [
      { name: "pauser", label: "New emergency pauser address", type: "text" },
    ],
    buildArgs: (f) => [f.pauser],
    describe:  (f) => `Change emergency pauser to ${f.pauser}`,
  },

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

  useEffect(() => {
    if (!signer) { setDao(null); return; }
    const daoABI = TrustForgeDAOABI.abi || TrustForgeDAOABI;
    setDao(new Contract(DAO_ADDRESS, daoABI, signer));
  }, [signer]);

  // ─────────────────────────────────────────────────────────────────────────
  // READ FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────

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
        state:           Number(stateEnum),
        stateLabel:      PROPOSAL_STATE_LABELS[Number(stateEnum)] || "UNKNOWN",
        decoded:         _decodeProposalData(p[3]),
      };
    } catch (err) {
      console.error(`getProposal(${proposalId}):`, err);
      return null;
    }
  };

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

  const isProposalExecutable = async (proposalId) => {
    if (!dao) return false;
    try {
      return await dao.isProposalExecutable(proposalId);
    } catch (err) {
      console.error("isProposalExecutable:", err);
      return false;
    }
  };

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

  const getVotingPower = async (address) => {
    if (!usdc) return "0";
    try {
      return fmt(await usdc.balanceOf(address || account));
    } catch (err) {
      console.error("getVotingPower:", err);
      return "0";
    }
  };

  const hasUserVoted = async (proposalId, address) => {
    if (!dao) return false;
    try {
      return await dao.hasVoted(proposalId, address || account);
    } catch (err) {
      console.error("hasUserVoted:", err);
      return false;
    }
  };

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
   * Requirements (trust score gate REMOVED):
   *   1. USDC balance >= 100 USDC
   *   2. Not in 24h proposal cooldown
   */
  const canCreateProposal = async (address) => {
    if (!dao || !usdc) return { eligible: false, reason: "Contracts not initialized" };
    try {
      const addr      = address || account;
      const minTokens = await dao.MIN_PROPOSAL_TOKENS();
      const balance   = await usdc.balanceOf(addr);
      const cooldown  = await dao.PROPOSAL_COOLDOWN();
      const lastProp  = await dao.lastProposalTime(addr);
      const now       = BigInt(Math.floor(Date.now() / 1000));
      const cooldownClear = now >= lastProp + cooldown;

      const hasEnoughUsdc = balance >= minTokens;

      // ── Trust score check REMOVED ──────────────────────────────────────────
      // Only 100 USDC + cooldown required now. Trust score is no longer a gate.
      const eligible = hasEnoughUsdc && cooldownClear;

      return {
        eligible,
        hasEnoughUsdc,
        trustEligible: true,   // always true — gate removed
        cooldownClear,
        usdcBalance:  fmt(balance),
        minUsdc:      fmt(minTokens),
        trustScore:   null,    // not checked anymore
        minTrust:     null,    // not checked anymore
        nextProposalAt: cooldownClear ? null : Number(lastProp + cooldown),
        reason: !eligible
          ? !hasEnoughUsdc
            ? `Need ${fmt(minTokens)} USDC to propose, you have ${fmt(balance)} USDC`
            : `In cooldown. Try after ${new Date(Number(lastProp + cooldown) * 1000).toLocaleString()}`
          : null,
      };
    } catch (err) {
      console.error("canCreateProposal:", err);
      return { eligible: false, reason: err.message };
    }
  };

  const verifyLink = async () => {
    if (!dao) return null;
    try {
      const v = await dao.verifyLink();
      return {
        trustForgeSet:      v[0],
        daoOwnsTrustForge:  v[1],
        quorumIsSet:        v[2],
        readyForGovernance: v[3],
        trustForgeAddress:  v[4],
        trustForgeOwner:    v[5],
        currentQuorum:      fmt(v[6]),
      };
    } catch (err) {
      console.error("verifyLink:", err);
      return null;
    }
  };

  const getQuorumThreshold = async () => {
    if (!dao) return "0";
    try {
      return fmt(await dao.quorumThreshold());
    } catch (err) {
      console.error("getQuorumThreshold:", err);
      return "0";
    }
  };

  const getLastProposalTime = async (address) => {
    if (!dao) return 0;
    try {
      return Number(await dao.lastProposalTime(address || account));
    } catch (err) {
      console.error("getLastProposalTime:", err);
      return 0;
    }
  };

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
        minProposalTokens:  fmt(minTokens),
        votingDuration:     Number(votingDuration),
        timelockDelay:      Number(timelockDelay),
        proposalCooldown:   Number(proposalCooldown),
        quorumThreshold:    fmt(quorum),
      };
    } catch (err) {
      console.error("getDAOConstants:", err);
      return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // WRITE FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const createProposal = async (targetAddress, functionName, args, description) => {
    if (!dao) throw new Error("DAO not initialized");
    const iface    = new Interface(TrustForgeABI.abi || TrustForgeABI);
    const callData = iface.encodeFunctionData(functionName, args);
    return _submitProposal(targetAddress, 0n, callData, description);
  };

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

  const createProposalFromTemplate = async (templateKey, fieldValues, customDesc) => {
    const template = PROPOSAL_TEMPLATES[templateKey];
    if (!template) throw new Error(`Unknown proposal template: ${templateKey}`);
    const args        = template.buildArgs(fieldValues);
    const description = customDesc || template.describe(fieldValues);
    const iface       = new Interface(TrustForgeABI.abi || TrustForgeABI);
    const callData    = iface.encodeFunctionData(template.functionName, args);
    return proposeTrustForgeCall(callData, description);
  };

  const proposeInterestRateChange = async (pool, baseRate, maxRate, desc) => {
    const keys = ["UPDATE_LOW_RISK_RATES", "UPDATE_MED_RISK_RATES", "UPDATE_HIGH_RISK_RATES"];
    if (pool < 0 || pool > 2) throw new Error("pool must be 0, 1, or 2");
    return createProposalFromTemplate(keys[pool], { baseRate, maxRate }, desc);
  };

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

  const executeProposal = async (proposalId) => {
    if (!dao) throw new Error("DAO not initialized");
    setLoading(true);
    setError(null);
    try {
      const tx = await dao.executeProposal(proposalId);
      await tx.wait();
      return tx;
    } catch (err) {
      const reason = err?.reason || err?.data?.message || err.message;
      setError(reason);
      throw new Error(reason);
    } finally {
      setLoading(false);
    }
  };

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

  const _decodeProposalData = (data) => {
    try {
      const iface   = new Interface(TrustForgeABI.abi || TrustForgeABI);
      const decoded = iface.parseTransaction({ data });
      if (!decoded) return null;
      return {
        functionName: decoded.name,
        args:         decoded.args,
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

  const getProposalStatus = (proposal) => {
    if (!proposal) return "Unknown";
    if (proposal.stateLabel) return proposal.stateLabel;
    const now = Math.floor(Date.now() / 1000);
    if (proposal.cancelled) return "CANCELLED";
    if (proposal.executed)  return "EXECUTED";
    if (now < proposal.endTime) return "ACTIVE";
    if (parseFloat(proposal.yesVotes) > parseFloat(proposal.noVotes)) {
      return now < proposal.executableAfter ? "QUEUED" : "EXECUTABLE";
    }
    return "DEFEATED";
  };

  const getTimeRemaining    = (ts) => Math.max(ts - Math.floor(Date.now() / 1000), 0);
  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return "Ended";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };
  const isVotingActive    = (p) => !p?.cancelled && !p?.executed && Math.floor(Date.now() / 1000) < p?.endTime;
  const isTimelockElapsed = (p) => Math.floor(Date.now() / 1000) >= p?.executableAfter;
  const getTemplateLabel  = (key) => PROPOSAL_TEMPLATES[key]?.label || key;

  return (
    <DAOContext.Provider value={{
      dao, loading, error, proposalCount, proposals,
      fetchProposalCount, getProposal, getProposalState, getAllProposals,
      getVotingPower, hasUserVoted, getVoterWeight, isProposalExecutable,
      canCreateProposal, verifyLink, getQuorumThreshold, getLastProposalTime, getDAOConstants,
      createProposal, proposeTrustForgeCall, createProposalFromTemplate,
      proposeInterestRateChange, vote, executeProposal, cancelProposal, setQuorumThreshold,
      getProposalStatus, getTimeRemaining, formatTimeRemaining,
      isVotingActive, isTimelockElapsed, getTemplateLabel,
      PROPOSAL_TEMPLATES, PROPOSAL_STATE_LABELS, DAO_ADDRESS, TRUSTFORGE_ADDRESS,
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