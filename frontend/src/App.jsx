import { BlockchainProvider } from "./context/BlockchainContext";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/home";
import BorrowerDashboard from "./pages/borrower/BorrowerDashboard";

function App() {
  return (
    <BlockchainProvider>
      <Dashboard />
      <Home/>
      <BorrowerDashboard />

    </BlockchainProvider>
  );
}
export default App;
