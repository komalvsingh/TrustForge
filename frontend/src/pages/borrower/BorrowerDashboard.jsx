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
  const [repayLoading, setRepayLoading]=useState(false)
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
      alert("Failed");
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

    setProfile(p);
    setLoan(l);
    setMaturity(m);

    alert("Loan repaid!");
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

const isActiveLoan =
  loan &&
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
          <p>Username: {profile.username}</p>
          <p>Trust Score: {profile.trustScore}</p>
          <p>Maturity Level: {profile.maturityLevel}</p>
          <p>Assigned Pool: {poolMap[profile.assignedPool]}</p>
          <p>Max Borrow Limit: {profile.maxBorrowingLimit} TFX</p>
        </div>
      )}

      {/* ACTIVE LOAN */}
      {loan && Number(loan.principal) > 0 && Number(loan.status) === 0 && (
  <div className="border p-4 rounded">
          <h3 className="font-semibold text-lg">Active Loan</h3>
          <p>Principal: {loan.principal} TFX</p>
          <p>Interest: {loan.interestAmount} TFX</p>
          <p>Total Repayment: {loan.totalRepayment} TFX</p>
          <p>Status: {statusMap[loan.status]}</p>
          <p>Pool: {poolMap[loan.pool]}</p>
          <p>
            Due: {new Date(Number(loan.dueDate) * 1000).toLocaleString()}
          </p>

          {isActiveLoan && loan.isOverdue && (
  <p className="text-red-600 font-bold">⚠ Overdue Loan!</p>
)}

          {isActiveLoan && (
            <div>
            <button
              onClick={handleRepay}
              className="bg-purple-600 text-white px-4 py-2 rounded"
            >
              {txLoading ? "Repaying..." : "Repay Loan"}
            </button>
          </div>
          )}
        </div>
      )}

      {/* REQUEST LOAN */}
      {profile && !profile.hasActiveLoan && (
        <div className="border p-4 rounded space-y-3">
          <h3 className="font-semibold text-lg">Request Loan</h3>

          <input
            type="number"
            placeholder="Amount TFX"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            className="border p-2 rounded w-full"
          />

          <input
            type="number"
            placeholder="Duration (days)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="border p-2 rounded w-full"
          />

          <button
            onClick={handleRequestLoan}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {txLoading ? "Processing..." : "Request Loan"}
          </button>
        </div>
      )}

      {/* LOAN HISTORY */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold text-lg">Loan History</h3>
        {history.length === 0 ? (
          <p>No History</p>
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="border-b">
                <th>Amount</th>
                <th>Interest</th>
                <th>Pool</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-b">
                  <td>{h.principal}</td>
                  <td>{h.interestAmount}</td>
                  <td>{poolMap[h.riskPool]}</td>
                  <td>{statusMap[h.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BorrowerDashboard;
