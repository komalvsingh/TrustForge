import { useState } from "react";
import { useDAO, PROPOSAL_TEMPLATES } from "../context/DAOContext";
import {
  Terminal, Zap, MessageSquare, ShieldCheck,
  AlertTriangle, TrendingUp, Settings, Lock,
  Unlock, DollarSign, ChevronDown, Info,
} from "lucide-react";

const TRUSTFORGE_ADDRESS = "0x2caB839bB17CeB77c09d0EdE66E5349Cd2130c18";

// ── Category grouping for the UI ───────────────────────────────────────────
const CATEGORIES = [
  {
    id: "interest",
    label: "Interest Rates",
    icon: TrendingUp,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    glow: "rgba(59,130,246,0.15)",
    templates: ["UPDATE_LOW_RISK_RATES", "UPDATE_MED_RISK_RATES", "UPDATE_HIGH_RISK_RATES"],
    description: "Change lending pool interest rates",
  },
  {
    id: "trust",
    label: "Trust Parameters",
    icon: Settings,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    glow: "rgba(168,85,247,0.15)",
    templates: ["UPDATE_TRUST_PARAMS"],
    description: "Adjust trust score mechanics",
  },
  {
    id: "limits",
    label: "Borrowing Limits",
    icon: DollarSign,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    glow: "rgba(34,197,94,0.15)",
    templates: ["UPDATE_BORROWING_LIMITS"],
    description: "Change max borrowing per trust tier",
  },
  {
    id: "emergency",
    label: "Emergency",
    icon: Lock,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    glow: "rgba(239,68,68,0.15)",
    templates: ["PAUSE_PROTOCOL", "UNPAUSE_PROTOCOL"],
    description: "Pause or resume all protocol operations",
  },
];

// ── Pool labels for interest rate display ─────────────────────────────────
const POOL_META = {
  UPDATE_LOW_RISK_RATES:  { pool: "Low Risk",    range: "Typical: Base 300, Max 800",  color: "text-green-400"  },
  UPDATE_MED_RISK_RATES:  { pool: "Medium Risk", range: "Typical: Base 700, Max 1500", color: "text-yellow-400" },
  UPDATE_HIGH_RISK_RATES: { pool: "High Risk",   range: "Typical: Base 1200, Max 2500",color: "text-red-400"    },
};

const InputField = ({ label, name, value, onChange, placeholder, hint, type = "number" }) => (
  <div>
    <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-1.5">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(name, e.target.value)}
      placeholder={placeholder}
      className="w-full bg-black/40 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder-gray-600"
    />
    {hint && (
      <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
        <Info className="w-3 h-3" /> {hint}
      </p>
    )}
  </div>
);

