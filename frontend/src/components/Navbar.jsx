import { useBlockchain } from "../context/BlockchainContext";
import { useUser } from "../context/usercontext";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Wallet, LogOut, Menu, X, TrendingUp, HandCoins,
  Home, Coins, ToyBrick, Shield, ChevronDown, User, Loader2
} from "lucide-react";

const Navbar = () => {
  const {
    account,
    connectWallet,
    disconnectWallet,
    loading: blockchainLoading,
  } = useBlockchain();

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

  const handleDisconnect = () => {
    disconnectWallet();
    setMobileMenuOpen(false);
  };

  const shortAddress = (address) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const navLinks = [
    { path: "/",       label: "Home",   icon: Home      },
    { path: "/lender", label: "Lend",   icon: TrendingUp },
    { path: "/borrow", label: "Borrow", icon: HandCoins  },
    { path: "/dao",    label: "DAO",    icon: Coins      },
    { path: "/vouch",  label: "Vouch",  icon: ToyBrick   },
  ];

  const isActive = (path) => location.pathname === path;

  // Derived from context
  const isConnecting = connecting || blockchainLoading;
  const showRegister = account && !hasUsername && registrationStatus === "not_registered";
  const showProfile  = account && hasUsername && userProfile?.username;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .nb-root {
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(17, 17, 17, 0.92);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .nb-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
        }

        /* LOGO */
        .nb-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .nb-logo-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #b5d4a8;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: nbFloat 4s ease-in-out infinite;
          flex-shrink: 0;
        }
        .nb-logo-text {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.025em;
          color: #f0ede8;
        }
        .nb-logo-badge {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #b5d4a8;
          background: rgba(181,212,168,0.1);
          border: 1px solid rgba(181,212,168,0.2);
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        /* NAV LINKS */
        .nb-links {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          justify-content: center;
        }
        .nb-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          color: #555;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .nb-link:hover { color: #f0ede8; background: rgba(255,255,255,0.04); }
        .nb-link.active {
          color: #f0ede8;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .nb-link.active svg { color: #b5d4a8; }
        .nb-link-dot {
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          width: 14px;
          height: 2px;
          background: #b5d4a8;
          border-radius: 99px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .nb-link.active .nb-link-dot { opacity: 1; }

        /* RIGHT SECTION */
        .nb-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        /* CONNECT BUTTON */
        .nb-connect {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border-radius: 9px;
          background: #b5d4a8;
          color: #0a150a;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          border: none;
          cursor: pointer;
          transition: all 0.22s;
        }
        .nb-connect:hover:not(:disabled) {
          background: #8fc47f;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(181,212,168,0.25);
        }
        .nb-connect:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* SPINNING LOADER */
        .nb-spin {
          animation: nbSpin 0.8s linear infinite;
        }
        @keyframes nbSpin {
          to { transform: rotate(360deg); }
        }

        /* WALLET ADDRESS CHIP */
        .nb-address {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 9px;
          background: rgba(181,212,168,0.07);
          border: 1px solid rgba(181,212,168,0.18);
        }
        .nb-address-text {
          font-family: 'DM Mono', monospace;
          font-size: 12.5px;
          color: #b5d4a8;
          font-weight: 500;
        }

        /* LIVE DOT */
        .nb-dot {
          width: 7px;
          height: 7px;
          background: #b5d4a8;
          border-radius: 50%;
          animation: nbDot 2s infinite;
          position: relative;
          flex-shrink: 0;
        }
        .nb-dot::after {
          content: '';
          position: absolute;
          inset: -3px;
          border: 1px solid #b5d4a8;
          border-radius: 50%;
          animation: nbRing 2s infinite;
        }
        .nb-dot.sm { width: 6px; height: 6px; }
        .nb-dot.sm::after { inset: -2px; }

        /* USER PILL */
        .nb-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 12px 7px 8px;
          border-radius: 99px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
        }
        .nb-user:hover {
          border-color: rgba(181,212,168,0.25);
          background: rgba(181,212,168,0.05);
        }
        .nb-user-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(181,212,168,0.15);
          border: 1px solid rgba(181,212,168,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .nb-user-online {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 8px;
          height: 8px;
          background: #b5d4a8;
          border-radius: 50%;
          border: 1.5px solid #111;
        }
        .nb-user-name {
          font-size: 13px;
          font-weight: 600;
          color: #f0ede8;
          line-height: 1;
          margin-bottom: 2px;
        }
        .nb-user-score {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #666;
          line-height: 1;
        }

        /* DISCONNECT */
        .nb-disconnect {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 14px;
          border-radius: 9px;
          background: transparent;
          color: #555;
          font-size: 13px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          border: 1px solid rgba(255,255,255,0.07);
          cursor: pointer;
          transition: all 0.2s;
        }
        .nb-disconnect:hover {
          color: #f87171;
          border-color: rgba(248,113,113,0.25);
          background: rgba(248,113,113,0.05);
        }
        .nb-disconnect:hover svg { transform: translateX(1px); }
        .nb-disconnect svg { transition: transform 0.2s; }

        /* REGISTER BADGE */
        .nb-register {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 9px;
          background: rgba(251,191,36,0.07);
          border: 1px solid rgba(251,191,36,0.2);
          color: #fbbf24;
          font-size: 13px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          text-decoration: none;
          transition: all 0.2s;
        }
        .nb-register:hover {
          border-color: rgba(251,191,36,0.35);
          background: rgba(251,191,36,0.1);
        }

        /* MOBILE BUTTON */
        .nb-burger {
          display: none;
          padding: 6px;
          border-radius: 7px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nb-burger:hover { color: #f0ede8; border-color: rgba(255,255,255,0.14); }

        /* MOBILE DRAWER */
        .nb-drawer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 16px 24px 20px;
          animation: nbSlideDown 0.25s ease forwards;
        }
        .nb-drawer-links {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 16px;
        }
        .nb-drawer-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 500;
          color: #555;
          text-decoration: none;
          transition: all 0.18s;
        }
        .nb-drawer-link:hover { color: #f0ede8; background: rgba(255,255,255,0.04); }
        .nb-drawer-link.active {
          color: #f0ede8;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .nb-drawer-link.active svg { color: #b5d4a8; }
        .nb-drawer-sep { height: 1px; background: rgba(255,255,255,0.06); margin: 12px 0; }

        /* ANIMATIONS */
        @keyframes nbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes nbDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }
        @keyframes nbRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes nbSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .nb-links { display: none; }
          .nb-right { display: none; }
          .nb-burger { display: flex; }
        }
      `}</style>

      <nav className="nb-root">
        <div className="nb-inner">

          {/* LOGO */}
          <Link to="/" className="nb-logo">
            <div className="nb-logo-icon">
              <Shield size={15} color="#0a150a" strokeWidth={2.5} />
            </div>
            <span className="nb-logo-text">TrustForge</span>
            <span className="nb-logo-badge">BETA</span>
          </Link>

          {/* NAV LINKS */}
          <div className="nb-links">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nb-link${isActive(link.path) ? " active" : ""}`}
                >
                  <Icon size={14} strokeWidth={isActive(link.path) ? 2 : 1.7} />
                  <span>{link.label}</span>
                  <span className="nb-link-dot" />
                </Link>
              );
            })}
          </div>

          {/* RIGHT */}
          <div className="nb-right">
            {!account ? (
              <button
                className="nb-connect"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting
                  ? <Loader2 size={14} className="nb-spin" />
                  : <Wallet size={14} strokeWidth={2} />
                }
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <>
                {/* Profile pill — shown when username is registered */}
                {showProfile && (
                  <Link to="/user" className="nb-user">
                    <div className="nb-user-avatar">
                      <User size={12} color="#b5d4a8" strokeWidth={2} />
                      <div className="nb-user-online" />
                    </div>
                    <div>
                      <div className="nb-user-name">@{userProfile.username}</div>
                      <div className="nb-user-score">
                        Score: {userProfile.trustScore ?? userProfile.liveTrustScore ?? "—"}
                      </div>
                    </div>
                    <ChevronDown size={12} color="#444" />
                  </Link>
                )}

                {/* Register prompt — shown when wallet connected but no username */}
                {showRegister && (
                  <Link to="/register" className="nb-register">
                    <User size={13} strokeWidth={1.8} />
                    Register
                  </Link>
                )}

                {/* Wallet address chip */}
                <div className="nb-address">
                  <div className="nb-dot sm" />
                  <span className="nb-address-text">{shortAddress(account)}</span>
                </div>

                {/* Disconnect */}
                <button className="nb-disconnect" onClick={handleDisconnect}>
                  <LogOut size={13} strokeWidth={1.8} />
                  Disconnect
                </button>
              </>
            )}
          </div>

          {/* MOBILE BURGER */}
          <button
            className="nb-burger"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="nb-drawer">
            <div className="nb-drawer-links">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`nb-drawer-link${isActive(link.path) ? " active" : ""}`}
                  >
                    <Icon size={16} strokeWidth={isActive(link.path) ? 2 : 1.7} />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="nb-drawer-sep" />

            {!account ? (
              <button
                className="nb-connect"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => { handleConnect(); setMobileMenuOpen(false); }}
                disabled={isConnecting}
              >
                {isConnecting
                  ? <Loader2 size={14} className="nb-spin" />
                  : <Wallet size={14} />
                }
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {showProfile && (
                  <Link
                    to="/user"
                    onClick={() => setMobileMenuOpen(false)}
                    className="nb-user"
                    style={{ borderRadius: 10 }}
                  >
                    <div className="nb-user-avatar" style={{ width: 32, height: 32 }}>
                      <User size={14} color="#b5d4a8" strokeWidth={2} />
                      <div className="nb-user-online" />
                    </div>
                    <div>
                      <div className="nb-user-name">@{userProfile.username}</div>
                      <div className="nb-user-score">
                        Trust Score: {userProfile.trustScore ?? userProfile.liveTrustScore ?? "—"}
                      </div>
                    </div>
                  </Link>
                )}

                {showRegister && (
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="nb-register"
                    style={{ justifyContent: "center" }}
                  >
                    <User size={14} />
                    Register Username
                  </Link>
                )}

                <div className="nb-address" style={{ justifyContent: "center" }}>
                  <div className="nb-dot sm" />
                  <span className="nb-address-text">{shortAddress(account)}</span>
                </div>

                <button
                  className="nb-disconnect"
                  style={{ justifyContent: "center" }}
                  onClick={handleDisconnect}
                >
                  <LogOut size={14} />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;