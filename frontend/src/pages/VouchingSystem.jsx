import { useEffect, useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import Navbar from '../components/Navbar';
import {
  Users, UserPlus, Search, ShieldCheck, Award, TrendingUp,
  Info, AlertTriangle, LayoutGrid, Zap, ArrowUpRight,
  UserCheck, ShieldAlert, Fingerprint, CheckCircle,
  ArrowRight, ChevronRight, Activity, Star
} from "lucide-react";

const VouchingSystem = () => {
  const {
    account, loading, connectWallet,
    registerUsername, getAddressByUsername, hasUsernameRegistered,
    vouchForUser, hasVouched, getUserVouches, getVouchesGiven,
    getUserProfile, getConstants,
  } = useBlockchain();

  const [myUsername, setMyUsername]         = useState('');
  const [hasUsername, setHasUsername]       = useState(false);
  const [newUsername, setNewUsername]       = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [searchedProfile, setSearchedProfile] = useState(null);
  const [vouchersForMe, setVouchersForMe]   = useState([]);
  const [myVouches, setMyVouches]           = useState([]);
  const [myProfile, setMyProfile]           = useState(null);
  const [constants, setConstants]           = useState(null);
  const [txLoading, setTxLoading]           = useState(false);
  const [message, setMessage]               = useState({ type: '', text: '' });
  const [activeTab, setActiveTab]           = useState('vouch');
  const [vouchersDetails, setVouchersDetails] = useState([]);
  const [voucheesDetails, setVoucheesDetails] = useState([]);

  useEffect(() => { if (account) loadData(); }, [account]);

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
      if (hasUser && profile) setMyUsername(profile.username);

      if (vouchers.length > 0) {
        const details = await Promise.all(
          vouchers.map(async (address) => {
            const prof = await getUserProfile(address);
            return { address, ...prof };
          })
        );
        setVouchersDetails(details);
      }
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
      showMessage('error', 'Username must be 3–20 characters'); return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      showMessage('error', 'Username can only contain letters, numbers, and underscores'); return;
    }
    try {
      setTxLoading(true);
      await registerUsername(newUsername);
      showMessage('success', `Username "${newUsername}" registered!`);
      setNewUsername('');
      await loadData();
    } catch (error) {
      showMessage('error', error.message || 'Failed to register username');
    } finally { setTxLoading(false); }
  };

  const handleSearchUser = async () => {
    if (!searchUsername) { showMessage('error', 'Enter a username to search'); return; }
    try {
      setTxLoading(true);
      const address = await getAddressByUsername(searchUsername);
      if (!address) {
        showMessage('error', `"${searchUsername}" not found`);
        setSearchedProfile(null); return;
      }
      const profile = await getUserProfile(address);
      const alreadyVouched = await hasVouched(account, address);
      setSearchedProfile({ address, ...profile, alreadyVouched });
    } catch (error) {
      showMessage('error', 'Failed to search user');
      setSearchedProfile(null);
    } finally { setTxLoading(false); }
  };

  const handleVouchForUser = async () => {
    if (!searchedProfile) { showMessage('error', 'Search for a user first'); return; }
    if (searchedProfile.address.toLowerCase() === account.toLowerCase()) {
      showMessage('error', 'You cannot vouch for yourself'); return;
    }
    if (searchedProfile.alreadyVouched) {
      showMessage('error', 'Already vouched for this user'); return;
    }
    try {
      setTxLoading(true);
      await vouchForUser(searchedProfile.username);
      showMessage('success', `Vouched for ${searchedProfile.username}!`);
      await loadData();
      await handleSearchUser();
    } catch (error) {
      showMessage('error', error.message || 'Failed to vouch');
    } finally { setTxLoading(false); }
  };

  const formatAddress = (addr) => !addr ? '' : `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getTrustColor = (score) => {
    const s = parseInt(score);
    if (s >= 800) return '#b5d4a8';
    if (s >= 600) return '#8fc47f';
    if (s >= 400) return '#e8c96d';
    return '#e87070';
  };

  const getRiskName  = (p) => ['Low Risk', 'Medium Risk', 'High Risk'][p] || 'Unknown';
  const getRiskColor = (p) => ['#b5d4a8', '#e8c96d', '#e87070'][p] || '#999';

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!account) {
    return (
      <div style={styles.root}>
        <style>{css}</style>
        <div style={styles.noise} className="noise"></div>
        <Navbar />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh', padding:'24px' }}>
          <div style={{ ...styles.card, maxWidth:420, width:'100%', padding:'52px 40px', textAlign:'center' }}>
            <div style={styles.iconBox}><Users size={28} color="var(--accent)" /></div>
            <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:'-.03em', marginBottom:10 }}>Access TrustForge</h2>
            <p style={{ color:'var(--td)', fontSize:14, lineHeight:1.75, marginBottom:32 }}>
              Connect your wallet to access the social trust and vouching layer.
            </p>
            <button className="btn-p" style={{ width:'100%', justifyContent:'center', padding:'14px' }} onClick={connectWallet} disabled={loading}>
              {loading ? 'Authenticating...' : 'Connect Wallet'} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <style>{css}</style>
      <div style={styles.noise} className="noise"></div>

      {/* Ticker */}
      <div style={styles.ticker}>
        <div className="ticker-w">
          <div className="ticker-i">
            {[...Array(2)].map((_, ri) =>
              ['Vouching System', `Network Size: ${vouchersForMe.length + myVouches.length}`,
               'Trust Score Live', 'Sybil-Resistant', 'On-Chain Reputation', 'No KYC Required'
              ].map((item, i) => (
                <span key={`${ri}-${i}`} className="t-item">
                  <span className="t-dot"></span>{item}
                </span>
              ))
            )}
          </div>
        </div>
        <div style={styles.tickerLive}>
          <div className="ld" style={{ width:6, height:6 }}></div>
          <span style={styles.liveText}>LIVE</span>
        </div>
      </div>

      <Navbar />

      <main style={styles.main}>

        {/* Page Header */}
        <div style={{ marginBottom:48 }} className="fu">
          <div style={styles.tagRow}>
            <span className="tag">VOUCHING SYSTEM</span>
            <div style={styles.tagLine}></div>
          </div>
          <h1 style={styles.pageTitle}>Social Trust<br /><em style={{ color:'var(--accent)', fontStyle:'italic', fontWeight:600 }}>Network</em></h1>
          <div style={styles.titleUnderline}></div>
          <p style={styles.pageDesc}>
            Build decentralized trust through social connections. Endorse trusted partners and grow your collective reputation on-chain.
          </p>
        </div>

        {/* Status Message */}
        {message.text && (
          <div style={{
            ...styles.msgBar,
            background: message.type === 'success' ? 'rgba(181,212,168,.08)' : 'rgba(232,112,112,.08)',
            borderColor: message.type === 'success' ? 'rgba(181,212,168,.25)' : 'rgba(232,112,112,.25)',
            color: message.type === 'success' ? 'var(--accent)' : '#e87070',
          }} className="fu">
            {message.type === 'success' ? <CheckCircle size={16} /> : <ShieldAlert size={16} />}
            <span style={{ fontSize:13, fontWeight:500 }}>{message.text}</span>
          </div>
        )}

        {/* Register Identity */}
        {!hasUsername && (
          <div style={{ ...styles.card, padding:'40px', marginBottom:40 }} className="fu">
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={styles.iconBox}><Fingerprint size={22} color="var(--accent)" /></div>
                <div>
                  <div className="tag" style={{ marginBottom:4 }}>IDENTITY</div>
                  <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.03em' }}>Claim Your Handle</h2>
                </div>
              </div>
              <p style={{ color:'var(--td)', fontSize:14, lineHeight:1.75, maxWidth:480 }}>
                Register a unique TrustForge username to participate in social endorsements and governance.
              </p>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <div style={{ position:'relative', flex:1, minWidth:200 }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--td)', fontSize:15, fontWeight:500 }}>@</span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="your_username"
                    maxLength={20}
                    onKeyPress={(e) => e.key === 'Enter' && handleRegisterUsername()}
                    style={styles.input}
                  />
                </div>
                <button className="btn-p" onClick={handleRegisterUsername} disabled={txLoading || !newUsername}>
                  {txLoading ? 'Registering...' : 'Register Identity'} <ArrowRight size={14} />
                </button>
              </div>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--td)', letterSpacing:'.08em' }}>
                LETTERS, NUMBERS AND UNDERSCORES ONLY · 3–20 CHARS
              </span>
            </div>
          </div>
        )}

        {/* Profile Card */}
        {hasUsername && myProfile && (
          <div style={{ ...styles.profileCard, marginBottom:40 }} className="fu">
            <div style={styles.scanLine} className="scan-line"></div>
            <div style={styles.profileGrid}>
              {/* Identity */}
              <div style={styles.profileCol}>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--td)', letterSpacing:'.1em', marginBottom:8 }}>YOUR IDENTITY</div>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
                  <div style={{ ...styles.iconBox, width:52, height:52 }}>
                    <UserCheck size={24} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontSize:28, fontWeight:700, letterSpacing:'-.04em' }}>@{myProfile.username}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--td)' }}>{formatAddress(account)}</div>
                  </div>
                </div>
              </div>

              {/* Trust score */}
              <div style={{ ...styles.profileCol, borderLeft:'1px solid var(--b)', paddingLeft:28 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--td)', letterSpacing:'.1em', marginBottom:8 }}>TRUST SCORE</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:48, fontWeight:700, letterSpacing:'-.05em', lineHeight:1, color: getTrustColor(myProfile.liveTrustScore) }}>
                    {myProfile.liveTrustScore}
                  </span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--td)' }}>/ 1000</span>
                </div>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width:`${(myProfile.liveTrustScore/1000)*100}%` }}></div>
                </div>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, marginTop:6, color: getRiskColor(myProfile.assignedPool) }}>
                  {getRiskName(myProfile.assignedPool).toUpperCase()}
                </div>
              </div>

              {/* Social stats */}
              <div style={{ ...styles.profileCol, borderLeft:'1px solid var(--b)', paddingLeft:28 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--td)', letterSpacing:'.1em', marginBottom:14 }}>NETWORK</div>
                <div style={{ display:'flex', gap:32 }}>
                  <div>
                    <div style={{ fontSize:34, fontWeight:700, letterSpacing:'-.04em' }}>{vouchersForMe.length}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--td)', marginTop:2 }}>ADMIRERS</div>
                  </div>
                  <div>
                    <div style={{ fontSize:34, fontWeight:700, letterSpacing:'-.04em' }}>{myVouches.length}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--td)', marginTop:2 }}>ENDORSED</div>
                  </div>
                  <div>
                    <div style={{ fontSize:34, fontWeight:700, letterSpacing:'-.04em' }}>{myProfile.successfulRepayments}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--td)', marginTop:2 }}>REPAID</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {hasUsername && (
          <div style={styles.tabContainer} className="fu">
            {/* Tab Bar */}
            <div style={styles.tabBar}>
              {[
                { id:'vouch',    label:'Endorse',  icon:UserPlus  },
                { id:'vouchers', label:'Admirers', icon:Award     },
                { id:'vouchees', label:'Portfolio',icon:TrendingUp},
                { id:'info',     label:'Protocol', icon:Info      },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...styles.tabBtn,
                    background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                    color:      activeTab === tab.id ? '#0a150a'        : 'var(--td)',
                  }}
                >
                  <tab.icon size={14} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
                  <span style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.08em' }}>
                    {tab.label.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ padding:'36px 32px' }}>

              {/* ── ENDORSE TAB ── */}
              {activeTab === 'vouch' && (
                <div className="fu">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:32, flexWrap:'wrap', gap:12 }}>
                    <div>
                      <div className="tag" style={{ marginBottom:10 }}>SEARCH NETWORK</div>
                      <h2 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.03em' }}>Social Endorsement</h2>
                      <p style={{ color:'var(--td)', fontSize:13, marginTop:4 }}>Search and vouch for trusted participants in the network.</p>
                    </div>
                    <div style={styles.liveBadge}>
                      <div className="ld" style={{ width:6, height:6 }}></div>
                      <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)', letterSpacing:'.06em' }}>LIVE SEARCH</span>
                    </div>
                  </div>

                  {/* Search bar */}
                  <div style={{ position:'relative', maxWidth:560, marginBottom:32 }}>
                    <Search size={16} color="var(--td)" style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="Search by username..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                      style={{ ...styles.input, paddingLeft:46, paddingRight:130, fontSize:14 }}
                    />
                    <button
                      className="btn-p"
                      onClick={handleSearchUser}
                      disabled={txLoading || !searchUsername}
                      style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', padding:'9px 20px', fontSize:12 }}
                    >
                      {txLoading ? '...' : 'Find'}
                    </button>
                  </div>

                  {/* Search result */}
                  {searchedProfile && (
                    <div style={styles.resultCard} className="fu">
                      <div style={styles.scanLine} className="scan-line"></div>

                      {/* Header row */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28, flexWrap:'wrap', gap:14 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                          <div style={{
                            width:52, height:52, borderRadius:14,
                            background:'linear-gradient(135deg, #b5d4a8, #6daf5c)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:22, fontWeight:700, color:'#0a150a'
                          }}>
                            {searchedProfile.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-.03em' }}>@{searchedProfile.username}</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--td)' }}>{formatAddress(searchedProfile.address)}</div>
                          </div>
                        </div>
                        {!searchedProfile.alreadyVouched && searchedProfile.address.toLowerCase() !== account.toLowerCase()
                          ? (
                            <button className="btn-p" onClick={handleVouchForUser} disabled={txLoading}>
                              <UserPlus size={14} /> Vouch for User
                            </button>
                          ) : searchedProfile.alreadyVouched ? (
                            <div style={styles.endorsedBadge}>
                              <CheckCircle size={14} /> Already Endorsed
                            </div>
                          ) : (
                            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--td)' }}>Your profile</div>
                          )
                        }
                      </div>

                      {/* Stats grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10 }}>
                        {[
                          { label:'Trust Score',   value: searchedProfile.liveTrustScore, color: getTrustColor(searchedProfile.liveTrustScore), icon: ShieldCheck },
                          { label:'Risk Pool',     value: getRiskName(searchedProfile.assignedPool), color: getRiskColor(searchedProfile.assignedPool), icon: LayoutGrid },
                          { label:'Total Loans',   value: searchedProfile.totalLoansTaken,  color:'var(--t)', icon: TrendingUp },
                          { label:'Repayments',    value: searchedProfile.successfulRepayments, color:'var(--accent)', icon: CheckCircle },
                          { label:'Defaults',      value: searchedProfile.defaults,         color:'#e87070', icon: ShieldAlert },
                          { label:'Max Borrow',    value: `$${parseFloat(searchedProfile.maxBorrowingLimit).toFixed(0)}`, color:'var(--accent)', icon: Zap },
                          { label:'Active Loan',   value: searchedProfile.hasActiveLoan ? 'YES' : 'NO', color:'var(--t)', icon: Activity },
                          { label:'Maturity',      value: `LVL ${searchedProfile.maturityLevel}`, color:'#c4a8d4', icon: Award },
                        ].map((s, i) => (
                          <div key={i} style={styles.statCell}>
                            <s.icon size={12} color="var(--td)" style={{ marginBottom:8 }} />
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--td)', letterSpacing:'.08em', marginBottom:4 }}>{s.label.toUpperCase()}</div>
                            <div style={{ fontSize:17, fontWeight:700, letterSpacing:'-.02em', color:s.color }}>{s.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ADMIRERS TAB ── */}
              {activeTab === 'vouchers' && (
                <div className="fu">
                  <div style={{ marginBottom:28 }}>
                    <div className="tag" style={{ marginBottom:10 }}>INCOMING</div>
                    <h2 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.03em' }}>Network Admirers</h2>
                    <p style={{ color:'var(--td)', fontSize:13, marginTop:4 }}>Users who have vouched for your trustworthiness.</p>
                  </div>

                  {vouchersDetails.length === 0 ? (
                    <div style={styles.emptyState}>
                      <Users size={40} color="var(--td)" style={{ marginBottom:14, opacity:.4 }} />
                      <div style={{ fontWeight:600, marginBottom:6 }}>No endorsements yet</div>
                      <div style={{ color:'var(--td)', fontSize:13 }}>Repay loans and contribute to the network to earn trust.</div>
                    </div>
                  ) : (
                    <div style={styles.cardsGrid}>
                      {vouchersDetails.map((v, i) => (
                        <div key={i} style={styles.userCard} className="fc-hover">
                          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
                            <div style={{ width:42, height:42, borderRadius:11, background:'rgba(181,212,168,.12)', border:'1px solid rgba(181,212,168,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:'var(--accent)' }}>
                              {v.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:15 }}>@{v.username}</div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--td)' }}>{formatAddress(v.address)}</div>
                            </div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                            <div style={styles.miniStat}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--td)', marginBottom:3 }}>TRUST</div>
                              <div style={{ fontSize:18, fontWeight:700, color: getTrustColor(v.liveTrustScore) }}>{v.liveTrustScore}</div>
                            </div>
                            <div style={styles.miniStat}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--td)', marginBottom:3 }}>POOL</div>
                              <div style={{ fontSize:12, fontWeight:700, color: getRiskColor(v.assignedPool) }}>{getRiskName(v.assignedPool)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── PORTFOLIO TAB ── */}
              {activeTab === 'vouchees' && (
                <div className="fu">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28, flexWrap:'wrap', gap:12 }}>
                    <div>
                      <div className="tag" style={{ marginBottom:10 }}>OUTGOING</div>
                      <h2 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.03em' }}>Endorsement Portfolio</h2>
                      <p style={{ color:'var(--td)', fontSize:13, marginTop:4 }}>Users you have personally endorsed.</p>
                    </div>
                    {constants && (
                      <div style={styles.warningBadge}>
                        <AlertTriangle size={12} color="#e8c96d" />
                        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'#e8c96d', letterSpacing:'.06em' }}>
                          DEFAULT PENALTY: −{constants.vouchPenaltyOnDefault} PTS
                        </span>
                      </div>
                    )}
                  </div>

                  {voucheesDetails.length === 0 ? (
                    <div style={styles.emptyState}>
                      <UserPlus size={40} color="var(--td)" style={{ marginBottom:14, opacity:.4 }} />
                      <div style={{ fontWeight:600, marginBottom:6 }}>Portfolio is empty</div>
                      <div style={{ color:'var(--td)', fontSize:13 }}>Search and vouch for users you trust to grow your network.</div>
                    </div>
                  ) : (
                    <div style={styles.cardsGrid}>
                      {voucheesDetails.map((v, i) => (
                        <div key={i} style={styles.userCard} className="fc-hover">
                          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
                            <div style={{ width:42, height:42, borderRadius:11, background:'linear-gradient(135deg, rgba(181,212,168,.2), rgba(109,175,92,.15))', border:'1px solid rgba(181,212,168,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:'var(--accent)' }}>
                              {v.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:15 }}>@{v.username}</div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--td)' }}>{formatAddress(v.address)}</div>
                            </div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
                            <div style={styles.miniStat}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--td)', marginBottom:3 }}>TRUST</div>
                              <div style={{ fontSize:16, fontWeight:700, color: getTrustColor(v.liveTrustScore) }}>{v.liveTrustScore}</div>
                            </div>
                            <div style={styles.miniStat}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--td)', marginBottom:3 }}>REPAID</div>
                              <div style={{ fontSize:16, fontWeight:700, color:'var(--accent)' }}>{v.successfulRepayments}</div>
                            </div>
                            <div style={styles.miniStat}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--td)', marginBottom:3 }}>FAULTS</div>
                              <div style={{ fontSize:16, fontWeight:700, color:'#e87070' }}>{v.defaults}</div>
                            </div>
                          </div>
                          {v.hasActiveLoan && (
                            <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--b)', display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', animation:'pdot 2s infinite' }}></div>
                              <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--accent)', letterSpacing:'.06em' }}>ACTIVE CREDIT LINE</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── PROTOCOL TAB ── */}
              {activeTab === 'info' && (
                <div className="fu">
                  <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:32 }}>
                    <div className="tag">PROTOCOL DOCS</div>
                    <div style={{ flex:1, height:1, background:'var(--b)' }}></div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16, marginBottom:16 }}>
                    {/* What is Vouching */}
                    <div style={styles.infoCard} className="fc-hover">
                      <div style={styles.iconBox}><Users size={18} color="var(--accent)" /></div>
                      <h3 style={{ fontSize:16, fontWeight:700, marginBottom:10 }}>Social Trust Mechanism</h3>
                      <p style={{ color:'var(--td)', fontSize:13, lineHeight:1.7 }}>
                        Vouching is a decentralized endorsement protocol. By vouching for a peer, you certify their
                        creditworthiness based on social or professional reputation — becoming a signal the protocol
                        uses to improve their borrowing terms.
                      </p>
                    </div>

                    {/* Benefits */}
                    <div style={styles.infoCard} className="fc-hover">
                      <div style={styles.iconBox}><Award size={18} color="var(--accent)" /></div>
                      <h3 style={{ fontSize:16, fontWeight:700, marginBottom:12 }}>Network Advantages</h3>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {[
                          'Enhanced Trust Scores for borrowers (+30 pts per vouch)',
                          'Higher borrowing limits through maturity growth',
                          'Reduced interest rates via risk-pool migration',
                          'Protocol-wide social credibility and status',
                        ].map((item, i) => (
                          <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                            <CheckCircle size={13} color="var(--accent)" style={{ marginTop:2, flexShrink:0 }} />
                            <span style={{ color:'var(--td)', fontSize:13, lineHeight:1.6 }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Risk warning */}
                  <div style={{ ...styles.infoCard, background:'rgba(232,112,112,.04)', borderColor:'rgba(232,112,112,.15)', marginBottom:16, display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
                    <div style={{ width:52, height:52, borderRadius:14, background:'rgba(232,112,112,.1)', border:'1px solid rgba(232,112,112,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <ShieldAlert size={24} color="#e87070" />
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#e87070', letterSpacing:'.04em', marginBottom:6, textTransform:'uppercase' }}>Risk Exposure & Penalties</div>
                      <p style={{ color:'var(--td)', fontSize:13, lineHeight:1.7, maxWidth:560 }}>
                        Vouching creates a financial link between you and the vouchee. If they default, your trust score
                        will be penalized. Exercise caution and only endorse users with proven integrity.
                      </p>
                    </div>
                  </div>

                  {/* Live constants */}
                  {constants && (
                    <div style={{ ...styles.infoCard, background:'var(--bg3)', borderColor:'var(--b)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
                        <Zap size={13} color="var(--accent)" />
                        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--td)', letterSpacing:'.12em' }}>LIVE PROTOCOL PARAMETERS</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:20 }}>
                        {[
                          { label:'Default Penalty',  value:`-${constants.vouchPenaltyOnDefault}`, color:'#e87070' },
                          { label:'Max Vouches',       value:constants.maxVouchesPerUser,            color:'var(--accent)' },
                          { label:'Repay Reward',      value:`+${constants.tsPaymentHistoryMax}`,    color:'var(--accent)' },
                          { label:'Default Loss',      value:`-${constants.tsRecencyPenaltyMax}`,    color:'#e87070' },
                          { label:'Initial Trust',     value:constants.initialTrustScore,            color:'var(--t)' },
                          { label:'Max Trust',         value:constants.maxTrustScore,                color:'#c4a8d4' },
                        ].map((p, i) => (
                          <div key={i}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--td)', letterSpacing:'.08em', marginBottom:6, textTransform:'uppercase' }}>{p.label}</div>
                            <div style={{ fontSize:26, fontWeight:700, letterSpacing:'-.04em', color:p.color }}>{p.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <span style={{ fontSize:12, color:'var(--td)' }}>Vouching System · TrustForge Protocol · On-Chain Social Trust</span>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div className="ld" style={{ width:6, height:6 }}></div>
            <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)' }}>ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    fontFamily:"'DM Sans','Helvetica Neue',sans-serif",
    background:'#111', minHeight:'100vh', color:'#f0ede8', overflowX:'hidden',
  },
  noise: { position:'fixed', inset:0, pointerEvents:'none', zIndex:999, opacity:.018 },
  main:  { maxWidth:1200, margin:'0 auto', padding:'52px 24px 80px' },
  ticker:{ background:'#0c0c0c', borderBottom:'1px solid rgba(255,255,255,.06)', height:34, display:'flex', alignItems:'center' },
  tickerLive:{ padding:'0 14px', borderLeft:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:7, flexShrink:0 },
  liveText:{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)', letterSpacing:'.08em' },
  tagRow:{ display:'flex', alignItems:'center', gap:14, marginBottom:14 },
  tagLine:{ flex:1, height:1, background:'rgba(255,255,255,.06)' },
  pageTitle:{ fontSize:52, fontWeight:700, letterSpacing:'-.04em', lineHeight:1.05, marginBottom:12 },
  titleUnderline:{ width:44, height:2, background:'var(--accent)', borderRadius:2, marginBottom:16 },
  pageDesc:{ fontSize:15, color:'var(--td)', lineHeight:1.75, maxWidth:480 },
  msgBar:{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderRadius:10, border:'1px solid', marginBottom:24, fontSize:13 },
  card:{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,.06)', borderRadius:16, position:'relative', overflow:'hidden' },
  profileCard:{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,.06)', borderRadius:16, padding:'32px', position:'relative', overflow:'hidden' },
  profileGrid:{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:28, alignItems:'center' },
  profileCol:{ display:'flex', flexDirection:'column', justifyContent:'center' },
  scanLine:{ position:'absolute', left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(181,212,168,.4),transparent)', animation:'scan 5s linear infinite', pointerEvents:'none', zIndex:1 },
  barTrack:{ height:5, borderRadius:99, background:'rgba(255,255,255,.07)', overflow:'hidden', marginBottom:4 },
  barFill:{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#6daf5c,#b5d4a8)', transition:'width 1s ease', boxShadow:'0 0 8px rgba(181,212,168,.3)' },
  tabContainer:{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,.06)', borderRadius:16, overflow:'hidden' },
  tabBar:{ display:'flex', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'8px 8px 0', gap:4 },
  tabBtn:{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px 12px', borderRadius:'10px 10px 0 0', border:'none', cursor:'pointer', transition:'all .2s', fontFamily:'inherit' },
  input:{ width:'100%', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'13px 16px 13px 46px', color:'#f0ede8', fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' },
  resultCard:{ background:'#151515', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:'28px', position:'relative', overflow:'hidden' },
  statCell:{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:12, padding:'16px 14px', transition:'all .2s' },
  cardsGrid:{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14 },
  userCard:{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'22px', transition:'all .25s', cursor:'default' },
  miniStat:{ background:'rgba(0,0,0,.3)', borderRadius:10, padding:'12px', border:'1px solid rgba(255,255,255,.05)' },
  emptyState:{ textAlign:'center', padding:'56px 24px', background:'rgba(255,255,255,.02)', borderRadius:14, border:'1px dashed rgba(255,255,255,.07)' },
  infoCard:{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'24px' },
  iconBox:{ width:44, height:44, borderRadius:11, background:'rgba(181,212,168,.1)', border:'1px solid rgba(181,212,168,.18)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 },
  liveBadge:{ display:'flex', alignItems:'center', gap:7, padding:'7px 12px', borderRadius:8, background:'rgba(181,212,168,.06)', border:'1px solid rgba(181,212,168,.15)' },
  warningBadge:{ display:'flex', alignItems:'center', gap:7, padding:'7px 12px', borderRadius:8, background:'rgba(232,201,109,.06)', border:'1px solid rgba(232,201,109,.2)' },
  endorsedBadge:{ display:'flex', alignItems:'center', gap:7, padding:'12px 20px', borderRadius:10, background:'rgba(181,212,168,.08)', border:'1px solid rgba(181,212,168,.2)', color:'var(--accent)', fontSize:13, fontWeight:600 },
  footer:{ background:'#1a1a1a', borderTop:'1px solid rgba(255,255,255,.06)', padding:'24px 0' },
  footerInner:{ maxWidth:1200, margin:'0 auto', padding:'0 24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
  :root {
    --bg:#111; --bg2:#1a1a1a; --bg3:#222;
    --accent:#b5d4a8; --accent2:#8fc47f;
    --b:rgba(255,255,255,0.06); --b2:rgba(255,255,255,0.1);
    --t:#f0ede8; --tm:#999; --td:#666;
    --mono:'DM Mono',monospace;
  }
  * { box-sizing:border-box; }
  .noise {
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size:150px;
  }
  .btn-p {
    background:var(--accent); color:#0a150a; border:none;
    padding:11px 22px; border-radius:9px; font-size:13px; font-weight:600;
    cursor:pointer; display:inline-flex; align-items:center; gap:7px;
    transition:all .22s; font-family:'DM Sans',sans-serif;
  }
  .btn-p:hover { background:#8fc47f; transform:translateY(-1px); box-shadow:0 6px 24px rgba(181,212,168,.25); }
  .btn-p:disabled { opacity:.45; cursor:not-allowed; transform:none; }
  .tag {
    font-family:var(--mono); font-size:10px; letter-spacing:.1em; color:var(--accent);
    background:rgba(181,212,168,.08); border:1px solid rgba(181,212,168,.18);
    padding:3px 8px; border-radius:4px; display:inline-block;
  }
  .fc-hover { transition:all .25s; }
  .fc-hover:hover { border-color:rgba(181,212,168,.22) !important; background:rgba(181,212,168,.03) !important; transform:translateY(-2px); }
  .fu { animation:fu .65s ease forwards; }
  .ld { width:7px; height:7px; background:var(--accent); border-radius:50%; animation:pdot 2s infinite; position:relative; flex-shrink:0; }
  .ld::after { content:''; position:absolute; inset:-3px; border:1px solid var(--accent); border-radius:50%; animation:pring 2s infinite; }
  .ticker-w { overflow:hidden; white-space:nowrap; flex:1; }
  .ticker-i { display:inline-flex; animation:ticker 28s linear infinite; }
  .t-item { display:inline-flex; align-items:center; gap:8px; padding:0 24px; font-family:var(--mono); font-size:10px; color:var(--td); }
  .t-dot { width:3px; height:3px; border-radius:50%; background:rgba(255,255,255,.12); }
  .scan-line { animation:scan 5s linear infinite; }
  input::placeholder { color:#555; }
  input:focus { border-color:rgba(181,212,168,.35) !important; }
  @keyframes fu    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(1200%);opacity:0} }
  @keyframes ticker{ 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes pdot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.75)} }
  @keyframes pring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.4);opacity:0} }
`;

export default VouchingSystem;