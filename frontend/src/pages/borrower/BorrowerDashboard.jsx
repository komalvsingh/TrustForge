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
    getLoanHistory,
    loading,
  } = useBlockchain();

  const [profile, setProfile] = useState(null);
  const [loan, setLoan] = useState(null);
  const [maturity, setMaturity] = useState(null);
  const [history, setHistory] = useState([]);
  const [repayLoading, setRepayLoading] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  const poolMap = ["LOW", "MEDIUM", "HIGH"];
  const statusMap = ["ACTIVE", "REPAID", "DEFAULTED"];

  const loadData = async () => {
    try {
      const p = await getUserProfile();
      const l = await getActiveLoan();
      const m = await getWalletMaturity();
      const h = await getLoanHistory();

      setProfile(p);
      setLoan(l);
      setMaturity(m);
      setHistory(h);
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  useEffect(() => {
    if (account) loadData();
  }, [account, repayLoading]);

  const handleRequestLoan = async () => {
    const amt = parseFloat(loanAmount);
    const dur = parseInt(duration);

    if (isNaN(amt) || amt <= 0) return alert("Enter valid amount");
    if (isNaN(dur) || dur <= 0) return alert("Enter valid duration");

    try {
      setTxLoading(true);
      await requestLoan(amt.toString(), dur * 86400);
      alert("Loan Requested!");
      setLoanAmount("");
      setDuration("");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to request loan");
    } finally {
      setTxLoading(false);
    }
  };

  const handleRepay = async () => {
    try {
      setRepayLoading(true);

      await repayLoan(); // blockchain update

      // FORCE REFRESH
      const p = await getUserProfile();
      const l = await getActiveLoan();
      const m = await getWalletMaturity();
      const h = await getLoanHistory();

      setProfile(p);
      setLoan(l);
      setMaturity(m);
      setHistory(h);

      alert("Loan repaid successfully!");
    } catch (err) {
      console.error(err);
      alert("Repay failed");
    } finally {
      setRepayLoading(false);
    }
  };

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

  // Check if there's an active loan
  const isActiveLoan =
    loan &&
    loan.principal &&
    Number(loan.principal) > 0 &&
    Number(loan.status) === 0;

  return (
    <div className="p-6 space-y-6">
      <Navbar />
      <h2 className="text-2xl font-bold">Borrower Dashboard</h2>

      {/* PROFILE */}
      {profile && (
        <div className="border p-4 rounded space-y-2">
          <h3 className="font-semibold text-lg">Trust Profile</h3>
          <p>Username: {profile.username || "Not set"}</p>
          <p>Trust Score: {profile.trustScore}</p>
          <p>Maturity Level: {profile.maturityLevel}</p>
          <p>Assigned Pool: {poolMap[profile.assignedPool]}</p>
          <p>Max Borrow Limit: {profile.maxBorrowingLimit} TFX</p>
          <p>Total Loans: {profile.totalLoansTaken}</p>
          <p>Successful Repayments: {profile.successfulRepayments}</p>
          <p>Defaults: {profile.defaults}</p>
        </div>
      )}

      {/* WALLET MATURITY */}
      {maturity && (
        <div className="border p-4 rounded space-y-2">
          <h3 className="font-semibold text-lg">Wallet Maturity</h3>
          <p>Wallet Age: {(Number(maturity.age) / 86400).toFixed(2)} days</p>
          <p>Maturity Level: {maturity.maturityLevel}</p>
          <p>Maturity Multiplier: {maturity.maturityMultiplier}%</p>
        </div>
      )}

      {/* ACTIVE LOAN */}
      {isActiveLoan && (
        <div className="border p-4 rounded space-y-2">
          <h3 className="font-semibold text-lg">Active Loan</h3>
          <p>Principal: {loan.principal} TFX</p>
          <p>Interest: {loan.interestAmount} TFX</p>
          <p>Total Repayment: {loan.totalRepayment} TFX</p>
          <p>Status: {statusMap[loan.status]}</p>
          <p>Pool: {poolMap[loan.pool]}</p>
          <p>Duration: {(Number(loan.duration) / 86400).toFixed(0)} days</p>
          <p>
            Due: {new Date(Number(loan.dueDate) * 1000).toLocaleString()}
          </p>

          {loan.isOverdue && (
            <p className="text-red-600 font-bold">⚠ Overdue Loan!</p>
          )}

          <button
            onClick={handleRepay}
            disabled={repayLoading}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
          >
            {repayLoading ? "Repaying..." : "Repay Loan"}
          </button>
        </div>
      )}

      {/* REQUEST LOAN */}
      {profile && !profile.hasActiveLoan && (
        <div className="border p-4 rounded space-y-3">
          <h3 className="font-semibold text-lg">Request Loan</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Amount (TFX)
            </label>
            <input
              type="number"
              placeholder="Enter loan amount"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="border p-2 rounded w-full"
              step="0.01"
              min="0"
            />
            <p className="text-xs text-gray-600 mt-1">
              Max: {profile.maxBorrowingLimit} TFX
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Duration (days)
            </label>
            <input
              type="number"
              placeholder="Enter loan duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="border p-2 rounded w-full"
              min="1"
            />
            <p className="text-xs text-gray-600 mt-1">
              Min: 1 day, Max: 180 days
            </p>
          </div>

          <button
            onClick={handleRequestLoan}
            disabled={txLoading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {txLoading ? "Processing..." : "Request Loan"}
          </button>
        </div>
      )}

      {/* LOAN HISTORY */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold text-lg mb-3">Loan History</h3>
        {history.length === 0 ? (
          <p className="text-gray-500">No loan history yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Interest</th>
                  <th className="p-2 text-left">Total</th>
                  <th className="p-2 text-left">Pool</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Duration</th>
                  <th className="p-2 text-left">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2">{h.principal} TFX</td>
                    <td className="p-2">{h.interestAmount} TFX</td>
                    <td className="p-2">{h.totalRepayment} TFX</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          h.riskPool === 0
                            ? "bg-green-100 text-green-800"
                            : h.riskPool === 1
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {poolMap[h.riskPool]}
                      </span>
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          h.status === 1
                            ? "bg-green-100 text-green-800"
                            : h.status === 2
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {statusMap[h.status]}
                      </span>
                    </td>
                    <td className="p-2">
                      {(Number(h.duration) / 86400).toFixed(0)} days
                    </td>
                    <td className="p-2">
                      {new Date(Number(h.dueDate) * 1000).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BorrowerDashboard;