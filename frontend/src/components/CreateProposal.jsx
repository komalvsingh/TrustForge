import { useState } from "react";
import { useDAO } from "../context/DAOContext";
import {
  FilePlus,
  ChevronDown,
  MessageSquare,
  Terminal,
  Zap,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

// 🔧 TrustForge address (same one DAO owns)
const TRUSTFORGE_ADDRESS = "0xYOUR_TRUSTFORGE_ADDRESS";

const CreateProposal = ({ onCreated }) => {
  const { createProposal, loading } = useDAO();

  const [description, setDescription] = useState("");
  const [action, setAction] = useState("pause");

  const submit = async () => {
    if (!description.trim()) return;

    try {
      if (action === "pause") {
        await createProposal(
          TRUSTFORGE_ADDRESS,
          "pause",
          [],
          description
        );
      }

      if (action === "unpause") {
        await createProposal(
          TRUSTFORGE_ADDRESS,
          "unpause",
          [],
          description
        );
      }

      setDescription("");
      onCreated();
    } catch (err) {
      console.error("Proposal creation failed:", err);
    }
  };

  return (
    <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <FilePlus className="w-16 h-16" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
            <Terminal className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Initialize Proposal</h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">On-chain Governance Action</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Action Selector */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">
              <Zap className="w-3 h-3 text-blue-400" />
              Select Protocol Action
            </label>
            <div className="relative group">
              <select
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white appearance-none cursor-pointer focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium pr-12 group-hover:bg-white/[0.08]"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="pause" className="bg-gray-900">Pause Protocol (Safety Break)</option>
                <option value="unpause" className="bg-gray-900">Unpause Protocol (Resume Operations)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within:text-blue-400 transition-colors">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">
              <MessageSquare className="w-3 h-3 text-blue-400" />
              Proposal Description
            </label>
            <textarea
              className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-light leading-relaxed resize-none hover:bg-white/[0.08]"
              placeholder="Provide a detailed rationale for this governance action. Why should the community support this?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-yellow-500/80 font-medium uppercase leading-tight tracking-wide">
              Warning: Submitted proposals require a majority consensus to execute. Ensure your description is clear and logical.
            </p>
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="group relative w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-white shadow-lg hover:shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                DEPLOY PROPOSAL
              </>
            )}
          </button>
        </div>
      </div>

      {/* Decorative Blur */}
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full"></div>
    </div>
  );
};

export default CreateProposal;
