import { useDAO } from "../context/DAOContext";
import TrustForgeABI from "../abis/TrustForge.json";
import { Interface } from "ethers";
import {
  Vote,
  Clock,
  ExternalLink,
  CheckCircle,
  XCircle,
  Play,
  TrendingUp,
} from "lucide-react";
const trustForgeInterface = new Interface(TrustForgeABI.abi);

const decodeProposalAction = (proposal) => {
  try {
    const decoded = trustForgeInterface.parseTransaction({
      data: proposal.data,
    });

    return {
      name: decoded.name,
      args: decoded.args,
    };
  } catch {
    return null; // unknown / non-TrustForge call
  }
};

const ProposalCard = ({ proposal, onActionComplete }) => {
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
  const decodedAction = decodeProposalAction(proposal);

  const handleVote = async (support) => {
    try {
      await vote(proposal.id, support);
      onActionComplete?.();
    } catch (err) {
      console.error("Voting failed:", err);
    }
  };

  const handleExecute = async () => {
    try {
      await executeProposal(proposal.id);
      onActionComplete?.();
    } catch (err) {
      console.error("Execution failed:", err);
    }
  };

  const getStatusStyle = () => {
    switch (status) {
      case "Active":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
      case "Passed":
        return "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
      case "Rejected":
        return "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-blue-500/30 transition-all duration-500 flex flex-col h-full hover:scale-[1.02] hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>

      <div className="relative flex-1">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center font-black text-blue-400 border border-blue-500/20">
              #{proposal.id}
            </div>
            <div>
              <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                Governance Proposal
              </h3>
              <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Target: {proposal.target.slice(0, 6)}...
                {proposal.target.slice(-4)}
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${getStatusStyle()}`}
          >
            {status}
          </span>
        </div>

        {/* Description/Action */}
        <div className="mb-8 p-4 bg-black/30 rounded-2xl border border-white/5 space-y-2">
          {decodedAction ? (
            <>
              <p className="text-[10px] uppercase tracking-widest font-black text-blue-400">
                On-chain Action
              </p>

              <p className="text-sm font-semibold text-white">
                {decodedAction.name === "pause" &&
                  "Pause the TrustForge protocol"}
                {decodedAction.name === "unpause" &&
                  "Unpause the TrustForge protocol"}
                {!["pause", "unpause"].includes(decodedAction.name) &&
                  `Execute ${decodedAction.name}()`}
              </p>

              <p className="text-xs text-gray-400 italic">
                {proposal.description}
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-widest font-black text-gray-500">
                Unknown Action
              </p>
              <p className="text-sm text-gray-400 italic">
                {proposal.description}
              </p>
            </>
          )}
        </div>

        {/* Voting Progress */}
        <div className="space-y-6 mb-8">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-400">Yes Votes</span>
            </div>
            <span className="font-black text-green-400">
              {proposal.yesVotes} TFX
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-400">No Votes</span>
            </div>
            <span className="font-black text-red-400">
              {proposal.noVotes} TFX
            </span>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between pt-6 border-t border-white/5 text-gray-500 mb-8">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-tighter">
              {status === "Active"
                ? `${Math.floor(timeLeft / 60)}m Remaining`
                : "Round Concluded"}
            </span>
          </div>
          <TrendingUp className="w-4 h-4 opacity-50" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative mt-auto">
        {canVote && (
          <div className="grid grid-cols-2 gap-4">
            <button
              disabled={loading}
              onClick={() => handleVote(true)}
              className="flex items-center justify-center gap-2 group/btn py-3.5 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 font-black text-xs hover:bg-green-500/20 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all duration-300"
            >
              <CheckCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              UPVOTE
            </button>

            <button
              disabled={loading}
              onClick={() => handleVote(false)}
              className="flex items-center justify-center gap-2 group/btn py-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 font-black text-xs hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all duration-300"
            >
              <XCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              DOWNVOTE
            </button>
          </div>
        )}

        {canExecute && (
          <button
            disabled={loading}
            onClick={handleExecute}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-blue-600 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all duration-300 transform hover:scale-[1.02]"
          >
            <Play className="w-5 h-5 fill-current" />
            EXECUTE ON-CHAIN
          </button>
        )}

        {!canVote && !canExecute && (
          <div className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-center text-xs font-bold text-gray-500 tracking-widest uppercase">
            {proposal.executed ? "Executed & Finalized" : "Closed for Voting"}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
    </div>
  );
};

export default ProposalCard;