const CreateProposal = ({ onCreated }) => {
  const { createProposalFromTemplate, getVotingPower, loading } = useDAO();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [fields, setFields]     = useState({});
  const [description, setDesc]  = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);

  const template = selectedTemplate ? PROPOSAL_TEMPLATES[selectedTemplate] : null;

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setSelectedTemplate(null);
    setFields({});
    setError("");
  };

  const handleTemplateSelect = (key) => {
    setSelectedTemplate(key);
    setFields({});
    setError("");
    // Auto-fill description
    const t = PROPOSAL_TEMPLATES[key];
    if (t.argFields.length === 0) {
      setDesc(t.describe({}));
    } else {
      setDesc("");
    }
  };

  const handleFieldChange = (name, value) => {
    const updated = { ...fields, [name]: value };
    setFields(updated);
    // Auto-update description as user types
    if (template && template.argFields.length > 0) {
      try {
        setDesc(template.describe(updated));
      } catch {}
    }
  };

  const validate = () => {
    if (!selectedTemplate) return "Please select a proposal type";
    if (!description.trim()) return "Description is required";
    if (template) {
      for (const f of template.argFields) {
        if (!fields[f.name] && fields[f.name] !== 0) return `${f.label} is required`;
        const v = Number(fields[f.name]);
        if (isNaN(v) || v < 0) return `${f.label} must be a valid positive number`;
      }
      // Interest rate validation
      if (selectedTemplate.includes("RISK_RATES")) {
        const base = Number(fields.baseRate);
        const max  = Number(fields.maxRate);
        if (base >= max) return "Base rate must be less than max rate";
        if (max > 5000) return "Max rate cannot exceed 5000 bps (50%)";
      }
      // Borrowing limits validation
      if (selectedTemplate === "UPDATE_BORROWING_LIMITS") {
        const low = Number(fields.lowTrust);
        const med = Number(fields.medTrust);
        const hi  = Number(fields.highTrust);
        if (!(low < med && med < hi)) return "Limits must be in ascending order (Low < Med < High)";
      }
    }
    return null;
  };

  const submit = async () => {
    setError("");
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    const power = await getVotingPower();
    if (Number(power) < 100) {
      setError("You need at least 100 TFX to create a proposal");
      return;
    }

    try {
      await createProposalFromTemplate(TRUSTFORGE_ADDRESS, selectedTemplate, fields, description);
      setSuccess(true);
      setTimeout(() => { onCreated(); }, 1500);
    } catch (err) {
      console.error(err);
      setError(err?.reason || err?.message || "Transaction failed. Check your wallet.");
    }
  };

  if (success) {
    return (
      <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-green-500/30 rounded-3xl p-12 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-2xl font-black text-white mb-2">Proposal Created!</h3>
        <p className="text-gray-400 text-sm">Your proposal is now live on-chain. Community voting has begun.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
          <Terminal className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Create Proposal</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Executable DAO Action</p>
        </div>
      </div>

      {/* Step 1: Category */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-black">1</span>
          Choose Category
        </p>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const selected = selectedCategory?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat)}
                className={`relative p-4 rounded-2xl border text-left transition-all duration-200 group ${
                  selected
                    ? `${cat.bg} ${cat.border} border`
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
                style={selected ? { boxShadow: `0 0 20px ${cat.glow}` } : {}}
              >
                <Icon className={`w-5 h-5 mb-2 ${selected ? cat.color : "text-gray-500"}`} />
                <p className={`text-sm font-bold ${selected ? "text-white" : "text-gray-400"}`}>{cat.label}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{cat.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Template */}
      {selectedCategory && (
        <div className="mb-6 animate-fade-in">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-black">2</span>
            Select Action
          </p>
          <div className="space-y-2">
            {selectedCategory.templates.map(key => {
              const t = PROPOSAL_TEMPLATES[key];
              const meta = POOL_META[key];
              const isSelected = selectedTemplate === key;
              return (
                <button
                  key={key}
                  onClick={() => handleTemplateSelect(key)}
                  className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                    isSelected
                      ? "bg-blue-600/20 border-blue-500/40"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-bold ${isSelected ? "text-white" : "text-gray-300"}`}>{t.label}</p>
                      {meta && (
                        <p className={`text-[10px] mt-0.5 ${meta.color}`}>{meta.range}</p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Parameters */}
      {template && template.argFields.length > 0 && (
        <div className="mb-6 animate-fade-in">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-black">3</span>
            Set Parameters
          </p>

          {/* Interest rate helper box */}
          {selectedTemplate?.includes("RISK_RATES") && (
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-xs font-bold text-blue-400 mb-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Interest Rate Guide
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Rates are in <strong className="text-white">basis points</strong>. 100 bps = 1%.
                <br />
                Example: Base = 300 (3%), Max = 800 (8%).
                <br />
                These are <strong className="text-white">annual rates</strong> — the contract prorates by loan duration.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                {[
                  { label: "Conservative", base: 300, max: 800 },
                  { label: "Current",      base: 700, max: 1500 },
                  { label: "Aggressive",   base: 1200,max: 2500 },
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      handleFieldChange("baseRate", preset.base);
                      handleFieldChange("maxRate",  preset.max);
                    }}
                    className="p-2 bg-black/30 border border-white/10 rounded-lg hover:border-blue-500/30 transition-colors text-center"
                  >
                    <p className="font-bold text-gray-300">{preset.label}</p>
                    <p className="text-gray-500">{preset.base}–{preset.max}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Borrowing limits helper */}
          {selectedTemplate === "UPDATE_BORROWING_LIMITS" && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-xs font-bold text-green-400 mb-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Borrowing Limits Guide
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Enter values in <strong className="text-white">ETH</strong>. Limits must be ascending (Low &lt; Med &lt; High).
                <br />
                Current defaults: Low = 1 ETH, Med = 5 ETH, High = 20 ETH.
              </p>
            </div>
          )}

          {/* Trust params helper */}
          {selectedTemplate === "UPDATE_TRUST_PARAMS" && (
            <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <p className="text-xs font-bold text-purple-400 mb-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Trust Parameters Guide
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <strong className="text-white">Increase per repayment</strong>: 1–100 (default: 50)<br />
                <strong className="text-white">Decrease on default</strong>: 1–500 (default: 200)<br />
                <strong className="text-white">Vouch penalty</strong>: 1–100 (default: 30)
              </p>
            </div>
          )}

          <div className="space-y-4">
            {template.argFields.map(f => (
              <InputField
                key={f.name}
                label={f.label}
                name={f.name}
                value={fields[f.name] || ""}
                onChange={handleFieldChange}
                placeholder={f.placeholder || ""}
                hint={f.hint}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Description */}
      {selectedTemplate && (
        <div className="mb-6 animate-fade-in">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-black">
              {template?.argFields.length > 0 ? "4" : "3"}
            </span>
            Proposal Description
          </p>
          <textarea
            className="w-full h-28 bg-black/40 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder-gray-600 resize-none"
            placeholder="Describe why this change benefits the protocol..."
            value={description}
            onChange={e => setDesc(e.target.value)}
          />
          <p className="text-[10px] text-gray-600 mt-1">
            This description is stored on-chain with the proposal.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={loading || !selectedTemplate}
        className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-2xl font-black text-white flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.01]"
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

      {/* Requirement note */}
      <p className="text-center text-[10px] text-gray-600 mt-3">
        Requires 100 TFX • 6 hour voting window • Yes votes must exceed No votes to pass
      </p>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CreateProposal;