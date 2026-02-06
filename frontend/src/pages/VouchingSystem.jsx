import { useEffect, useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import Navbar from '../components/navbar';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  Award,
  TrendingUp,
  Info,
  AlertTriangle,
  LayoutGrid,
  Zap,
  ArrowUpRight,
  UserCheck,
  ShieldAlert,
  Fingerprint,
  CheckCircle,
  HelpCircle
} from "lucide-react";

const VouchingSystem = () => {
  const {
    account,
    loading,
    connectWallet,
    registerUsername,
    getAddressByUsername,
    hasUsernameRegistered,
    vouchForUser,
    hasVouched,
    getUserVouches,
    getVouchesGiven,
    getUserProfile,
    getConstants,
  } = useBlockchain();

  const [myUsername, setMyUsername] = useState('');
  const [hasUsername, setHasUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [searchedProfile, setSearchedProfile] = useState(null);
  const [vouchersForMe, setVouchersForMe] = useState([]);
  const [myVouches, setMyVouches] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [constants, setConstants] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('vouch');
  const [vouchersDetails, setVouchersDetails] = useState([]);
  const [voucheesDetails, setVoucheesDetails] = useState([]);

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account]);

  const loadData = async () => {
    try {
      const [hasUser, profile, vouchers, vouches, consts] = await Promise.all([
        hasUsernameRegistered(),
        getUserProfile(),
        getUserVouches(),
        getVouchesGiven(),
        getConstants(),
      ]);

      setHasUsername(hasUser);
      setMyProfile(profile);
      setVouchersForMe(vouchers);
      setMyVouches(vouches);
      setConstants(consts);

      if (hasUser && profile) {
        setMyUsername(profile.username);
      }

      // Load details for vouchers
      if (vouchers.length > 0) {
        const details = await Promise.all(
          vouchers.map(async (address) => {
            const prof = await getUserProfile(address);
            return { address, ...prof };
          })
        );
        setVouchersDetails(details);
      }

      // Load details for vouchees
      if (vouches.length > 0) {
        const details = await Promise.all(
          vouches.map(async (address) => {
            const prof = await getUserProfile(address);
            return { address, ...prof };
          })
        );
        setVoucheesDetails(details);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Failed to load vouching data');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleRegisterUsername = async () => {
    if (!newUsername || newUsername.length < 3 || newUsername.length > 20) {
      showMessage('error', 'Username must be 3-20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      showMessage('error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    try {
      setTxLoading(true);
      await registerUsername(newUsername);
      showMessage('success', `Username "${newUsername}" registered successfully!`);
      setNewUsername('');
      await loadData();
    } catch (error) {
      console.error('Register error:', error);
      showMessage('error', error.message || 'Failed to register username');
    } finally {
      setTxLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchUsername) {
      showMessage('error', 'Please enter a username to search');
      return;
    }

    try {
      setTxLoading(true);
      const address = await getAddressByUsername(searchUsername);

      if (!address) {
        showMessage('error', `Username "${searchUsername}" not found`);
        setSearchedProfile(null);
        return;
      }

      const profile = await getUserProfile(address);
      const alreadyVouched = await hasVouched(account, address);

      setSearchedProfile({
        address,
        ...profile,
        alreadyVouched,
      });
    } catch (error) {
      console.error('Search error:', error);
      showMessage('error', 'Failed to search user');
      setSearchedProfile(null);
    } finally {
      setTxLoading(false);
    }
  };

  const handleVouchForUser = async () => {
    if (!searchedProfile) {
      showMessage('error', 'Please search for a user first');
      return;
    }

    if (searchedProfile.address.toLowerCase() === account.toLowerCase()) {
      showMessage('error', 'You cannot vouch for yourself');
      return;
    }

    if (searchedProfile.alreadyVouched) {
      showMessage('error', 'You have already vouched for this user');
      return;
    }

    try {
      setTxLoading(true);
      await vouchForUser(searchedProfile.username);
      showMessage('success', `Successfully vouched for ${searchedProfile.username}!`);
      await loadData();
      // Refresh searched profile
      await handleSearchUser();
    } catch (error) {
      console.error('Vouch error:', error);
      showMessage('error', error.message || 'Failed to vouch for user');
    } finally {
      setTxLoading(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTrustScoreColor = (score) => {
    const s = parseInt(score);
    if (s >= 800) return 'text-green-600';
    if (s >= 600) return 'text-blue-600';
    if (s >= 400) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrustScoreBg = (score) => {
    const s = parseInt(score);
    if (s >= 800) return 'bg-green-100 border-green-300';
    if (s >= 600) return 'bg-blue-100 border-blue-300';
    if (s >= 400) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const getRiskPoolName = (pool) => {
    if (pool === 0) return 'Low Risk';
    if (pool === 1) return 'Medium Risk';
    return 'High Risk';
  };

  const getRiskPoolColor = (pool) => {
    if (pool === 0) return 'text-green-600';
    if (pool === 1) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden font-inter text-white flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-float"></div>

        <div className="relative group max-w-md w-full">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl mx-auto mb-8 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-500">
              <Users className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tight">Access TrustForge</h2>
            <p className="text-gray-400 mb-10 font-light leading-relaxed">
              Connect your decentralized identity to access the social trust and vouching layer.
            </p>
            <button
              onClick={connectWallet}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-white shadow-lg hover:shadow-blue-500/40 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "AUTHENTICATING..." : "CONNECT WALLET"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-inter text-white">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] animate-float"></div>
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] animate-float-delayed"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>

      <Navbar />

      <main className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-12 animate-fade-in-down">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Vouching System</h1>
          </div>
          <p className="text-gray-400 text-lg font-light leading-relaxed max-w-2xl">
            Build decentralized trust through social connections. Endorse trusted partners and grow your collective reputation.
          </p>
        </div>

        {/* Status Message */}
        {message.text && (
          <div className={`mb-10 p-5 rounded-2xl backdrop-blur-xl border flex items-center gap-4 animate-fade-in ${message.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
            {message.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Username Registration Section */}
        {!hasUsername && (
          <div className="relative group mb-12 animate-fade-in-up animation-delay-200">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="w-24 h-24 bg-blue-500/20 rounded-3xl flex items-center justify-center border border-blue-500/30 shrink-0">
                  <Fingerprint className="w-12 h-12 text-blue-400" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-black mb-3">Claim Your Identity</h2>
                  <p className="text-gray-400 font-light mb-8 max-w-xl">
                    Register a unique TrustForge handle to participate in governance and social trust building.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</div>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Enter username"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none transition-all font-medium"
                        maxLength={20}
                      />
                    </div>
                    <button
                      onClick={handleRegisterUsername}
                      disabled={txLoading || !newUsername}
                      className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                      {txLoading ? 'REGISTERING...' : 'REGISTER IDENTITY'}
                    </button>
                  </div>
                  <p className="mt-4 text-xs text-gray-500 font-mono flex items-center gap-2 justify-center md:justify-start uppercase tracking-widest">
                    <Info className="w-3 h-3" />
                    Lowercase letters, numbers, and underscores only
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Profile Card */}
        {hasUsername && myProfile && (
          <div className="relative group mb-12 animate-fade-in-up animation-delay-200">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl p-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:divide-x divide-white/10">
                <div className="flex md:block items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-white/10 mb-4 group-hover:scale-110 transition-transform duration-500">
                    <UserCheck className="w-10 h-10 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">Your Identity</div>
                    <div className="text-4xl font-black tracking-tight mb-2">@{myProfile.username}</div>
                    <div className="text-xs text-gray-500 font-mono tracking-tighter">{formatAddress(account)}</div>
                  </div>
                </div>

                <div className="flex flex-col justify-center items-center md:items-start md:pl-10">
                  <div className="text-[10px] text-purple-400 font-black uppercase tracking-[0.2em] mb-1 text-center md:text-left">Trust Profile</div>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-black text-white">{myProfile.trustScore}</div>
                    <div className="flex flex-col">
                      <div className={`text-xs font-black uppercase tracking-widest ${getRiskPoolColor(myProfile.assignedPool)}`}>
                        {getRiskPoolName(myProfile.assignedPool)}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">Global Ranking</div>
                    </div>
                  </div>
                  <div className="w-full mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000"
                      style={{ width: `${(myProfile.trustScore / 1000) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-col justify-center items-center md:items-start md:pl-10">
                  <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-4 text-center md:text-left">Social Connections</div>
                  <div className="flex gap-8">
                    <div className="text-center md:text-left">
                      <div className="text-2xl font-black text-white">{vouchersForMe.length}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Vouchers</div>
                    </div>
                    <div className="text-center md:text-left">
                      <div className="text-2xl font-black text-white">{myVouches.length}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Vouchees</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasUsername && (
          <>
            {/* Tabs */}
            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden mb-12 animate-fade-in-up animation-delay-400">
              <div className="flex border-b border-white/10 p-2">
                {[
                  { id: 'vouch', label: 'Endorse', icon: UserPlus },
                  { id: 'vouchers', label: 'Admirers', icon: Award },
                  { id: 'vouchees', label: 'Portfolio', icon: TrendingUp },
                  { id: 'info', label: 'Protocol', icon: Info },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm transition-all duration-300 ${activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                      }`}
                  >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                    <span className="hidden md:inline uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-8 md:p-12">
                {/* Vouch for Others Tab */}
                {activeTab === 'vouch' && (
                  <div className="animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                      <div>
                        <h2 className="text-3xl font-black mb-2">Social Endorsement</h2>
                        <p className="text-gray-400 font-light">Search the network to vouch for trusted participants.</p>
                      </div>
                      <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Live Network Search
                      </div>
                    </div>

                    <div className="relative group max-w-2xl mb-12">
                      <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400 transition-colors">
                        <Search className="w-6 h-6" />
                      </div>
                      <input
                        type="text"
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        placeholder="Search by username..."
                        className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 pl-16 pr-32 text-white text-lg placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none transition-all font-light"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                      />
                      <button
                        onClick={handleSearchUser}
                        disabled={txLoading || !searchUsername}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 border border-white/10 px-8 py-3 rounded-2xl font-black text-sm transition-all disabled:opacity-50"
                      >
                        {txLoading ? '...' : 'FIND USER'}
                      </button>
                    </div>

                    {/* Search Results */}
                    {searchedProfile && (
                      <div className="relative group animate-fade-in-up">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2.5rem] blur opacity-10"></div>
                        <div className="relative bg-black/40 border border-white/10 rounded-[2.5rem] p-8 md:p-12">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-10 mb-12">
                            <div className="flex items-center gap-6">
                              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/20">
                                {searchedProfile.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-3xl font-black text-white mb-1">@{searchedProfile.username}</div>
                                <div className="text-gray-500 font-mono text-sm tracking-tighter">{formatAddress(searchedProfile.address)}</div>
                              </div>
                            </div>

                            {!searchedProfile.alreadyVouched && searchedProfile.address.toLowerCase() !== account.toLowerCase() && (
                              <button
                                onClick={handleVouchForUser}
                                disabled={txLoading}
                                className="group/vouch relative px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-white flex items-center gap-3 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.05] transition-all"
                              >
                                <UserPlus className="w-5 h-5 group-hover/vouch:rotate-12 transition-transform" />
                                VOUCH FOR USER
                              </button>
                            )}

                            {searchedProfile.alreadyVouched && (
                              <div className="px-10 py-5 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 font-black flex items-center gap-3">
                                <CheckCircle className="w-5 h-5" />
                                ALREADY ENDORSED
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                              { label: 'Trust Score', value: searchedProfile.trustScore, color: getTrustScoreColor(searchedProfile.trustScore), icon: ShieldCheck },
                              { label: 'Risk Rating', value: getRiskPoolName(searchedProfile.assignedPool), color: getRiskPoolColor(searchedProfile.assignedPool), icon: LayoutGrid },
                              { label: 'Total Loans', value: searchedProfile.totalLoansTaken, color: 'text-white', icon: TrendingUp },
                              { label: 'Repayments', value: searchedProfile.successfulRepayments, color: 'text-green-400', icon: CheckCircle },
                              { label: 'Defaults', value: searchedProfile.defaults, color: 'text-red-400', icon: ShieldAlert },
                              { label: 'Max Borrow', value: `${parseFloat(searchedProfile.maxBorrowingLimit).toFixed(0)} TFX`, color: 'text-blue-400', icon: Zap },
                              { label: 'Active Loan', value: searchedProfile.hasActiveLoan ? 'YES' : 'NO', color: 'text-white', icon: ArrowUpRight },
                              { label: 'Maturity', value: `LVL ${searchedProfile.maturityLevel}`, color: 'text-purple-400', icon: Award },
                            ].map((stat, i) => (
                              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 transition-all hover:bg-white/[0.06] hover:border-white/10">
                                <stat.icon className="w-4 h-4 text-gray-600 mb-4" />
                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{stat.label}</div>
                                <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Vouchers Tab */}
                {activeTab === 'vouchers' && (
                  <div className="animate-fade-in">
                    <h2 className="text-3xl font-black mb-8">Network Admirers</h2>

                    {vouchersDetails.length === 0 ? (
                      <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-white/5 border-dashed">
                        <Users className="w-16 h-16 text-gray-700 mx-auto mb-6 opacity-50" />
                        <h3 className="text-xl font-bold text-gray-400 mb-2">No endorsements found</h3>
                        <p className="text-gray-500 font-light">Contribute to the network and complete loans to earn trust.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {vouchersDetails.map((voucher, index) => (
                          <div key={index} className="group/card relative bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/[0.08] hover:border-blue-500/30 transition-all duration-300">
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center text-blue-400 text-xl font-black border border-white/10 group-hover/card:scale-110 transition-transform">
                                {voucher.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xl font-black text-white">@{voucher.username}</div>
                                <div className="text-xs text-gray-500 font-mono">{formatAddress(voucher.address)}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Trust Score</div>
                                <div className={`text-lg font-black ${getTrustScoreColor(voucher.trustScore)}`}>{voucher.trustScore}</div>
                              </div>
                              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Risk Status</div>
                                <div className={`text-lg font-black ${getRiskPoolColor(voucher.assignedPool)}`}>{getRiskPoolName(voucher.assignedPool)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Vouchees Tab */}
                {activeTab === 'vouchees' && (
                  <div className="animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <h2 className="text-3xl font-black">Endorsement Portfolio</h2>
                      {constants && (
                        <div className="px-5 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 text-yellow-500 animate-pulse" />
                          <span className="text-xs font-black text-yellow-500 uppercase tracking-widest">
                            Risk Penalty: -{constants.vouchPenaltyOnDefault} Points
                          </span>
                        </div>
                      )}
                    </div>

                    {voucheesDetails.length === 0 ? (
                      <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-white/5 border-dashed">
                        <UserPlus className="w-16 h-16 text-gray-700 mx-auto mb-6 opacity-50" />
                        <h3 className="text-xl font-bold text-gray-400 mb-2">Portfolio is empty</h3>
                        <p className="text-gray-500 font-light">Search and vouch for users you trust to grow your network.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {voucheesDetails.map((vouchee, index) => (
                          <div key={index} className="group/card relative bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/[0.08] hover:border-blue-500/30 transition-all duration-300">
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-xl font-black border border-white/10 group-hover/card:scale-110 transition-transform">
                                {vouchee.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xl font-black text-white">@{vouchee.username}</div>
                                <div className="text-xs text-gray-500 font-mono">{formatAddress(vouchee.address)}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Trust</div>
                                <div className={`text-lg font-black ${getTrustScoreColor(vouchee.trustScore)}`}>{vouchee.trustScore}</div>
                              </div>
                              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Repaid</div>
                                <div className="text-lg font-black text-green-400">{vouchee.successfulRepayments}</div>
                              </div>
                              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Faults</div>
                                <div className="text-lg font-black text-red-400">{vouchee.defaults}</div>
                              </div>
                            </div>
                            {vouchee.hasActiveLoan && (
                              <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Active Credit Line Operational</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Info Tab */}
                {activeTab === 'info' && (
                  <div className="animate-fade-in space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                      <h2 className="text-3xl font-black">Protocol Documentation</h2>
                      <div className="h-px flex-1 bg-white/10"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* What is Vouching */}
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="relative bg-white/[0.03] border border-white/5 rounded-3xl p-8 h-full">
                          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                            <Users className="w-6 h-6 text-blue-400" />
                          </div>
                          <h3 className="text-xl font-black mb-4">Social Trust Mechanism</h3>
                          <p className="text-gray-400 font-light leading-relaxed mb-4">
                            Vouching is a decentralized endorsement protocol. By vouching for a peer, you are certifying their creditworthiness based on social or professional reputation.
                          </p>
                          <p className="text-gray-400 font-light leading-relaxed">
                            This social proof allows the protocol to identify high-quality borrowers and offer preferential terms to those backed by the community.
                          </p>
                        </div>
                      </div>

                      {/* Benefits */}
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="relative bg-white/[0.03] border border-white/5 rounded-3xl p-8 h-full">
                          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
                            <Award className="w-6 h-6 text-purple-400" />
                          </div>
                          <h3 className="text-xl font-black mb-4">Network Advantages</h3>
                          <ul className="space-y-4">
                            {[
                              "Enhanced Trust Scores for borrowers",
                              "Higher borrowing limits through maturity",
                              "Reduced interest rates via risk-pool migration",
                              "Protocol-wide social status & credibility"
                            ].map((item, i) => (
                              <li key={i} className="flex items-start gap-3 text-gray-400 font-light">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Risks */}
                      <div className="relative group lg:col-span-2">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="relative bg-red-500/[0.02] border border-red-500/10 rounded-3xl p-8 md:p-12 overflow-hidden">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>

                          <div className="flex flex-col md:flex-row gap-10 items-center">
                            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 shrink-0">
                              <ShieldAlert className="w-10 h-10 text-red-500" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                              <h3 className="text-2xl font-black mb-4 text-red-400 uppercase tracking-tight">Risk Exposure & Penalties</h3>
                              <p className="text-gray-400 font-light leading-relaxed max-w-3xl">
                                Vouching creates a financial and reputational link between users. If a vouchee defaults,
                                <span className="text-red-400 font-bold px-1 underline underline-offset-4 decoration-red-500/30">your trust score will be penalized</span>.
                                Exercise extreme caution and only endorse users with proven integrity.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* System Constants */}
                    {constants && (
                      <div className="relative bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                        <div className="flex items-center gap-3 mb-8">
                          <Zap className="w-4 h-4 text-blue-400" />
                          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">Live Protocol Parameters</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                          {[
                            { label: 'Default Penalty', value: `-${constants.vouchPenaltyOnDefault}`, color: 'text-red-400' },
                            { label: 'Limit/User', value: constants.maxVouchesPerUser, color: 'text-blue-400' },
                            { label: 'Repay Reward', value: `+${constants.trustIncreasePerRepayment}`, color: 'text-green-400' },
                            { label: 'Default Loss', value: `-${constants.trustDecreaseOnDefault}`, color: 'text-red-400' },
                            { label: 'Initial Trust', value: constants.initialTrustScore, color: 'text-white' },
                            { label: 'Cap Trust', value: constants.maxTrustScore, color: 'text-purple-400' },
                          ].map((p, i) => (
                            <div key={i} className="group/stat">
                              <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-2 group-hover/stat:text-gray-400 transition-colors">{p.label}</div>
                              <div className={`text-2xl font-black ${p.color}`}>{p.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <style jsx global>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) scale(1.05); }
          50% { transform: translateY(-20px) scale(1); }
        }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }

        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 12s ease-in-out infinite; }
        .animate-gradient-x { animation: gradient-x 15s ease infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }

        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-fade-in-down { animation: fadeInDown 0.8s ease-out forwards; }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
};

export default VouchingSystem;
