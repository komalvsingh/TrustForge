import { useEffect, useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import Navbar from '../components/navbar';

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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to access the Vouching System</p>
          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <Navbar></Navbar>
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Vouching System</h1>
          <p className="text-gray-600">Build trust through social connections and vouching</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Username Registration Section */}
        {!hasUsername && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Register Your Username</h2>
                <p className="text-gray-600">You need a username to participate in the vouching system</p>
              </div>
            </div>

            <div className="flex gap-4">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username (3-20 characters)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={20}
              />
              <button
                onClick={handleRegisterUsername}
                disabled={txLoading || !newUsername}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-8 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {txLoading ? 'Registering...' : 'Register'}
              </button>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              Only letters, numbers, and underscores allowed
            </div>
          </div>
        )}

        {/* My Profile Card */}
        {hasUsername && myProfile && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg p-8 mb-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm opacity-90 mb-1">Your Username</div>
                <div className="text-3xl font-bold">@{myProfile.username}</div>
                <div className="text-sm opacity-75 mt-1">{formatAddress(account)}</div>
              </div>
              <div>
                <div className="text-sm opacity-90 mb-1">Trust Score</div>
                <div className="text-3xl font-bold">{myProfile.trustScore}</div>
                <div className="text-sm opacity-75 mt-1">{getRiskPoolName(myProfile.assignedPool)} Pool</div>
              </div>
              <div>
                <div className="text-sm opacity-90 mb-1">Vouching Stats</div>
                <div className="text-lg font-semibold">
                  {vouchersForMe.length} vouching for you
                </div>
                <div className="text-lg font-semibold">
                  {myVouches.length} you vouched for
                </div>
              </div>
            </div>
          </div>
        )}

        {hasUsername && (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg mb-8">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('vouch')}
                    className={`py-4 px-6 font-semibold transition-colors ${
                      activeTab === 'vouch'
                        ? 'border-b-2 border-purple-500 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Vouch for Others
                  </button>
                  <button
                    onClick={() => setActiveTab('vouchers')}
                    className={`py-4 px-6 font-semibold transition-colors ${
                      activeTab === 'vouchers'
                        ? 'border-b-2 border-purple-500 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    People Vouching for Me ({vouchersForMe.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('vouchees')}
                    className={`py-4 px-6 font-semibold transition-colors ${
                      activeTab === 'vouchees'
                        ? 'border-b-2 border-purple-500 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    People I Vouch For ({myVouches.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`py-4 px-6 font-semibold transition-colors ${
                      activeTab === 'info'
                        ? 'border-b-2 border-purple-500 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Info
                  </button>
                </div>
              </div>

              {/* Vouch for Others Tab */}
              {activeTab === 'vouch' && (
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Vouch for Someone</h2>

                  {/* Search Section */}
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Search User by Username</h3>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        placeholder="Enter username to search..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                      />
                      <button
                        onClick={handleSearchUser}
                        disabled={txLoading || !searchUsername}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-8 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {txLoading ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchedProfile && (
                    <div className="bg-white border-2 border-purple-200 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {searchedProfile.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-800">@{searchedProfile.username}</div>
                            <div className="text-sm text-gray-500">{formatAddress(searchedProfile.address)}</div>
                          </div>
                        </div>
                        {!searchedProfile.alreadyVouched && searchedProfile.address.toLowerCase() !== account.toLowerCase() && (
                          <button
                            onClick={handleVouchForUser}
                            disabled={txLoading}
                            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {txLoading ? 'Vouching...' : 'Vouch for User'}
                          </button>
                        )}
                        {searchedProfile.alreadyVouched && (
                          <div className="bg-green-100 text-green-800 py-3 px-6 rounded-lg font-semibold flex items-center gap-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Already Vouched
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={`p-4 rounded-lg border-2 ${getTrustScoreBg(searchedProfile.trustScore)}`}>
                          <div className="text-sm text-gray-600 mb-1">Trust Score</div>
                          <div className={`text-2xl font-bold ${getTrustScoreColor(searchedProfile.trustScore)}`}>
                            {searchedProfile.trustScore}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Risk Pool</div>
                          <div className={`text-lg font-bold ${getRiskPoolColor(searchedProfile.assignedPool)}`}>
                            {getRiskPoolName(searchedProfile.assignedPool)}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Total Loans</div>
                          <div className="text-2xl font-bold text-gray-800">{searchedProfile.totalLoansTaken}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Repayments</div>
                          <div className="text-2xl font-bold text-green-600">{searchedProfile.successfulRepayments}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Defaults</div>
                          <div className="text-2xl font-bold text-red-600">{searchedProfile.defaults}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Active Loan</div>
                          <div className="text-lg font-bold text-gray-800">
                            {searchedProfile.hasActiveLoan ? 'Yes' : 'No'}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Maturity Level</div>
                          <div className="text-2xl font-bold text-blue-600">{searchedProfile.maturityLevel}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Max Borrow</div>
                          <div className="text-lg font-bold text-purple-600">{parseFloat(searchedProfile.maxBorrowingLimit).toFixed(0)} TFX</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vouchers Tab */}
              {activeTab === 'vouchers' && (
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">People Vouching for Me</h2>

                  {vouchersDetails.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">No one is vouching for you yet</h3>
                      <p className="text-gray-500">Build trust by completing loans and contributing to the community</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vouchersDetails.map((voucher, index) => (
                        <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                              {voucher.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-lg font-bold text-gray-800">@{voucher.username}</div>
                              <div className="text-sm text-gray-500">{formatAddress(voucher.address)}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-gray-600">Trust Score</div>
                              <div className={`font-bold ${getTrustScoreColor(voucher.trustScore)}`}>{voucher.trustScore}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Risk Pool</div>
                              <div className={`font-bold ${getRiskPoolColor(voucher.assignedPool)}`}>{getRiskPoolName(voucher.assignedPool)}</div>
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
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">People I Vouch For</h2>

                  {constants && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <div className="font-semibold text-yellow-800 mb-1">Vouching Penalty Warning</div>
                          <div className="text-sm text-yellow-700">
                            If someone you vouch for defaults on a loan, your trust score will decrease by {constants.vouchPenaltyOnDefault} points.
                            Only vouch for people you trust!
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {voucheesDetails.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">You haven't vouched for anyone yet</h3>
                      <p className="text-gray-500">Search for users and vouch for people you trust</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {voucheesDetails.map((vouchee, index) => (
                        <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                              {vouchee.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-lg font-bold text-gray-800">@{vouchee.username}</div>
                              <div className="text-sm text-gray-500">{formatAddress(vouchee.address)}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <div className="text-gray-600">Trust Score</div>
                              <div className={`font-bold ${getTrustScoreColor(vouchee.trustScore)}`}>{vouchee.trustScore}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Repayments</div>
                              <div className="font-bold text-green-600">{vouchee.successfulRepayments}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Defaults</div>
                              <div className="font-bold text-red-600">{vouchee.defaults}</div>
                            </div>
                          </div>
                          {vouchee.hasActiveLoan && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <div className="flex items-center gap-2 text-sm text-blue-700">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Currently has an active loan
                              </div>
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
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">How Vouching Works</h2>

                  <div className="space-y-6">
                    {/* What is Vouching */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-3">What is Vouching?</h3>
                      <p className="text-gray-700 mb-3">
                        Vouching is a social trust mechanism where you endorse other users based on your trust in their ability to repay loans.
                        It's similar to a professional reference or character reference in traditional finance.
                      </p>
                      <p className="text-gray-700">
                        When you vouch for someone, you're putting your reputation on the line to support theirs. This helps new users build
                        trust in the system and allows the community to self-regulate.
                      </p>
                    </div>

                    {/* Benefits */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-3">Benefits of Being Vouched For</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Increased trust score and credibility in the system</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Better loan terms and higher borrowing limits</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Social proof of trustworthiness</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Helps new users get started in the lending ecosystem</span>
                        </li>
                      </ul>
                    </div>

                    {/* Risks */}
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-3">⚠️ Risks of Vouching</h3>
                      {constants && (
                        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                          <div className="font-bold text-red-800 mb-2">Important: Vouching Penalty</div>
                          <div className="text-red-700">
                            If someone you vouch for defaults on their loan, your trust score will be reduced by{' '}
                            <span className="font-bold">{constants.vouchPenaltyOnDefault} points</span>.
                          </div>
                        </div>
                      )}
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>Your trust score decreases if they default</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>Your reputation is tied to their behavior</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>Only vouch for people you genuinely trust</span>
                        </li>
                      </ul>
                    </div>

                    {/* Best Practices */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-3">Best Practices</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Review the user's loan history before vouching</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Check their trust score and successful repayments</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Only vouch for users you know or have interacted with</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Be selective - quality over quantity</span>
                        </li>
                        {constants && (
                          <li className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>Maximum {constants.maxVouchesPerUser} vouches per user</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* System Constants */}
                    {constants && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-3">System Parameters</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Vouch Penalty on Default</div>
                            <div className="text-xl font-bold text-red-600">{constants.vouchPenaltyOnDefault}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Max Vouches Per User</div>
                            <div className="text-xl font-bold text-blue-600">{constants.maxVouchesPerUser}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Trust Increase (Repay)</div>
                            <div className="text-xl font-bold text-green-600">+{constants.trustIncreasePerRepayment}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Trust Decrease (Default)</div>
                            <div className="text-xl font-bold text-red-600">-{constants.trustDecreaseOnDefault}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Initial Trust Score</div>
                            <div className="text-xl font-bold text-gray-800">{constants.initialTrustScore}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Max Trust Score</div>
                            <div className="text-xl font-bold text-purple-600">{constants.maxTrustScore}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
};

export default VouchingSystem;
