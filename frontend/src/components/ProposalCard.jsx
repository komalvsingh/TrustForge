import { useDAO } from "../context/DAOContext";

const ProposalCard = ({ proposal }) => {
  const {
    vote,
    executeProposal,
    getProposalStatus,
    getTimeRemaining,
    loading,
  } = useDAO();

  const status = getProposalStatus(proposal);
  const timeLeft = getTimeRemaining(proposal.endTime);

  const canVote = status === "Active";
  const canExecute = status === "Passed" && !proposal.executed;

  const handleVote = async (support) => {
    try {
      await vote(proposal.id, support);
    } catch (err) {
      console.error("Voting failed:", err);
    }
  };

  const handleExecute = async () => {
    try {
      await executeProposal(proposal.id);
    } catch (err) {
      console.error("Execution failed:", err);
    }
  };

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      {/* Header */}
      <div className="flex justify-between mb-2">
        <h3 className="font-semibold">Proposal #{proposal.id}</h3>
        <span
          className={`text-sm px-2 py-1 rounded ${
            status === "Active"
              ? "bg-yellow-100 text-yellow-800"
              : status === "Passed"
              ? "bg-green-100 text-green-800"
              : status === "Rejected"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {status}
        </span>
      </div>

      {/* Proposal Target */}
      <p className="text-xs text-gray-500 mb-2 break-all">
        Target: {proposal.target}
      </p>

      {/* Vote Stats */}
      <div className="flex gap-8 text-sm mb-4">
        <div>
          <p className="text-gray-500">Yes</p>
          <p className="font-semibold">{proposal.yesVotes} TFX</p>
        </div>

        <div>
          <p className="text-gray-500">No</p>
          <p className="font-semibold">{proposal.noVotes} TFX</p>
        </div>

        <div>
          <p className="text-gray-500">Ends In</p>
          <p className="font-semibold">
            {status === "Active"
              ? `${Math.floor(timeLeft / 60)} min`
              : "Ended"}
          </p>
        </div>
      </div>

      {/* Voting */}
      {canVote && (
        <div className="flex gap-3">
          <button
            disabled={loading}
            onClick={() => handleVote(true)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm"
          >
            Vote Yes
          </button>

          <button
            disabled={loading}
            onClick={() => handleVote(false)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm"
          >
            Vote No
          </button>
        </div>
      )}

      {/* Execute */}
      {canExecute && (
        <button
          disabled={loading}
          onClick={handleExecute}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
        >
          Execute Proposal
        </button>
      )}

      {!canVote && !canExecute && (
        <p className="text-xs text-gray-500 mt-2">
          No actions available
        </p>
      )}
    </div>
  );
};

export default ProposalCard;
