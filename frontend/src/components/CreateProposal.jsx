import { useState } from "react";
import { useDAO } from "../context/DAOContext";
import {
  FilePlus,
  ChevronDown,
  MessageSquare,
  Terminal,
  Zap,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

// ✅ MUST be the TrustForge address owned by the DAO
const TRUSTFORGE_ADDRESS = "0x2caB839bB17CeB77c09d0EdE66E5349Cd2130c18";

// Whitelisted actions (ABI-safe)
const ACTIONS = {
  pause: {
    label: "Pause Protocol (Emergency)",
    fn: "pause",
    args: [],
  },
  unpause: {
    label: "Unpause Protocol (Resume)",
    fn: "unpause",
    args: [],
  },
};

const CreateProposal = ({ onCreated }) => {
  const { createProposal, getVotingPower, loading } = useDAO();

  const [description, setDescription] = useState("");
  const [actionKey, setActionKey] = useState("pause");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    if (!TRUSTFORGE_ADDRESS || TRUSTFORGE_ADDRESS.startsWith("0xYOUR")) {
      setError("Invalid TrustForge address configured");
      return;
    }

    // 🔐 Enforce contract requirement
    const votingPower = await getVotingPower();
    if (Number(votingPower) < 100) {
      setError("You need at least 100 TFX to create a proposal");
      return;
    }

    const action = ACTIONS[actionKey];

    try {
      await createProposal(
        TRUSTFORGE_ADDRESS,
        action.fn,
        action.args,
        description
      );

      setDescription("");
      onCreated();
    } catch (err) {
      console.error(err);
      setError("Transaction failed. Check console / wallet.");
    }
  };

  return (
    <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
          <Terminal className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Create Proposal</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            Executable DAO Action
          </p>
        </div>
      </div>

      {/* Action */}
      <label className="text-xs text-gray-400 uppercase mb-2 flex items-center gap-2">
        <Zap className="w-3 h-3" /> Protocol Action
      </label>

      <select
        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white mb-6"
        value={actionKey}
        onChange={(e) => setActionKey(e.target.value)}
      >
        {Object.entries(ACTIONS).map(([key, a]) => (
          <option key={key} value={key} className="bg-gray-900">
            {a.label}
          </option>
        ))}
      </select>

      {/* Description */}
      <label className="text-xs text-gray-400 uppercase mb-2 flex items-center gap-2">
        <MessageSquare className="w-3 h-3" /> Description
      </label>

      <textarea
        className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white mb-4"
        placeholder="Why should this proposal be executed?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {error && (
        <div className="mb-4 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-white flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <ShieldCheck className="w-5 h-5" />
            CREATE PROPOSAL
          </>
        )}
      </button>
    </div>
  );
};

export default CreateProposal;
