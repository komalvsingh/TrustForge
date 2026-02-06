import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { BlockchainProvider } from "./context/BlockchainContext";
import { DAOProvider } from "./context/DAOContext";
import DAO from "./pages/DAO"
import LenderDashboard from "./pages/Lender/LenderDashBoard";

import Home from "./pages/home";
import Dashboard from "./pages/Dashboard";
import Lend from "./pages/Lend";
import BorrowerDashboard from "./pages/borrower/BorrowerDashboard";
import { UserProvider } from "./context/usercontext";
import Register from "./components/register";
function App() {
  return (
    <BlockchainProvider>
      <UserProvider>
      <DAOProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dao" element={<DAO />} />
          <Route path="/lend" element={<Lend />} />
          <Route path="/borrow" element={< BorrowerDashboard />} />
          <Route  path="/lender" element={<LenderDashboard />} />
          <Route path="/register" element={< Register />} />
        </Routes>
      </Router>
      </DAOProvider>
      </UserProvider>
    </BlockchainProvider>
  );
}

export default App;
