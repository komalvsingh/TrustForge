import { useEffect, useState } from "react";
import { useBlockchain } from "../../context/BlockchainContext";
import Navbar from "../../components/navbar";

const BorrowerDashboard = () => {
  const {
    account,
    connectWallet,
    getUserProfile,
    getActiveLoan,
    getWalletMaturity,
    requestLoan,
    repayLoan,
    loading,
  } = useBlockchain();

  const [loanAmount, setLoanAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [repayLoading, setRepayLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  const [profile, setProfile] = useState(null);
  const [loan, setLoan] = useState(null);
  const [maturity, setMaturity] = useState(null);

  const statusMap = ["ACTIVE", "REPAID", "DEFAULTED"];

  const loadData = async () => {
    try {
      const p = await getUserProfile();
      const l = await getActiveLoan();
      const m = await getWalletMaturity();

      setProfile(p);
      setLoan(l);
      setMaturity(m);
    } catch (err) {
      console.error("Error loading borrower data:", err);
    }
  };

  const handleRequestLoan = async () => {
    const amt = parseFloat(loanAmount);
    const dur = parseInt(duration);

    if (isNaN(amt) || amt <= 0) {
      alert("Enter valid amount");
      return;
    }

    if (isNaN(dur) || dur <= 0) {
      alert("Enter valid duration (days)");
      return;
    }

    try {
      setTxLoading(true);
      const durationSeconds = dur * 86400;

      await requestLoan(amt.toString(), durationSeconds);

      alert("Loan requested successfully!");
      setLoanAmount("");
      setDuration("");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Transaction failed");
    } finally {
      setTxLoading(false);
    }
  };

  const handleRepayLoan = async () => {
    try {
      setRepayLoading(true);
      await repayLoan();
      alert("Loan repaid successfully!");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Repayment failed");
    } finally {
      setRepayLoading(false);
    }
  };

  useEffect(() => {
    if (account) loadData();
  }, [account]);

  if (!account) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold">Borrower Dashboard</h2>
        <button
          onClick={connectWallet}
          className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const isActiveLoan = loan && loan.status === 0;

  return (
    <div className="p-6 space-y-6">
      <Navbar />
      <h2 className="text-2xl font-bold">Borrower Dashboard</h2>

      {loading && <p>Loading...</p>}

      {profile && (
        <div className="border p-4 rounded">
          <h3 className="font-semibold text-lg">Trust Profile</h3>
          <p>Trust Score: {profile.trustScore}</p>
          <p>Repayments: {profile.successfulRepayments}</p>
          <p>Defaults: {profile.defaults}</p>
          <p>Max Borrow Limit: {profile.maxBorrowingLimit} TFX</p>
        </div>
      )}

      {maturity && (
        <div className="border p-4 rounded">
          <h3 className="font-semibold text-lg">Wallet Maturity</h3>
          <p>Level: {maturity.maturityLevel}</p>
          <p>Multiplier: {maturity.maturityMultiplier}%</p>
        </div>
      )}

      {/* LOAN STATUS */}
      {loan ? (
        <div className="border p-4 rounded space-y-2">
          <h3 className="font-semibold text-lg">Loan Info</h3>
          <p>Principal: {loan.principal} TFX</p>
          <p>Interest: {loan.interestAmount} TFX</p>
          <p>Total Repayment: {loan.totalRepayment} TFX</p>
          <p>Status: {statusMap[loan.status]}</p>
          <p>
            Due Date:{" "}
            {new Date(Number(loan.dueDate) * 1000).toLocaleString()}
          </p>

          {isActiveLoan && (
            <button
              onClick={handleRepayLoan}
              disabled={repayLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded mt-3"
            >
              {repayLoading ? "Repaying..." : "Repay Loan"}
            </button>
          )}
        </div>
      ) : (
        <div className="border p-4 rounded">
          <p>No loan history</p>
        </div>
      )}

      {/* REQUEST LOAN */}
      {profile && !profile.hasActiveLoan && (
        <div className="border p-4 rounded space-y-3">
          <h3 className="font-semibold text-lg">Request Loan</h3>

          <input
            type="number"
            placeholder="Enter amount in TFX"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            className="border p-2 rounded w-full"
          />

          <input
            type="number"
            placeholder="Duration in days"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="border p-2 rounded w-full"
          />

          <p className="text-sm text-gray-600">
            Max Allowed: {profile.maxBorrowingLimit} TFX
          </p>

          <button
            onClick={handleRequestLoan}
            disabled={txLoading}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {txLoading ? "Processing..." : "Request Loan"}
          </button>
        </div>
      )}
    </div>
  );
};

export default BorrowerDashboard;
