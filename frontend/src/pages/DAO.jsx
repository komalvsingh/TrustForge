import { useEffect, useState } from "react";
import { useDAO } from "../context/DAOContext";
import { useBlockchain } from "../context/BlockchainContext";
import ProposalCard from "../components/ProposalCard";
import CreateProposal from "../components/CreateProposal";

const DAO = () => {
  const {
    dao,
    getAllProposals,
    fetchProposalCount,
    getVotingPower,
    loading,
  } = useDAO();

  const { account } = useBlockchain();

  const [proposals, setProposals] = useState([]);
  const [votingPower, setVotingPower] = useState("0");
  const [showCreate, setShowCreate] = useState(false);

  const loadDAO = async () => {
    if (!dao) return;

    await fetchProposalCount();
    const list = await getAllProposals();
    setProposals(list);

    if (account) {
      const power = await getVotingPower();
      setVotingPower(power);
    }
  };

  useEffect(() => {
    loadDAO();
  }, [account, dao]); // re-run when wallet or DAO changes

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">TrustForge DAO</h1>
          <p className="text-gray-500">
            Govern protocol parameters using TFX tokens
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          Create Proposal
        </button>
      </div>

      {/* Voting Power */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <p className="text-sm text-gray-600">Your Voting Power</p>
        <p className="text-xl font-semibold">{votingPower} TFX</p>
      </div>

      {/* Proposals */}
      <div className="space-y-4">
        {proposals.length === 0 && (
          <p className="text-gray-500">No proposals yet</p>
        )}

        {proposals.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>

      {/* Create Proposal Modal */}
      {showCreate && (
        <CreateProposal
          onCreated={() => {
            setShowCreate(false);
            loadDAO(); // 🔥 refresh list after creation
          }}
        />
      )}
    </div>
  );
};

export default DAO;
