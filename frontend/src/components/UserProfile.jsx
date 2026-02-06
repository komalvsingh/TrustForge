import { useEffect, useState } from "react";
import { useBlockchain } from "../context/BlockchainContext";
import Navbar from "./navbar";

const UserProfile = () => {
  const {
    account,
    connectWallet,
    getUserProfile,
    getWalletMaturity,
    getActiveLoan,
    getLoanHistory,
    loading,
  } = useBlockchain();

  const [profile, setProfile] = useState(null);
  const [maturity, setMaturity] = useState(null);
  const [loan, setLoan] = useState(null);
  const [history, setHistory] = useState([]);

  const loadProfile = async () => {
    try {
      const p = await getUserProfile();
      const m = await getWalletMaturity();
      const l = await getActiveLoan();
      const h = await getLoanHistory();

      setProfile(p);
      setMaturity(m);
      setLoan(l);
      setHistory(h || []);
    } catch (err) {
      console.error("Profile Load Error:", err);
    }
  };

  useEffect(() => {
    if (account) loadProfile();
  }, [account]);

  if (!account) {
    return (
      <div className="p-6">
        <button
          onClick={connectWallet}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Navbar />
      <h2 className="text-2xl font-bold">User Profile</h2>

      {loading && <p>Loading...</p>}

      {/* BASIC PROFILE */}
      {profile && (
        <div className="border p-4 rounded space-y-2">
          <h3 className="font-semibold text-lg">Profile Info</h3>
          <p>Wallet: {account}</p>
          <p>Username: {profile.username || "Not Set"}</p>
          <p>Trust Score: {profile.trustScore}</p>
          <p>Loans Taken: {profile.totalLoansTaken}</p>
          <p>Successful Repayments: {profile.successfulRepayments}</p>
          <p>Defaults: {profile.defaults}</p>
          <p>Max Borrow Limit: {profile.maxBorrowingLimit} TFX</p>
          <p>
            Assigned Pool:{" "}
            {["Low Risk", "Medium Risk", "High Risk"][profile.assignedPool]}
          </p>
        </div>
      )}

      {/* MATURITY */}
      {maturity && (
        <div className="border p-4 rounded">
          <h3 className="font-semibold text-lg">Wallet Maturity</h3>
          <p>Level: {maturity.maturityLevel}</p>
          <p>Multiplier: {maturity.maturityMultiplier}%</p>
        </div>
      )}

      {/* ACTIVE LOAN */}
      {loan && loan.principal !== "0.0" && (
        <div className="border p-4 rounded space-y-1">
          <h3 className="font-semibold text-lg">Active Loan</h3>
          <p>Principal: {loan.principal} TFX</p>
          <p>Interest: {loan.interestAmount} TFX</p>
          <p>Total Repayment: {loan.totalRepayment} TFX</p>
          <p>Status: {["ACTIVE", "REPAID", "DEFAULTED"][loan.status]}</p>
          <p>
            Due Date:{" "}
            {new Date(Number(loan.dueDate) * 1000).toLocaleString()}
          </p>
        </div>
      )}

      {/* LOAN HISTORY */}
      {history.length > 0 && (
        <div className="border p-4 rounded">
          <h3 className="font-semibold text-lg">Loan History</h3>
          {history.map((h, i) => (
            <div key={i} className="border p-2 mt-2 rounded">
              <p>Principal: {h.principal} TFX</p>
              <p>Status: {["ACTIVE", "REPAID", "DEFAULTED"][h.status]}</p>
              <p>
                Start:{" "}
                {new Date(Number(h.startTime) * 1000).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserProfile;
