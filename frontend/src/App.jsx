import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { BlockchainProvider } from "./context/BlockchainContext";

import Home from "./pages/home";
import Dashboard from "./pages/Dashboard";
import Lend from "./pages/Lend";
import BorrowerDashboard from "./pages/borrower/BorrowerDashboard";
function App() {
  return (
    <BlockchainProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lend" element={<Lend />} />
          <Route path="/borrow" element={< BorrowerDashboard />} />
        </Routes>
      </Router>
    </BlockchainProvider>
  );
}

export default App;
