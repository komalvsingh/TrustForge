import { useBlockchain } from "../context/BlockchainContext";
import { useUser } from "../context/usercontext";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Wallet, LogOut, Menu, X, TrendingUp, HandCoins, Home, LayoutDashboard, User, Coins, ToyBrick } from "lucide-react";


const Navbar = () => {
  const { account, connectWallet, disconnectWallet } = useBlockchain();
  const { userProfile, hasUsername, registrationStatus } = useUser();
  const [connecting, setConnecting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectWallet();
    } catch (error) {
      console.error("Connection failed:", error);
      alert(error.message || "Failed to connect wallet. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  const shortAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navLinks = [
    { path: "/", label: "Home", icon: Home },
    { path: "/lender", label: "Lend", icon: TrendingUp },
    { path: "/borrow", label: "Borrow", icon: HandCoins },
    { path: "/dao", label: "DAO", icon: Coins },
    { path: "/vouch", label: "Vouch", icon: ToyBrick },

  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>

    <nav className="relative w-full bg-black/50 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-8">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-3 flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xl">T</span>
              </div>
            </div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              TrustForge
            </h1>
          </Link>

          {/* Desktop Navigation */}
           <navbar />
          <div className="hidden lg:flex items-center gap-2 flex-1 justify-center">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`group relative px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    isActive(link.path)
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {isActive(link.path) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30"></div>
                  )}
                  <Icon className={`w-4 h-4 relative z-10 ${isActive(link.path) ? "text-blue-400" : ""}`} />
                  <span className="relative z-10">{link.label}</span>
                  {isActive(link.path) && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Wallet Connection */}
          <div className="hidden lg:block flex-shrink-0">
            {!account ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  {connecting ? "Connecting..." : "Connect Wallet"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            ) : (
              <div className="flex items-center gap-4">
                {/* Username Display */}
                {hasUsername && userProfile?.username ? (
                  <Link
                    to="/user"
                    className="group px-4 py-2.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-purple-500/40 hover:border-purple-400/60 rounded-xl flex items-center gap-3 transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  >
                    <div className="relative">
                      <div className="w-9 h-9 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-purple-400/30">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-black/80 rounded-full"></div>
                    </div>
                    <div className="flex flex-col items-start -space-y-0.5">
                      <span className="text-white font-bold text-sm leading-tight">
                        @{userProfile.username}
                      </span>
                      <span className="text-gray-400 text-xs font-medium leading-tight">
                        Trust Score: {userProfile.trustScore}
                      </span>
                    </div>
                  </Link>
                ) : registrationStatus === "not_registered" ? (
                  <Link
                    to="/register"
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/30 hover:border-amber-500/50 rounded-xl flex items-center gap-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] group"
                  >
                    <User className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300 font-semibold text-sm">
                      Register Username
                    </span>
                  </Link>
                ) : null}

                {/* Wallet Address */}
                <div className="px-4 py-2.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-500/30 rounded-xl flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  </div>
                  <span className="text-blue-300 font-mono font-semibold text-sm">
                    {shortAddress(account)}
                  </span>
                </div>

                {/* Disconnect Button */}
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-xl transition-all duration-300 flex items-center gap-2 group"
                >
                  <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span className="font-semibold text-sm">Disconnect</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-white/10 pt-4 animate-fade-in-down">
            <div className="flex flex-col gap-2 mb-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
                      isActive(link.path)
                        ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive(link.path) ? "text-blue-400" : ""}`} />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Wallet Connection */}
            {!account ? (
              <button
                onClick={() => {
                  handleConnect();
                  setMobileMenuOpen(false);
                }}
                disabled={connecting}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                {connecting ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <div className="space-y-3">
                {/* Mobile Username Display */}
                {hasUsername && userProfile?.username ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full px-4 py-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-purple-500/40 rounded-xl flex items-center gap-3 hover:border-purple-400/60 transition-all"
                  >
                    <div className="relative">
                      <div className="w-11 h-11 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-purple-400/30">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-black/80 rounded-full"></div>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-white font-bold text-base">
                        @{userProfile.username}
                      </span>
                      <span className="text-gray-400 text-sm font-medium">
                        Trust Score: {userProfile.trustScore}
                      </span>
                    </div>
                  </Link>
                ) : registrationStatus === "not_registered" ? (
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/30 rounded-xl flex items-center justify-center gap-2 hover:border-amber-500/50 transition-all"
                  >
                    <User className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-300 font-semibold">
                      Register Username
                    </span>
                  </Link>
                ) : null}

                {/* Mobile Wallet Address */}
                <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-500/30 rounded-xl flex items-center gap-3 justify-center">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  </div>
                  <span className="text-blue-300 font-mono font-semibold">
                    {shortAddress(account)}
                  </span>
                </div>

                {/* Mobile Disconnect Button */}
                <button
                  onClick={() => {
                    disconnectWallet();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out forwards;
        }
      `}</style>
    </nav>
    </>
  );
};

export default Navbar;
