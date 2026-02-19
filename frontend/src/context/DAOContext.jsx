import { createContext, useContext, useEffect, useState } from "react";
import { Contract, formatEther, Interface, parseEther } from "ethers";
import { useBlockchain } from "./BlockchainContext";

import TrustForgeDAOABI from "../abis/TrustForgeDAO.json";
import TrustForgeABI from "../abis/TrustForge.json";

const DAO_ADDRESS = "0x30094799c55bf1194D046DBe0D9CDef41a6eC076";

const DAOContext = createContext();

// ─── Proposal Templates ──────────────────────────────────────────────────────
// These map human-readable action names to TrustForge function signatures + arg shapes
export const PROPOSAL_TEMPLATES = {
  // Interest Rate Changes
  UPDATE_LOW_RISK_RATES: {
    label: "Update Low Risk Pool Interest Rates",
    functionName: "updatePoolInterestRates",
    pool: 0, // RiskPool.LOW_RISK
    argFields: [
      { name: "baseRate", label: "Base Rate (basis points, 100 = 1%)", type: "number" },
      { name: "maxRate", label: "Max Rate (basis points)", type: "number" },
    ],
    buildArgs: (fields) => [0, Number(fields.baseRate), Number(fields.maxRate)],
    describe: (fields) =>
      `Update Low Risk Pool: Base=${fields.baseRate}bps, Max=${fields.maxRate}bps`,
  },
  UPDATE_MED_RISK_RATES: {
    label: "Update Medium Risk Pool Interest Rates",
    functionName: "updatePoolInterestRates",
    pool: 1,
    argFields: [
      { name: "baseRate", label: "Base Rate (basis points)", type: "number" },
      { name: "maxRate", label: "Max Rate (basis points)", type: "number" },
    ],
    buildArgs: (fields) => [1, Number(fields.baseRate), Number(fields.maxRate)],
    describe: (fields) =>
      `Update Medium Risk Pool: Base=${fields.baseRate}bps, Max=${fields.maxRate}bps`,
  },
  UPDATE_HIGH_RISK_RATES: {
    label: "Update High Risk Pool Interest Rates",
    functionName: "updatePoolInterestRates",
    pool: 2,
    argFields: [
      { name: "baseRate", label: "Base Rate (basis points)", type: "number" },
      { name: "maxRate", label: "Max Rate (basis points)", type: "number" },
    ],
    buildArgs: (fields) => [2, Number(fields.baseRate), Number(fields.maxRate)],
    describe: (fields) =>
      `Update High Risk Pool: Base=${fields.baseRate}bps, Max=${fields.maxRate}bps`,
  },

  // Trust Parameter Changes
  UPDATE_TRUST_PARAMS: {
    label: "Update Trust Parameters",
    functionName: "updateTrustParameters",
    argFields: [
      { name: "increasePerRepayment", label: "Trust Increase Per Repayment", type: "number" },
      { name: "decreaseOnDefault", label: "Trust Decrease On Default", type: "number" },
      { name: "vouchPenalty", label: "Vouch Penalty On Default", type: "number" },
    ],
    buildArgs: (fields) => [
      Number(fields.increasePerRepayment),
      Number(fields.decreaseOnDefault),
      Number(fields.vouchPenalty),
    ],
    describe: (fields) =>
      `Update Trust Params: +${fields.increasePerRepayment} on repay, -${fields.decreaseOnDefault} on default, -${fields.vouchPenalty} voucher penalty`,
  },

  // Borrowing Limit Changes
  UPDATE_BORROWING_LIMITS: {
    label: "Update Borrowing Limits",
    functionName: "updateBorrowingLimits",
    argFields: [
      { name: "lowTrust", label: "Low Trust Limit (ETH)", type: "number" },
      { name: "medTrust", label: "Medium Trust Limit (ETH)", type: "number" },
      { name: "highTrust", label: "High Trust Limit (ETH)", type: "number" },
    ],
    buildArgs: (fields) => [
      parseEther(String(fields.lowTrust)),
      parseEther(String(fields.medTrust)),
      parseEther(String(fields.highTrust)),
    ],
    describe: (fields) =>
      `Update Borrowing Limits: Low=${fields.lowTrust} ETH, Med=${fields.medTrust} ETH, High=${fields.highTrust} ETH`,
  },

  // Pause / Unpause
  PAUSE_PROTOCOL: {
    label: "Pause Protocol (Emergency)",
    functionName: "pause",
    argFields: [],
    buildArgs: () => [],
    describe: () => "Emergency: Pause all TrustForge operations",
  },
  UNPAUSE_PROTOCOL: {
    label: "Unpause Protocol",
    functionName: "unpause",
    argFields: [],
    buildArgs: () => [],
    describe: () => "Unpause TrustForge and resume operations",
  },
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const DAOProvider = ({ children }) => {
  const { signer, account, tfx } = useBlockchain();

  const [dao, setDao] = useState(null);
  const [proposalCount, setProposalCount] = useState(0);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Init DAO contract ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!signer) {
      setDao(null);
      return;
    }
    const daoABI = TrustForgeDAOABI.abi || TrustForgeDAOABI;
    setDao(new Contract(DAO_ADDRESS, daoABI, signer));
  }, [signer]);

  // ── Read: Proposal Count ───────────────────────────────────────────────────

  const fetchProposalCount = async () => {
    if (!dao) return 0;
    try {
      const count = await dao.proposalCount();
      const n = Number(count);
      setProposalCount(n);
      return n;
    } catch (err) {
      console.error("fetchProposalCount error:", err);
      return 0;
    }
  };

  // ── Read: Single Proposal ──────────────────────────────────────────────────

  const getProposal = async (proposalId) => {
    if (!dao) return null;
    try {
      const p = await dao.getProposal(proposalId);
      return {
        id: proposalId,
        target: p[0],
        value: p[1],
        data: p[2],
        yesVotes: formatEther(p[3]),
        noVotes: formatEther(p[4]),
        endTime: Number(p[5]),
        executed: p[6],
        // Decode what the proposal actually calls
        decoded: _decodeProposalData(p[2]),
      };
    } catch (err) {
      console.error(`getProposal(${proposalId}) error:`, err);
      return null;
    }
  };

  // ── Read: All Proposals ────────────────────────────────────────────────────

  const getAllProposals = async () => {
    if (!dao) return [];
    const count = Number(await dao.proposalCount());
    const results = [];
    for (let i = 1; i <= count; i++) {
      const proposal = await getProposal(i);
      if (proposal) results.push(proposal);
    }
    setProposals(results);
    return results;
  };

  // ── Read: Voting Power ─────────────────────────────────────────────────────

  const getVotingPower = async (address) => {
    if (!tfx) return "0";
    try {
      const balance = await tfx.balanceOf(address || account);
      return formatEther(balance);
    } catch {
      return "0";
    }
  };

  // ── Read: Has User Voted ───────────────────────────────────────────────────

  const hasUserVoted = async (proposalId, address) => {
    if (!dao) return false;
    try {
      return await dao.hasVoted(proposalId, address || account);
    } catch {
      return false;
    }
  };

  // ── Read: Can User Create Proposal ────────────────────────────────────────

  const canCreateProposal = async (address) => {
    if (!tfx) return false;
    try {
      const balance = await tfx.balanceOf(address || account);
      const minTokens = BigInt("100000000000000000000"); // 100 TFX
      return balance >= minTokens;
    } catch {
      return false;
    }
  };

  // ── Write: Create Proposal (raw) ──────────────────────────────────────────

  const createProposal = async (trustForgeAddress, functionName, args, description) => {
    if (!dao) throw new Error("DAO not initialized");

    const iface = new Interface(TrustForgeABI.abi || TrustForgeABI);
    const data = iface.encodeFunctionData(functionName, args);

    setLoading(true);
    setError(null);
    try {
      const tx = await dao.createProposal(trustForgeAddress, 0, data, description);
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

  // ── Write: Create Proposal from Template ──────────────────────────────────
  // This is what your UI should call when a user fills out a proposal form

  const createProposalFromTemplate = async (
    trustForgeAddress,
    templateKey,      // e.g. "UPDATE_LOW_RISK_RATES"
    fieldValues,      // e.g. { baseRate: 300, maxRate: 800 }
    customDescription // optional override
  ) => {
    const template = PROPOSAL_TEMPLATES[templateKey];
    if (!template) throw new Error(`Unknown template: ${templateKey}`);

    const args = template.buildArgs(fieldValues);
    const description = customDescription || template.describe(fieldValues);

    return createProposal(trustForgeAddress, template.functionName, args, description);
  };

  // ── Write: Create Interest Rate Proposal (convenience wrapper) ────────────

  const proposeInterestRateChange = async (
    trustForgeAddress,
    pool,           // 0 = LOW, 1 = MED, 2 = HIGH
    baseRate,       // basis points (e.g. 300 = 3%)
    maxRate,        // basis points (e.g. 800 = 8%)
    description
  ) => {
    const templateKeys = ["UPDATE_LOW_RISK_RATES", "UPDATE_MED_RISK_RATES", "UPDATE_HIGH_RISK_RATES"];
    const templateKey = templateKeys[pool];
    if (!templateKey) throw new Error("Invalid pool index (0, 1, or 2)");

    return createProposalFromTemplate(
      trustForgeAddress,
      templateKey,
      { baseRate, maxRate },
      description
    );
  };

  // ── Write: Vote ────────────────────────────────────────────────────────────

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

  // ── Write: Execute Proposal ────────────────────────────────────────────────

  const executeProposal = async (proposalId) => {
    if (!dao) throw new Error("DAO not initialized");
    setLoading(true);
    setError(null);
    try {
      const tx = await dao.executeProposal(proposalId);
      await tx.wait();
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getProposalStatus = (proposal) => {
    if (!proposal) return "Unknown";
    const now = Math.floor(Date.now() / 1000);
    if (proposal.executed) return "Executed";
    if (now < proposal.endTime) return "Active";
    if (Number(proposal.yesVotes) > Number(proposal.noVotes)) return "Passed";
    return "Rejected";
  };

  const getTimeRemaining = (endTime) => {
    return Math.max(endTime - Math.floor(Date.now() / 1000), 0);
  };

  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return "Ended";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Decode calldata back to human-readable form for display
  const _decodeProposalData = (data) => {
    try {
      const iface = new Interface(TrustForgeABI.abi || TrustForgeABI);
      const decoded = iface.parseTransaction({ data });
      return {
        functionName: decoded.name,
        args: decoded.args,
      };
    } catch {
      return null;
    }
  };

  return (
    <DAOContext.Provider
      value={{
        // State
        dao,
        loading,
        error,
        proposalCount,
        proposals,

        // Read
        fetchProposalCount,
        getProposal,
        getAllProposals,
        getVotingPower,
        hasUserVoted,
        canCreateProposal,

        // Write
        createProposal,
        createProposalFromTemplate,
        proposeInterestRateChange,   // ← key new function
        vote,
        executeProposal,

        // UI helpers
        getProposalStatus,
        getTimeRemaining,
        formatTimeRemaining,
        PROPOSAL_TEMPLATES,
        DAO_ADDRESS,
      }}
    >
      {children}
    </DAOContext.Provider>
  );
};

export const useDAO = () => {
  const context = useContext(DAOContext);
  if (!context) throw new Error("useDAO must be used within DAOProvider");
  return context;
};
