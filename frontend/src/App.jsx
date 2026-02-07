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
import UserProfile from "./components/UserProfile";
import VouchingSystem from "./pages/VouchingSystem";
import { VaultProvider } from "./context/VaultContext";
import VaultDashboard from "./pages/VaultDashboard";
import VaultAdmin from "./pages/VaultAdmin";
function App() {
  return (
    <BlockchainProvider>
        <VaultProvider>
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
        <Route path="/user" element={<UserProfile />} />
        <Route path="/vouch" element={<VouchingSystem />} />
            <Route path="/vault" element={<VaultDashboard />} />
            <Route path="/admin" element={<VaultAdmin />} />
        </Routes>
      </Router>
      </DAOProvider>
      </UserProvider>
      </VaultProvider>
    </BlockchainProvider>
  );
}

export default App;
