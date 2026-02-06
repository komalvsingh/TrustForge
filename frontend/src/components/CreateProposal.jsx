import { useState } from "react";
import { useDAO } from "../context/DAOContext";

const CreateProposal = ({ onCreated }) => {
  const { createProposal, loading } = useDAO();
  const [description, setDescription] = useState("");

  const submit = async () => {
    if (!description.trim()) return;

    await createProposal(description);
    setDescription("");
    onCreated();
  };

  return (
    <div className="border rounded-lg p-5 bg-white">
      <h2 className="font-semibold mb-2">Create Proposal</h2>

      <textarea
        className="w-full border rounded p-2 text-sm"
        placeholder="Describe the proposal..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button
        onClick={submit}
        disabled={loading}
        className="mt-3 px-4 py-2 bg-black text-white rounded"
      >
        {loading ? "Submitting..." : "Submit Proposal"}
      </button>
    </div>
  );
};

export default CreateProposal;
