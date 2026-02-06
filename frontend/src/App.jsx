import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { BlockchainProvider } from "./context/BlockchainContext";
import { DAOProvider } from "./context/DAOContext";

import Home from "./pages/home";
import Dashboard from "./pages/Dashboard";
import Lend from "./pages/Lend";
import BorrowerDashboard from "./pages/borrower/BorrowerDashboard";
import DAO from "./pages/DAO";
function App() {
  return (
    <BlockchainProvider>
      <DAOProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dao" element={<DAO />} />
          <Route path="/lend" element={<Lend />} />
          <Route path="/borrow" element={< BorrowerDashboard />} />
        </Routes>
      </Router>
      </DAOProvider>
    </BlockchainProvider>
  );
}

export default App;
