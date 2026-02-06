import { createContext, useContext, useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { useBlockchain } from "./BlockchainContext";

// DAO ABI
import TrustForgeDAOABI from "../abis/TrustForgeDAO.json";

// DAO address (your deployed DAO)
const DAO_ADDRESS = "0x30094799c55bf1194D046DBe0D9CDef41a6eC076";

const DAOContext = createContext();

export const DAOProvider = ({ children }) => {
  const { provider, signer, account, tfx } = useBlockchain();

  const [dao, setDao] = useState(null);
  const [proposalCount, setProposalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /* =========================================================
     INIT DAO CONTRACT
     ========================================================= */

  useEffect(() => {
    if (!signer) {
      setDao(null);
      return;
    }

    const daoABI = TrustForgeDAOABI.abi || TrustForgeDAOABI;
    const daoContract = new Contract(DAO_ADDRESS, daoABI, signer);
    setDao(daoContract);
  }, [signer]);

  /* =========================================================
     READ FUNCTIONS (UI SAFE)
     ========================================================= */

  const fetchProposalCount = async () => {
    if (!dao) return 0;
    const count = await dao.proposalCount();
    setProposalCount(Number(count));
    return Number(count);
  };

  const getProposal = async (proposalId) => {
    if (!dao) return null;

    const proposal = await dao.getProposal(proposalId);

    return {
      id: proposalId,
      description: proposal[0],
      yesVotes: formatEther(proposal[1]),
      noVotes: formatEther(proposal[2]),
      endTime: Number(proposal[3]),
      executed: proposal[4],
    };
  };

  const getAllProposals = async () => {
    if (!dao) return [];

    const count = Number(await dao.proposalCount());
    const proposals = [];

    for (let i = 1; i <= count; i++) {
      try {
        const p = await getProposal(i);
        if (p) proposals.push(p);
      } catch (err) {
        console.error("Failed to load proposal", i, err);
      }
    }

    return proposals;
  };

  const getVotingPower = async (address) => {
    if (!tfx) return "0";
    const user = address || account;
    const balance = await tfx.balanceOf(user);
    return formatEther(balance);
  };

  /* =========================================================
     WRITE (GOVERNANCE ONLY)
     ========================================================= */

  const createProposal = async (description) => {
    if (!dao) throw new Error("DAO not initialized");

    setLoading(true);
    try {
      const tx = await dao.createProposal(description);
      await tx.wait();
      return tx;
    } finally {
      setLoading(false);
    }
  };

  const vote = async (proposalId, support) => {
    if (!dao) throw new Error("DAO not initialized");

    setLoading(true);
    try {
      const tx = await dao.vote(proposalId, support);
      await tx.wait();
      return tx;
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     UI HELPERS
     ========================================================= */

  const getProposalStatus = (proposal) => {
    if (!proposal) return "Unknown";

    const now = Math.floor(Date.now() / 1000);

    if (proposal.executed) return "Executed";
    if (now < proposal.endTime) return "Active";
    if (Number(proposal.yesVotes) > Number(proposal.noVotes)) return "Passed";
    return "Rejected";
  };

  const getTimeRemaining = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = endTime - now;
    return diff > 0 ? diff : 0;
  };

  return (
    <DAOContext.Provider
      value={{
        dao,
        loading,
        proposalCount,
        fetchProposalCount,
        getProposal,
        getAllProposals,
        getVotingPower,
        createProposal,
        vote,
        getProposalStatus,
        getTimeRemaining,
        DAO_ADDRESS,
      }}
    >
      {children}
    </DAOContext.Provider>
  );
};

export const useDAO = () => {
  const context = useContext(DAOContext);
  if (!context) {
    throw new Error("useDAO must be used within DAOProvider");
  }
  return context;
};
