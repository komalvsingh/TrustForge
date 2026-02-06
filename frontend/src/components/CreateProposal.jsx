import { useState } from "react";
import { useDAO } from "../context/DAOContext";

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
    <div className="border rounded-lg p-5 bg-white">
      <h2 className="font-semibold mb-3">Create Proposal</h2>

      {/* Action Selector */}
      <select
        className="w-full border rounded p-2 text-sm mb-3"
        value={action}
        onChange={(e) => setAction(e.target.value)}
      >
        <option value="pause">Pause Protocol</option>
        <option value="unpause">Unpause Protocol</option>
      </select>

      {/* Description */}
      <textarea
        className="w-full border rounded p-2 text-sm"
        placeholder="Explain why this proposal should pass..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button
        onClick={submit}
        disabled={loading}
        className="mt-3 px-4 py-2 bg-black text-white rounded w-full"
      >
        {loading ? "Submitting..." : "Submit Proposal"}
      </button>
    </div>
  );
};

export default CreateProposal;
