import { useEffect, useState } from "react";
import { useDAO } from "../context/DAOContext";
import { useBlockchain } from "../context/BlockchainContext";
import ProposalCard from "../components/ProposalCard";
import CreateProposal from "../components/CreateProposal";
import Navbar from "../components/Navbar";
import {
  Users,
  Plus,
  Vote,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Wifi,
  CheckCircle,
  LayoutGrid,
  Info,
} from "lucide-react";

const DAO = () => {
  const { dao, getAllProposals, fetchProposalCount, getVotingPower, loading } =
    useDAO();

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
  }, [account, dao]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-inter text-white">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] animate-float"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[120px] animate-float-delayed"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse-slow"></div>

      <Navbar />

      <main className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in-down">
          <div className="inline-block mb-8">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative px-6 py-3 bg-black ring-1 ring-white/10 rounded-full flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Governance Module
                </span>
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
              TrustForge DAO
            </span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed font-light">
            Empowering the community to govern protocol parameters and shape the
            future of TrustForge. Your voice, your vote, your protocol.
          </p>

          <div className="flex flex-wrap justify-center gap-6 animate-fade-in-up animation-delay-200">
            <div className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-4 group hover:border-blue-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Vote className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500 uppercase font-black tracking-widest">
                  Your Voting Power
                </p>
                <p className="text-2xl font-black text-white">
                  {votingPower} TFX
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold flex items-center gap-3 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              Create New Proposal
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            </button>
          </div>
        </div>

        {/* Proposals Grid */}
        <div className="animate-fade-in-up animation-delay-400">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <LayoutGrid className="w-6 h-6 text-gray-500" />
              Active Proposals
            </h3>
            <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-gray-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live on Chain
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {proposals.length === 0 ? (
              <div className="col-span-full py-24 text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl border-dashed">
                <Info className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-light italic">
                  No governance proposals have been submitted yet.
                </p>
              </div>
            ) : (
              proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onActionComplete={loadDAO}
                />
              ))
            )}
          </div>
        </div>

        {/* Create Proposal Modal Overlay */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-black/60 animate-fade-in">
            <div className="relative w-full max-w-2xl animate-fade-in-up">
              <button
                onClick={() => setShowCreate(false)}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white/10 border border-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
              <CreateProposal
                onCreated={() => {
                  setShowCreate(false);
                  loadDAO();
                }}
              />
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap");

        .font-inter {
          font-family:
            "Inter",
            system-ui,
            -apple-system,
            sans-serif;
        }

        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(99, 102, 241, 0.03) 1px,
              transparent 1px
            );
          background-size: 50px 50px;
        }

        @keyframes gradient-x {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(20px);
          }
        }

        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  );
};

export default DAO;
