import { useEffect, useState } from "react";
import { useDAO, PROPOSAL_TEMPLATES } from "../context/DAOContext";
import { useBlockchain } from "../context/BlockchainContext";
import ProposalCard from "../components/ProposalCard";
import CreateProposal from "../components/CreateProposal";
import Navbar from "../components/Navbar";
import {
  Users, Plus, Vote, ShieldCheck, LayoutGrid,
  Info, X, Activity, TrendingUp, CheckCircle, Clock,
} from "lucide-react";

const DAO = () => {
  const {
    dao, getAllProposals, fetchProposalCount,
    getVotingPower, canCreateProposal, loading,
  } = useDAO();

  const { account } = useBlockchain();

  const [proposals, setProposals]     = useState([]);
  const [votingPower, setVotingPower] = useState("0");
  const [canPropose, setCanPropose]   = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [filter, setFilter]           = useState("All");
  const [refreshing, setRefreshing]   = useState(false);

  const loadDAO = async () => {
    if (!dao) return;
    setRefreshing(true);
    try {
      await fetchProposalCount();
      const list = await getAllProposals();
      setProposals(list);
      if (account) {
        const power    = await getVotingPower(account);
        const eligible = await canCreateProposal(account);
        setVotingPower(power);
        setCanPropose(eligible);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDAO(); }, [account, dao]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const now         = Math.floor(Date.now() / 1000);
  const activeCount   = proposals.filter(p => !p.executed && now < p.endTime).length;
  const passedCount   = proposals.filter(p => !p.executed && now >= p.endTime && Number(p.yesVotes) > Number(p.noVotes)).length;
  const executedCount = proposals.filter(p => p.executed).length;

  const getStatus = (p) => {
    if (p.executed) return "Executed";
    if (now < p.endTime) return "Active";
    if (Number(p.yesVotes) > Number(p.noVotes)) return "Passed";
    return "Rejected";
  };

  const filtered = filter === "All"
    ? proposals
    : proposals.filter(p => getStatus(p) === filter);

  const filters = ["All", "Active", "Passed", "Executed", "Rejected"];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-inter text-white">

      {/* ── Background ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-float pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] animate-float-delayed pointer-events-none" />

      <Navbar />

      <main className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <div className="text-center mb-14 animate-fade-in-down">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 rounded-full mb-6">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Governance Module
            </span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
            TrustForge DAO
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Community-governed protocol parameters. Every interest rate, every borrowing limit — decided by TFX holders.
          </p>

          {/* Voting power + CTA */}
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up animation-delay-200">
            <div className="px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Vote className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Voting Power</p>
                <p className="text-xl font-black">{parseFloat(votingPower).toFixed(2)} <span className="text-blue-400">TFX</span></p>
              </div>
            </div>

            {canPropose ? (
              <button
                onClick={() => setShowCreate(true)}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold flex items-center gap-3 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-105 transition-all duration-300"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                Create Proposal
              </button>
            ) : (
              <div className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 text-gray-400">
                <ShieldCheck className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-semibold">Need 100 TFX to propose</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-fade-in-up animation-delay-200">
          {[
            { icon: Activity,     label: "Total",    value: proposals.length, color: "text-blue-400",   bg: "bg-blue-500/10"   },
            { icon: Clock,        label: "Active",   value: activeCount,      color: "text-yellow-400", bg: "bg-yellow-500/10" },
            { icon: TrendingUp,   label: "Passed",   value: passedCount,      color: "text-green-400",  bg: "bg-green-500/10"  },
            { icon: CheckCircle,  label: "Executed", value: executedCount,    color: "text-purple-400", bg: "bg-purple-500/10" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{label}</p>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Tabs ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <LayoutGrid className="w-5 h-5 text-gray-500 mr-1" />
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                filter === f
                  ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:border-blue-500/30"
              }`}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            <div className={`w-2 h-2 rounded-full ${refreshing ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
            {refreshing ? "Syncing..." : "Live on Chain"}
          </div>
        </div>

        {/* ── Proposals Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up animation-delay-400">
          {filtered.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white/5 border border-white/10 border-dashed rounded-3xl">
              <Info className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 font-light italic">
                {filter === "All"
                  ? "No governance proposals have been submitted yet."
                  : `No ${filter.toLowerCase()} proposals found.`}
              </p>
              {filter === "All" && canPropose && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-6 px-6 py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 text-sm font-bold hover:bg-blue-600/30 transition-colors"
                >
                  Create the first proposal
                </button>
              )}
            </div>
          ) : (
            filtered.map(proposal => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onActionComplete={loadDAO}
              />
            ))
          )}
        </div>
      </main>

      {/* ── Create Proposal Modal ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-6 backdrop-blur-sm bg-black/70 animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl my-8 animate-fade-in-up">
            <button
              onClick={() => setShowCreate(false)}
              className="absolute -top-3 -right-3 w-9 h-9 bg-white/10 border border-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4" />
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

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap");
        .font-inter { font-family: "Inter", system-ui, sans-serif; }
        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-gradient-x { animation: gradient-x 3s ease infinite; }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-fade-in-down { animation: fade-in-down 0.7s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.7s ease-out forwards; opacity: 0; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
};

export default DAO;