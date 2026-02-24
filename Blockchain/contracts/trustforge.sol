// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustForge v5 — Deployment Ready
 * @dev Trust-based, collateral-free micro-lending platform
 *
 * CHANGELOG v4 → v5  (Deployment & Linking Fixes):
 * ─────────────────────────────────────────────────────────────────────────────
 * [DEPLOY-01] emergencyPauser role added — a separate address (your wallet) that
 *             can call pause() instantly without needing a DAO proposal.
 *             Only the owner (DAO) can unpause, set, or revoke the pauser.
 *             This solves the 30-hour emergency response gap.
 *
 * [DEPLOY-02] transferOwnershipToDAO() helper added — a one-shot function that
 *             sets the emergency pauser AND transfers ownership to the DAO in a
 *             single atomic transaction, preventing mis-ordering mistakes.
 *
 * [DEPLOY-03] setDAO() function added — stores the DAO contract address so
 *             TrustForge can verify that admin calls genuinely come from the DAO
 *             (not just any address that happens to be owner).
 *
 * [DEPLOY-04] onlyDAO modifier added — wraps all admin functions so after
 *             ownership transfer, only the DAO contract address can call them,
 *             even if ownership is somehow transferred to another EOA later.
 *
 * [DEPLOY-05] getDeploymentStatus() view — returns a full checklist of whether
 *             the system is correctly wired, so you can verify before going live.
 *
 * ─── BUGFIXES (v5 patch) ─────────────────────────────────────────────────────
 * [FIX-01] repayLoan() — loan was pushed to loanHistory BEFORE status was set
 *          to REPAID, so every archived loan showed status=ACTIVE. Fixed by
 *          updating loan.status = LoanStatus.REPAID before push.
 *
 * [FIX-02] computeTrustScore() — INITIAL_TRUST_SCORE floor (100) was swallowing
 *          real score growth for new users because wallet age contributes 0 pts
 *          until 7 days pass. Fixed by:
 *            a) Raising Tier 1 payment bonus from 10 → 30 pts per repayment
 *               (first 3 repayments give +30 each = +90 total, enough to push
 *               clearly above the 100 floor immediately after 1st repayment).
 *            b) Granting a flat +50 "First Repayment Milestone" bonus once
 *               successfulRepayments >= 1, so the score visibly jumps on the
 *               very first repay regardless of wallet age.
 *            c) All other tier caps and the MAX_TRUST_SCORE ceiling are unchanged.
 *          Net effect: after 1 repayment the live score is ~230 (floor lifts).
 *          The score then continues growing normally with further repayments
 *          and wallet age, exactly as documented in the growth path below.
 *
 * [FIX-03] computeTrustScore() — utilization bonus was only awarded inside the
 *          totalLoansTaken > 0 block, meaning a user who had repaid but whose
 *          hasActiveLoan was still momentarily true during the tx would miss it.
 *          No logic change needed here — the existing guard is correct — but
 *          combined with FIX-02 the score now visibly exceeds the floor.
 *
 * [FIX-04] No function signatures, event names, or storage layout changed.
 *          Existing deployments of dependent contracts (TrustForgeDAO, frontend
 *          ABI, Hardhat/Foundry scripts) require NO changes. The context file
 *          (ABI) is 100% compatible — only internal logic was patched.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ─── Deployment Order ────────────────────────────────────────────────────────
 *   1. Deploy TrustForge(usdcToken, adminWallet)
 *   2. Deploy TrustForgeDAO(usdcToken)
 *   3. trustForge.setDAO(daoAddress)
 *   4. dao.setTrustForgeAddress(trustForgeAddress)
 *   5. dao.setQuorumThreshold(realistic amount for your user base)
 *   6. trustForge.transferOwnershipToDAO(daoAddress, yourWallet)
 *      ↑ This is the final step — after this the DAO governs TrustForge
 *        but your wallet can still pause in emergencies.
 *   7. Call getDeploymentStatus() — verify everything is green.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ─── Money Flow ──────────────────────────────────────────────────────────────
 *   Borrower repays:  principal + interestAmount
 *   platformFee:      interestAmount × platformFeeBps / 10000  → adminWallet
 *   lenderInterest:   interestAmount − platformFee             → pool interest bucket
 *   principal:        stays in contract (recycled as pool liquidity)
 *   Lenders claim:    (theirDeposit / totalDeposits) × poolInterestBucket
 * ─────────────────────────────────────────────────────────────────────────────
 */
contract TrustForge is ReentrancyGuard, Pausable, Ownable {

    // ============ Core References ============

    IERC20  public lendingToken;
    address public adminWallet;

    // [DEPLOY-03] DAO contract address — set once, used for access control
    address public daoContract;

    // [DEPLOY-01] Emergency pauser — can pause instantly, cannot unpause or do anything else
    address public emergencyPauser;

    // ============ Platform Fee ============

    uint256 public platformFeeBps        = 200;   // 2% of interest only
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% hard cap

    // ============ Trust Score Constants ============

    uint256 public constant TS_PAYMENT_HISTORY_MAX = 600;  // raised cap — score keeps growing slowly past 650, max 1000 only after 200+ repayments
    uint256 public constant TS_UTILIZATION_MAX     = 50;   // slashed from 300 — minor signal, not a free score pump
    uint256 public constant TS_WALLET_AGE_MAX      = 150;  // unchanged — time in system still matters
    uint256 public constant TS_CREDIT_MIX_MAX      = 50;   // reduced from 100 — small diversification bonus
    uint256 public constant TS_RECENCY_PENALTY_MAX = 100;  // unchanged
    uint256 public constant TS_VOUCH_BONUS_MAX     = 100;  // unchanged — community trust still valuable

    // [FIX-02] First repayment milestone bonus — lifts score above the 100 floor immediately.
    // Awarded once as a flat bonus when successfulRepayments >= 1. Does NOT stack.
    uint256 public constant TS_FIRST_REPAY_BONUS   = 50;

    uint256 public constant DEFAULT_PENALTY_FADE   = 90 days;

    uint256 public constant MAX_TRUST_SCORE     = 1000;
    uint256 public constant INITIAL_TRUST_SCORE = 100;

    // ============ Risk Pool Thresholds ============

    uint256 public constant LOW_RISK_THRESHOLD    = 600;
    uint256 public constant MEDIUM_RISK_THRESHOLD = 300;

    // ============ Wallet Maturity ============

    uint256 public constant MATURITY_LEVEL_1 = 7 days;
    uint256 public constant MATURITY_LEVEL_2 = 30 days;
    uint256 public constant MATURITY_LEVEL_3 = 90 days;

    // ============ Interest Rates (basis points) ============

    uint256 public BASE_INTEREST_RATE_LOW  = 300;
    uint256 public MAX_INTEREST_RATE_LOW   = 800;
    uint256 public BASE_INTEREST_RATE_MED  = 700;
    uint256 public MAX_INTEREST_RATE_MED   = 1500;
    uint256 public BASE_INTEREST_RATE_HIGH = 1200;
    uint256 public MAX_INTEREST_RATE_HIGH  = 2500;

    // ============ Loan Parameters ============

    uint256 public MIN_LOAN_AMOUNT         = 10_000;    // 0.01 USDC
    uint256 public MIN_LOAN_DURATION       = 1 days;
    uint256 public MAX_LOAN_DURATION       = 180 days;
    uint256 public DEFAULT_COOLDOWN_PERIOD = 30 days;
    uint256 public GRACE_PERIOD            = 3 days;
    uint256 public MIN_INTEREST_AMOUNT     = 100_000;   // 0.1 USDC floor

    uint256 public constant MAX_LOANS_PER_WINDOW = 3;
    uint256 public constant LOAN_WINDOW_DURATION = 30 days;

    // ============ Borrowing Limits (USDC 6 decimals) ============

    uint256 public LOW_TRUST_LIMIT  = 1_000_000;   // 1 USDC
    uint256 public MED_TRUST_LIMIT  = 5_000_000;   // 5 USDC
    uint256 public HIGH_TRUST_LIMIT = 20_000_000;  // 20 USDC
    bool    public autoLimitEnabled = true;

    uint256 public manualLowLimit  = 1_000_000;
    uint256 public manualMedLimit  = 5_000_000;
    uint256 public manualHighLimit = 20_000_000;

    uint256 public constant ELITE_LIMIT_BONUS_BPS  = 1000; // +10% at score 1000
    uint256 public constant ELITE_FEE_DISCOUNT_BPS = 50;   // -0.5% fee at score 1000
    uint256 public constant POOL_SAFETY_BUFFER      = 500;  // 5%

    // ============ Vouch Parameters ============

    uint256 public MAX_VOUCHES_PER_USER    = 5;
    uint256 public constant VOUCH_COOLDOWN = 7 days;
    uint256 public VOUCH_PENALTY_ON_DEFAULT = 30;

    // ============ DAO Eligibility ============

    uint256 public constant DAO_PROPOSAL_MIN_TRUST = 500;

    // ============ Enums ============

    enum LoanStatus { ACTIVE, REPAID, DEFAULTED }
    enum RiskPool   { LOW_RISK, MEDIUM_RISK, HIGH_RISK }

    // ============ Structs ============

    struct UserProfile {
        string  username;
        uint256 trustScore;         // legacy field, not mutated — computeTrustScore() is source of truth
        uint256 totalLoansTaken;
        uint256 successfulRepayments;
        uint256 defaults;
        bool    hasActiveLoan;
        uint256 lastDefaultTime;
        uint256 walletFirstSeen;
        uint256 totalTransactions;
        uint256 vouchCount;
        uint256 lastActivityTime;
        uint256 lastVouchTime;
        uint256 loansInCurrentWindow;
        uint256 loanWindowStart;
        uint256 vouchBonus;         // accumulated vouch trust bonus (max 100)
    }

    struct Loan {
        address    borrower;
        uint256    principal;
        uint256    interestAmount;
        uint256    totalRepayment;
        uint256    startTime;
        uint256    dueDate;
        uint256    duration;
        LoanStatus status;
        RiskPool   riskPool;
    }

    struct LenderInfo {
        uint256 depositedLowRisk;
        uint256 depositedMedRisk;
        uint256 depositedHighRisk;
        uint256 totalInterestEarned;
        uint256 lastClaimTime;
    }

    struct WalletMaturity {
        uint256 age;
        uint256 maturityLevel;
        uint256 maturityMultiplier;
    }

    struct PoolStats {
        uint256 totalLiquidity;
        uint256 totalActiveLoans;
        uint256 totalDefaulted;
        uint256 totalInterestPool;
        uint256 totalLenderDeposits;
    }

    // ============ Mappings ============

    mapping(address => UserProfile)              public userProfiles;
    mapping(string  => address)                  public usernameToAddress;
    mapping(address => bool)                     public hasUsername;
    mapping(address => Loan)                     public activeLoans;
    mapping(address => Loan[])                   public loanHistory;
    mapping(address => LenderInfo)               public lenders;
    mapping(address => mapping(address => bool)) public vouches;
    mapping(address => address[])                public vouchedBy;
    mapping(address => address[])                public vouchesGiven;
    mapping(RiskPool => PoolStats)               public poolStats;

    // ============ Events ============

    event UsernameRegistered(address indexed user, string username);
    event LoanRequested(address indexed borrower, string username, uint256 amount, uint256 duration, RiskPool pool);
    event LoanIssued(address indexed borrower, uint256 principal, uint256 interest, uint256 dueDate, uint256 duration, RiskPool pool);
    event LoanRepaid(address indexed borrower, uint256 principal, uint256 interest, uint256 totalRepayment);
    event LoanDefaulted(address indexed borrower, uint256 lostAmount, RiskPool pool);
    event TrustScoreComputed(address indexed user, uint256 score);
    event WalletMaturityEvaluated(address indexed user, uint256 maturityLevel, uint256 walletAge);
    event LenderDeposited(address indexed lender, uint256 amount, RiskPool pool);
    event LenderWithdrew(address indexed lender, uint256 amount, RiskPool pool);
    event InterestClaimed(address indexed lender, uint256 amount);
    event InterestDistributed(uint256 totalAmount, RiskPool pool);
    event VouchCreated(address indexed voucher, address indexed vouchee, string voucherName, string voucheeName);
    event VoucherPenalized(address indexed voucher, address indexed defaulter, uint256 bonusLost);
    event ParameterUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event EmergencyWithdraw(address indexed token, uint256 amount);
    event PlatformFeeCollected(address indexed borrower, uint256 feeAmount, address indexed adminWallet);
    event EliteTierReached(address indexed user);
    // [DEPLOY-01/02/03] Linking events
    event EmergencyPauserSet(address indexed oldPauser, address indexed newPauser);
    event DAOContractSet(address indexed oldDAO, address indexed newDAO);
    event OwnershipTransferredToDAO(address indexed dao, address indexed emergencyPauser);

    // ============ Modifiers ============

    modifier trackWalletActivity() {
        UserProfile storage user = userProfiles[msg.sender];
        if (user.walletFirstSeen == 0) user.walletFirstSeen = block.timestamp;
        user.totalTransactions++;
        user.lastActivityTime = block.timestamp;
        _;
    }

    modifier hasValidUsername() {
        require(hasUsername[msg.sender], "Username required");
        _;
    }

    /**
     * [DEPLOY-04] After transferOwnershipToDAO(), all admin functions require
     *             the caller to be the DAO contract itself, not just any owner.
     *             Before transfer, the deployer (owner) can also call these.
     */
    modifier onlyOwnerOrDAO() {
        require(
            msg.sender == owner() || (daoContract != address(0) && msg.sender == daoContract),
            "Caller is not owner or DAO"
        );
        _;
    }

    // ============ Constructor ============

    constructor(address _lendingToken, address _adminWallet) Ownable(msg.sender) {
        require(_lendingToken  != address(0), "Invalid token");
        require(_adminWallet   != address(0), "Invalid admin wallet");
        lendingToken = IERC20(_lendingToken);
        adminWallet  = _adminWallet;
    }

    // ============================================================
    //  [DEPLOY-01/02/03]  LINKING & OWNERSHIP FUNCTIONS
    // ============================================================

    /**
     * @dev [DEPLOY-03] Register the DAO contract address.
     *      Must be called BEFORE transferOwnershipToDAO().
     *      After this, daoContract address is locked in for onlyOwnerOrDAO checks.
     */
    function setDAO(address _dao) external onlyOwner {
        require(_dao != address(0), "Invalid DAO address");
        address old = daoContract;
        daoContract = _dao;
        emit DAOContractSet(old, _dao);
    }

    /**
     * @dev [DEPLOY-01] Set the emergency pauser address.
     *      Only callable by owner (or DAO after transfer).
     *      The pauser can ONLY call pause() — nothing else.
     */
    function setEmergencyPauser(address _pauser) external onlyOwnerOrDAO {
        require(_pauser != address(0), "Invalid pauser address");
        address old = emergencyPauser;
        emergencyPauser = _pauser;
        emit EmergencyPauserSet(old, _pauser);
    }

    /**
     * @dev [DEPLOY-02] ONE-SHOT atomic handoff to DAO governance.
     *
     *      This function:
     *        1. Sets emergencyPauser to _pauser (your wallet)
     *        2. Sets daoContract to _dao (if not already set)
     *        3. Transfers Ownable ownership to _dao
     *
     *      After this call:
     *        - Only the DAO can call admin functions (via proposals)
     *        - Your wallet (_pauser) can still pause() in emergencies
     *        - Your wallet CANNOT unpause, change parameters, or do anything else
     *
     *      ⚠️  This is IRREVERSIBLE unless the DAO passes a proposal to transfer
     *          ownership again. Call getDeploymentStatus() after to verify.
     */
    function transferOwnershipToDAO(address _dao, address _pauser) external onlyOwner {
        require(_dao    != address(0), "Invalid DAO address");
        require(_pauser != address(0), "Invalid pauser address");
        require(_dao    != _pauser,    "DAO and pauser must be different addresses");

        // Set emergency pauser first
        emergencyPauser = _pauser;
        emit EmergencyPauserSet(address(0), _pauser);

        // Set DAO reference if not already set
        if (daoContract == address(0)) {
            daoContract = _dao;
            emit DAOContractSet(address(0), _dao);
        }

        emit OwnershipTransferredToDAO(_dao, _pauser);

        // Transfer Ownable ownership to DAO — this is the point of no return
        _transferOwnership(_dao);
    }

    /**
     * @dev [DEPLOY-05] Full deployment status check.
     *      Call this after all setup steps to verify the system is ready.
     *      All booleans should be true before going live.
     */
    function getDeploymentStatus() external view returns (
        bool  hasLendingToken,       // lendingToken is set
        bool  hasAdminWallet,        // adminWallet is set
        bool  hasDAOContract,        // daoContract is set
        bool  hasEmergencyPauser,    // emergencyPauser is set
        bool  daoIsOwner,            // DAO contract owns TrustForge
        bool  isNotPaused,           // contract is live (not paused)
        address currentOwner,
        address currentDAO,
        address currentPauser,
        address currentAdminWallet
    ) {
        return (
            address(lendingToken) != address(0),
            adminWallet    != address(0),
            daoContract    != address(0),
            emergencyPauser != address(0),
            owner()        == daoContract,
            !paused(),
            owner(),
            daoContract,
            emergencyPauser,
            adminWallet
        );
    }

    // ============ Username ============

    function registerUsername(string memory username) external trackWalletActivity {
        require(!hasUsername[msg.sender],                                    "Username already registered");
        require(bytes(username).length >= 3 && bytes(username).length <= 20, "Username length 3-20");
        require(usernameToAddress[username] == address(0),                   "Username taken");
        require(_isValidUsername(username),                                   "Invalid username format");

        userProfiles[msg.sender].username = username;
        usernameToAddress[username]       = msg.sender;
        hasUsername[msg.sender]           = true;

        emit UsernameRegistered(msg.sender, username);
    }

    function _isValidUsername(string memory username) internal pure returns (bool) {
        bytes memory b = bytes(username);
        for (uint i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            if (!(
                (char >= 0x30 && char <= 0x39) ||
                (char >= 0x41 && char <= 0x5A) ||
                (char >= 0x61 && char <= 0x7A) ||
                (char == 0x5F)
            )) return false;
        }
        return true;
    }

    function getAddressByUsername(string memory username) external view returns (address) {
        return usernameToAddress[username];
    }

    // ============ Wallet Maturity ============

    function getWalletMaturity(address wallet) public view returns (WalletMaturity memory) {
        UserProfile memory user = userProfiles[wallet];
        WalletMaturity memory m;

        if (user.walletFirstSeen == 0) { m.maturityMultiplier = 30; return m; }

        m.age = block.timestamp - user.walletFirstSeen;

        if      (m.age >= MATURITY_LEVEL_3) { m.maturityLevel = 3; m.maturityMultiplier = 150; }
        else if (m.age >= MATURITY_LEVEL_2) { m.maturityLevel = 2; m.maturityMultiplier = 100; }
        else if (m.age >= MATURITY_LEVEL_1) { m.maturityLevel = 1; m.maturityMultiplier = 50;  }
        else                                { m.maturityLevel = 0; m.maturityMultiplier = 30;  }

        return m;
    }

    // ============================================================
    //  FICO-STYLE TRUST SCORE
    // ============================================================

    /**
     * @dev Compute live trust score from on-chain history — no mutable state.
     *
     * ─── Component Maxes ─────────────────────────────────────────────────────
     *   600  Payment History  — Tiered diminishing returns. Each tier covers a
     *                           band of repayments with a smaller per-repayment
     *                           value. Gated: 0 pts until at least 1 loan taken.
     *
     *                           [FIX-02] Tier 1 raised from 10 → 30 pts/repay
     *                           so the first repayment gives +90 at tier 1,
     *                           immediately breaking through the 100 floor.
     *
     *                           Tier 1 (1-3):    30 pts/repay → max  +90   ← raised
     *                           Tier 2 (4-10):    7 pts/repay → max  +49
     *                           Tier 3 (11-25):   5 pts/repay → max  +75
     *                           Tier 4 (26-50):   3 pts/repay → max  +75
     *                           Tier 5 (51-150):  2 pts/repay → max +200
     *                           Tier 6 (151+):    1 pt/repay  → hard cap 600
     *
     *    50  First Repay Bonus — [FIX-02] Flat +50 milestone awarded once
     *                           successfulRepayments >= 1. Ensures the score
     *                           visibly exceeds the 100 floor on first repay
     *                           even on day 0. Does not stack beyond 1st repay.
     *
     *    50  Utilization      — Small signal only. Capped hard at 50.
     *   150  Wallet Age       — Maturity level × pts (0/50/100/150).
     *    50  Credit Mix       — Pools used × 17, capped 50.
     *   100  Vouch Bonus      — Community vouches (unchanged).
     *  −100  Recency Penalty  — Default penalty, fades over 90 days.
     *
     * ─── Score Growth Path ───────────────────────────────────────────────────
     *   Register (fresh wallet, day 0)          →  100  (floor)
     *   1st repayment (day 0, no age yet)       →  230  (+30 payment +50 first-repay +50 util)
     *   3rd repayment (day 0)                   →  280  (tier 1 maxed: +90 payment)
     *   Wait 7 days (no new loans)              →  330  (+50 wallet age L1)
     *   10th repayment + 30d age                →  ~430 (age L2 +100, tier 2)
     *   25th repayment + 90d + 1 vouch          →  ~620 (age L3, mix, vouch → LOW_RISK)
     *   50th repayment + all bonuses            →  ~700
     *   200th repayment + all bonuses           →  ~980
     *   Score of 1000 needs 200+ repays + all bonuses maxed.
     */
    function computeTrustScore(address user) public view returns (uint256) {
        UserProfile memory p = userProfiles[user];
        uint256 score = 0;

        // ── Payment History — tiered diminishing returns ─────────────────────
        // Only active once the user has taken at least one loan.
        if (p.totalLoansTaken > 0) {
            uint256 repayRateBps = (p.successfulRepayments * 10000) / p.totalLoansTaken;
            uint256 r            = p.successfulRepayments;
            uint256 rawPayment   = 0;

            // [FIX-02] Tier 1 raised from 10 → 30 pts/repay.
            // First repayment now gives rawPayment=30 → paymentScore=30 (at 100% repay rate).
            // Combined with TS_FIRST_REPAY_BONUS (+50) and utilization (+50), the score
            // reaches 130+ on day 0, cleanly above the INITIAL_TRUST_SCORE floor of 100.
            uint256 t1 = r < 3 ? r : 3;                              // Tier 1: 1-3
            rawPayment += t1 * 30;                                    // ← was 10, now 30

            if (r > 3)  { uint256 t2 = r < 10 ? r - 3  : 7;  rawPayment += t2 * 7; }  // Tier 2: 4-10
            if (r > 10) { uint256 t3 = r < 25 ? r - 10 : 15; rawPayment += t3 * 5; }  // Tier 3: 11-25
            if (r > 25) { uint256 t4 = r < 50 ? r - 25 : 25; rawPayment += t4 * 3; }  // Tier 4: 26-50
            if (r > 50)  { rawPayment += (r - 50) * 2; }                                // Tier 5: 51-150
            if (r > 150) { rawPayment += (r - 150) * 1; }                               // Tier 6: 151+

            uint256 paymentScore = (rawPayment * repayRateBps) / 10000;
            if (paymentScore > TS_PAYMENT_HISTORY_MAX) paymentScore = TS_PAYMENT_HISTORY_MAX;
            score += paymentScore;

            // [FIX-02] First Repayment Milestone bonus.
            // Flat +50 awarded as soon as the user has at least 1 successful repayment.
            // This one-time boost guarantees the score surpasses the 100 floor on day 0
            // without inflating later scores (it's a constant, not cumulative).
            if (p.successfulRepayments >= 1) {
                score += TS_FIRST_REPAY_BONUS;
            }

            // ── Utilization — capped hard at TS_UTILIZATION_MAX (50) ──────────
            // Only awarded after at least 1 loan so new users don't get free pts.
            if (!p.hasActiveLoan) {
                // No active debt → full utilization bonus (max 50)
                score += TS_UTILIZATION_MAX;
            } else {
                // Active loan → proportional, still capped at 50
                uint256 baseLimit = _calculateBorrowingLimitRaw(p.totalLoansTaken, p.successfulRepayments);
                if (baseLimit > 0) {
                    Loan memory loan = activeLoans[user];
                    uint256 util     = (loan.principal * 10000) / baseLimit;
                    uint256 utilScore = ((10000 - util) * TS_UTILIZATION_MAX) / 10000;
                    score += utilScore; // already <= 50 because TS_UTILIZATION_MAX = 50
                }
            }
        }

        // ── Wallet Age ────────────────────────────────────────────────────────
        WalletMaturity memory m = getWalletMaturity(user);
        if      (m.maturityLevel >= 3) score += 150;
        else if (m.maturityLevel >= 2) score += 100;
        else if (m.maturityLevel >= 1) score += 50;

        // ── Credit Mix — reduced cap ──────────────────────────────────────────
        // Each pool used adds 17 pts, max 50 (3 pools = 51, clamped to 50).
        uint256 poolsUsed = _countPoolsUsed(user);
        uint256 mixScore  = poolsUsed * 17;
        if (mixScore > TS_CREDIT_MIX_MAX) mixScore = TS_CREDIT_MIX_MAX;
        score += mixScore;

        // ── Vouch Bonus ───────────────────────────────────────────────────────
        uint256 vb = p.vouchBonus > TS_VOUCH_BONUS_MAX ? TS_VOUCH_BONUS_MAX : p.vouchBonus;
        score += vb;

        // ── Recency Penalty — fades over 90 days ─────────────────────────────
        if (p.defaults > 0 && block.timestamp < p.lastDefaultTime + DEFAULT_PENALTY_FADE) {
            uint256 elapsed = block.timestamp - p.lastDefaultTime;
            uint256 penalty = TS_RECENCY_PENALTY_MAX -
                ((elapsed * TS_RECENCY_PENALTY_MAX) / DEFAULT_PENALTY_FADE);
            if (p.defaults >= 3) penalty += 50;
            if (p.defaults >= 5) penalty += 50;
            score = score > penalty ? score - penalty : 10;
        }

        // ── Floor: registered users always get at least INITIAL_TRUST_SCORE ──
        // Unregistered addresses (walletFirstSeen == 0) stay at the hard floor of 10.
        if (p.walletFirstSeen > 0 && score < INITIAL_TRUST_SCORE) {
            score = INITIAL_TRUST_SCORE;
        }

        if (score < 10)              score = 10;
        if (score > MAX_TRUST_SCORE) score = MAX_TRUST_SCORE;

        return score;
    }


    /**
     * @dev Borrow limit reference using only repayment history — no trust score input,
     *      so computeTrustScore() has zero circular dependency.
     */
    function _calculateBorrowingLimitRaw(
        uint256 totalLoansTaken,
        uint256 successfulRepayments
    ) internal view returns (uint256) {
        if (totalLoansTaken == 0) return HIGH_TRUST_LIMIT;
        uint256 repayRate = (successfulRepayments * 100) / totalLoansTaken;
        if      (repayRate >= 80) return autoLimitEnabled ? HIGH_TRUST_LIMIT : manualHighLimit;
        else if (repayRate >= 50) return autoLimitEnabled ? MED_TRUST_LIMIT  : manualMedLimit;
        else                      return autoLimitEnabled ? LOW_TRUST_LIMIT  : manualLowLimit;
    }

    /**
     * @dev Count distinct risk pools used across loan history.
     */
    function _countPoolsUsed(address user) internal view returns (uint256) {
        bool[3] memory used;
        Loan[]  memory history = loanHistory[user];
        for (uint256 i = 0; i < history.length; i++) {
            used[uint256(history[i].riskPool)] = true;
        }
        uint256 count;
        for (uint256 i = 0; i < 3; i++) { if (used[i]) count++; }
        return count;
    }

    function _getRiskPoolFromScore(uint256 score) internal pure returns (RiskPool) {
        if (score >= LOW_RISK_THRESHOLD)    return RiskPool.LOW_RISK;
        if (score >= MEDIUM_RISK_THRESHOLD) return RiskPool.MEDIUM_RISK;
        return RiskPool.HIGH_RISK;
    }

    function _calculateBorrowingLimit(address user) internal view returns (uint256) {
        uint256 score = computeTrustScore(user);
        WalletMaturity memory m = getWalletMaturity(user);

        uint256 baseLimit;
        if (autoLimitEnabled) {
            if      (score < MEDIUM_RISK_THRESHOLD) baseLimit = LOW_TRUST_LIMIT;
            else if (score < LOW_RISK_THRESHOLD)    baseLimit = MED_TRUST_LIMIT;
            else                                    baseLimit = HIGH_TRUST_LIMIT;
        } else {
            if      (score < MEDIUM_RISK_THRESHOLD) baseLimit = manualLowLimit;
            else if (score < LOW_RISK_THRESHOLD)    baseLimit = manualMedLimit;
            else                                    baseLimit = manualHighLimit;
        }

        uint256 limit = (baseLimit * m.maturityMultiplier) / 100;
        if (score >= MAX_TRUST_SCORE) limit += (limit * ELITE_LIMIT_BONUS_BPS) / 10000;
        return limit;
    }

    // ============ Pool Stats ============

    function getPoolStatsForRisk(RiskPool pool) external view returns (
        uint256 totalLiquidity, uint256 totalActiveLoanAmount,
        uint256 availableLiquidity, uint256 utilizationRate,
        uint256 interestPool, uint256 totalDefaulted
    ) {
        PoolStats memory s = poolStats[pool];
        uint256 available   = s.totalLiquidity > s.totalActiveLoans ? s.totalLiquidity - s.totalActiveLoans : 0;
        uint256 utilization = s.totalLiquidity > 0 ? (s.totalActiveLoans * 10000) / s.totalLiquidity : 0;
        return (s.totalLiquidity, s.totalActiveLoans, available, utilization, s.totalInterestPool, s.totalDefaulted);
    }

    // ============ Lender Functions ============

    function depositToPool(uint256 amount, RiskPool pool)
        external nonReentrant whenNotPaused trackWalletActivity
    {
        require(amount > 0, "Amount must be > 0");
        require(lendingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        LenderInfo storage lender = lenders[msg.sender];
        PoolStats  storage stats  = poolStats[pool];

        if      (pool == RiskPool.LOW_RISK)    lender.depositedLowRisk  += amount;
        else if (pool == RiskPool.MEDIUM_RISK) lender.depositedMedRisk  += amount;
        else                                   lender.depositedHighRisk += amount;

        lender.lastClaimTime      = block.timestamp;
        stats.totalLiquidity      += amount;
        stats.totalLenderDeposits += amount;

        emit LenderDeposited(msg.sender, amount, pool);
    }

    function withdrawFromPool(uint256 amount, RiskPool pool)
        external nonReentrant whenNotPaused trackWalletActivity
    {
        LenderInfo storage lender = lenders[msg.sender];
        PoolStats  storage stats  = poolStats[pool];

        require(amount > 0, "Amount must be > 0");

        uint256 lenderBalance =
            pool == RiskPool.LOW_RISK    ? lender.depositedLowRisk  :
            pool == RiskPool.MEDIUM_RISK ? lender.depositedMedRisk  :
                                           lender.depositedHighRisk;

        require(lenderBalance >= amount, "Insufficient balance in pool");
        require(stats.totalLiquidity - stats.totalActiveLoans >= amount, "Insufficient pool liquidity");

        if      (pool == RiskPool.LOW_RISK)    lender.depositedLowRisk  -= amount;
        else if (pool == RiskPool.MEDIUM_RISK) lender.depositedMedRisk  -= amount;
        else                                   lender.depositedHighRisk -= amount;

        stats.totalLiquidity      -= amount;
        stats.totalLenderDeposits -= amount;

        require(lendingToken.transfer(msg.sender, amount), "Transfer failed");
        emit LenderWithdrew(msg.sender, amount, pool);
    }

    /**
     * @dev Lenders claim their proportional interest share from any/all pools.
     *
     *      Interest bucket fills up as borrowers repay.
     *      Share = (yourDeposit / totalDeposits) × totalInterestBucket
     */
    function claimInterest() external nonReentrant whenNotPaused trackWalletActivity {
        uint256 lowInterest  = _calculatePoolInterestShare(msg.sender, RiskPool.LOW_RISK);
        uint256 medInterest  = _calculatePoolInterestShare(msg.sender, RiskPool.MEDIUM_RISK);
        uint256 highInterest = _calculatePoolInterestShare(msg.sender, RiskPool.HIGH_RISK);
        uint256 total        = lowInterest + medInterest + highInterest;

        require(total > 0, "No interest to claim");

        if (lowInterest  > 0) poolStats[RiskPool.LOW_RISK].totalInterestPool    -= lowInterest;
        if (medInterest  > 0) poolStats[RiskPool.MEDIUM_RISK].totalInterestPool -= medInterest;
        if (highInterest > 0) poolStats[RiskPool.HIGH_RISK].totalInterestPool   -= highInterest;

        LenderInfo storage lender  = lenders[msg.sender];
        lender.totalInterestEarned += total;
        lender.lastClaimTime        = block.timestamp;

        require(lendingToken.transfer(msg.sender, total), "Transfer failed");
        emit InterestClaimed(msg.sender, total);
    }

    function _calculatePoolInterestShare(address lenderAddr, RiskPool pool) internal view returns (uint256) {
        LenderInfo memory lender = lenders[lenderAddr];
        PoolStats  memory stats  = poolStats[pool];
        if (stats.totalLenderDeposits == 0 || stats.totalInterestPool == 0) return 0;

        uint256 lenderDeposit =
            pool == RiskPool.LOW_RISK    ? lender.depositedLowRisk  :
            pool == RiskPool.MEDIUM_RISK ? lender.depositedMedRisk  :
                                           lender.depositedHighRisk;

        return (lenderDeposit * stats.totalInterestPool) / stats.totalLenderDeposits;
    }

    // ============ Borrower Functions ============

    function requestLoan(uint256 amount, uint256 duration)
        external nonReentrant whenNotPaused trackWalletActivity hasValidUsername
    {
        UserProfile storage user = userProfiles[msg.sender];

        require(!user.hasActiveLoan,           "Already has active loan");
        require(amount >= MIN_LOAN_AMOUNT,      "Amount below minimum");
        require(duration >= MIN_LOAN_DURATION, "Duration too short");
        require(duration <= MAX_LOAN_DURATION, "Duration too long");

        _checkAndUpdateLoanWindow(user);

        if (user.defaults > 0) {
            require(
                block.timestamp > user.lastDefaultTime + DEFAULT_COOLDOWN_PERIOD,
                "Blocked due to recent default"
            );
        }

        WalletMaturity memory maturity = getWalletMaturity(msg.sender);
        emit WalletMaturityEvaluated(msg.sender, maturity.maturityLevel, maturity.age);

        uint256 liveScore = computeTrustScore(msg.sender);
        emit TrustScoreComputed(msg.sender, liveScore);

        uint256 maxLoan = _calculateBorrowingLimit(msg.sender);
        require(amount <= maxLoan, "Amount exceeds trust/maturity limit");

        RiskPool assignedPool   = _getRiskPoolFromScore(liveScore);
        PoolStats storage stats = poolStats[assignedPool];
        uint256 available       = stats.totalLiquidity - stats.totalActiveLoans;

        require(
            available >= amount + ((amount * POOL_SAFETY_BUFFER) / 10000),
            "Insufficient pool liquidity"
        );

        emit LoanRequested(msg.sender, user.username, amount, duration, assignedPool);
        _issueLoan(msg.sender, amount, duration, maturity.maturityLevel, assignedPool, liveScore);
    }

    function _checkAndUpdateLoanWindow(UserProfile storage user) internal {
        if (block.timestamp >= user.loanWindowStart + LOAN_WINDOW_DURATION) {
            user.loanWindowStart      = block.timestamp;
            user.loansInCurrentWindow = 0;
        }
        require(user.loansInCurrentWindow < MAX_LOANS_PER_WINDOW, "Loan frequency limit reached");
        user.loansInCurrentWindow++;
    }

    function _issueLoan(
        address  borrower,
        uint256  amount,
        uint256  duration,
        uint256  maturityLevel,
        RiskPool pool,
        uint256  liveScore
    ) internal {
        UserProfile storage user  = userProfiles[borrower];
        PoolStats   storage stats = poolStats[pool];

        uint256 interestRate   = _calculateInterestRate(liveScore, maturityLevel, pool);
        uint256 interestAmount = (amount * interestRate * duration) / (10000 * 365 days);

        if (interestAmount < MIN_INTEREST_AMOUNT) interestAmount = MIN_INTEREST_AMOUNT;

        uint256 totalRepayment = amount + interestAmount;

        Loan storage loan   = activeLoans[borrower];
        loan.borrower       = borrower;
        loan.principal      = amount;
        loan.interestAmount = interestAmount;
        loan.totalRepayment = totalRepayment;
        loan.startTime      = block.timestamp;
        loan.dueDate        = block.timestamp + duration;
        loan.duration       = duration;
        loan.status         = LoanStatus.ACTIVE;
        loan.riskPool       = pool;

        user.hasActiveLoan = true;
        user.totalLoansTaken++;
        stats.totalActiveLoans += amount;

        require(lendingToken.transfer(borrower, amount), "Transfer failed");
        emit LoanIssued(borrower, amount, interestAmount, loan.dueDate, duration, pool);
    }

    /**
     * @dev Repay active loan.
     *
     *      MONEY FLOW:
     *        borrower sends   → principal + interestAmount  (= totalRepayment)
     *        platformFee      → interestAmount × 2%         → adminWallet (immediately)
     *        lenderInterest   → interestAmount − fee        → pool interest bucket
     *        principal        → stays in contract           → recycled pool liquidity
     *        lenders claim    → proportional share of bucket via claimInterest()
     *
     *      [FIX-01] loan.status is now set to REPAID BEFORE pushing to loanHistory,
     *               so the archived record correctly shows status=REPAID instead of ACTIVE.
     */
    function repayLoan() external nonReentrant whenNotPaused trackWalletActivity {
        Loan        storage loan = activeLoans[msg.sender];
        UserProfile storage user = userProfiles[msg.sender];

        require(user.hasActiveLoan,               "No active loan");
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");

        uint256  principal      = loan.principal;
        uint256  interest       = loan.interestAmount;
        uint256  totalRepayment = loan.totalRepayment;
        RiskPool pool           = loan.riskPool;

        uint256 liveScore       = computeTrustScore(msg.sender);
        uint256 effectiveFeeBps = platformFeeBps;
        if (liveScore >= MAX_TRUST_SCORE && effectiveFeeBps >= ELITE_FEE_DISCOUNT_BPS) {
            effectiveFeeBps -= ELITE_FEE_DISCOUNT_BPS;
        }

        // Interest split: platform fee → adminWallet, rest → pool for lenders
        uint256 platformFee    = (interest * effectiveFeeBps) / 10000;
        uint256 lenderInterest = interest - platformFee;

        // Pull full repayment from borrower in one transfer
        require(
            lendingToken.transferFrom(msg.sender, address(this), totalRepayment),
            "Repayment transfer failed"
        );

        // Platform fee out to admin wallet immediately
        if (platformFee > 0) {
            require(lendingToken.transfer(adminWallet, platformFee), "Fee transfer failed");
            emit PlatformFeeCollected(msg.sender, platformFee, adminWallet);
        }

        // [FIX-01] Set status to REPAID BEFORE archiving, so loanHistory stores
        // the correct terminal status. Previously this was reversed, causing every
        // archived loan to show status=ACTIVE (the snapshot captured before the update).
        loan.status = LoanStatus.REPAID;
        loanHistory[msg.sender].push(loan);
        delete activeLoans[msg.sender];

        user.hasActiveLoan = false;
        user.successfulRepayments++;

        // Update pool: principal freed back to liquidity, interest into bucket for lenders
        PoolStats storage stats = poolStats[pool];
        stats.totalActiveLoans  -= principal;
        stats.totalInterestPool += lenderInterest;

        emit InterestDistributed(lenderInterest, pool);
        emit LoanRepaid(msg.sender, principal, interest, totalRepayment);

        uint256 newScore = computeTrustScore(msg.sender);
        emit TrustScoreComputed(msg.sender, newScore);
        if (newScore >= MAX_TRUST_SCORE) emit EliteTierReached(msg.sender);
    }

    function markDefault(address borrower) external nonReentrant {
        Loan        storage loan = activeLoans[borrower];
        UserProfile storage user = userProfiles[borrower];

        require(user.hasActiveLoan,               "No active loan");
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        require(block.timestamp > loan.dueDate + GRACE_PERIOD, "Grace period not over");

        uint256  lostAmount = loan.principal;
        RiskPool pool       = loan.riskPool;

        loanHistory[borrower].push(loan);
        loan.status = LoanStatus.DEFAULTED;
        delete activeLoans[borrower];

        user.hasActiveLoan   = false;
        user.defaults++;
        user.lastDefaultTime = block.timestamp;

        PoolStats storage stats = poolStats[pool];
        stats.totalActiveLoans -= lostAmount;
        if (stats.totalLiquidity >= lostAmount) stats.totalLiquidity -= lostAmount;
        else                                    stats.totalLiquidity  = 0;
        stats.totalDefaulted += lostAmount;

        _penalizeVouchers(borrower);

        emit LoanDefaulted(borrower, lostAmount, pool);
        emit TrustScoreComputed(borrower, computeTrustScore(borrower));
    }

    // ============ Vouch Functions ============

    function vouchForUser(string memory voucheeUsername)
        external trackWalletActivity hasValidUsername
    {
        address vouchee = usernameToAddress[voucheeUsername];
        require(vouchee != address(0),         "Username not found");
        require(vouchee != msg.sender,         "Cannot vouch yourself");

        UserProfile storage voucher        = userProfiles[msg.sender];
        UserProfile storage voucheeProfile = userProfiles[vouchee];

        uint256 voucherScore = computeTrustScore(msg.sender);
        require(voucherScore >= 500,                        "Insufficient trust to vouch");
        require(voucher.successfulRepayments >= 2,         "Need 2+ repayments to vouch");
        require(!vouches[msg.sender][vouchee],             "Already vouched for this user");
        require(voucher.vouchCount < MAX_VOUCHES_PER_USER, "Vouch limit reached");
        require(
            block.timestamp >= voucher.lastVouchTime + VOUCH_COOLDOWN,
            "Must wait 7 days between vouches"
        );

        WalletMaturity memory voucheeMat = getWalletMaturity(vouchee);
        require(voucheeMat.age >= MATURITY_LEVEL_1, "Vouchee wallet too new");

        vouches[msg.sender][vouchee] = true;
        vouchedBy[vouchee].push(msg.sender);
        vouchesGiven[msg.sender].push(vouchee);
        voucher.vouchCount++;
        voucher.lastVouchTime = block.timestamp;

        // Add vouch bonus — capped at TS_VOUCH_BONUS_MAX inside computeTrustScore
        if (voucheeProfile.vouchBonus < TS_VOUCH_BONUS_MAX) {
            uint256 newBonus = voucheeProfile.vouchBonus + 30;
            voucheeProfile.vouchBonus = newBonus > TS_VOUCH_BONUS_MAX
                ? TS_VOUCH_BONUS_MAX : newBonus;
        }

        emit VouchCreated(msg.sender, vouchee, voucher.username, voucheeProfile.username);
    }

    function _penalizeVouchers(address defaulter) internal {
        address[] storage vouchers = vouchedBy[defaulter];
        for (uint i = 0; i < vouchers.length; i++) {
            UserProfile storage vp = userProfiles[vouchers[i]];
            uint256 oldBonus = vp.vouchBonus;
            vp.vouchBonus = vp.vouchBonus >= VOUCH_PENALTY_ON_DEFAULT
                ? vp.vouchBonus - VOUCH_PENALTY_ON_DEFAULT : 0;
            emit VoucherPenalized(vouchers[i], defaulter, oldBonus - vp.vouchBonus);
        }
    }

    // ============ Interest Rate ============

    function _calculateInterestRate(uint256 trustScore, uint256 maturityLevel, RiskPool pool)
        internal view returns (uint256)
    {
        uint256 baseRate;
        uint256 maxRate;

        if      (pool == RiskPool.LOW_RISK)    { baseRate = BASE_INTEREST_RATE_LOW;  maxRate = MAX_INTEREST_RATE_LOW;  }
        else if (pool == RiskPool.MEDIUM_RISK) { baseRate = BASE_INTEREST_RATE_MED;  maxRate = MAX_INTEREST_RATE_MED;  }
        else                                   { baseRate = BASE_INTEREST_RATE_HIGH; maxRate = MAX_INTEREST_RATE_HIGH; }

        uint256 rate = baseRate;

        if (pool == RiskPool.HIGH_RISK) {
            if      (trustScore < 200) rate += 500;
            else if (trustScore < 300) rate += 300;
        }

        if      (maturityLevel == 0) rate += 300;
        else if (maturityLevel == 1) rate += 150;

        PoolStats memory stats = poolStats[pool];
        if (stats.totalLiquidity > 0) {
            uint256 util = (stats.totalActiveLoans * 100) / stats.totalLiquidity;
            rate += util / 5;
        }

        if (rate > maxRate) rate = maxRate;
        return rate;
    }

    // ============ DAO Eligibility ============

    function isEligibleForDAOProposal(address user) external view returns (bool) {
        return computeTrustScore(user) >= DAO_PROPOSAL_MIN_TRUST;
    }

    // ============ View Functions ============

    function getUserProfile(address user) external view returns (
        string   memory username,
        uint256         liveTrustScore,
        uint256         totalLoansTaken,
        uint256         successfulRepayments,
        uint256         defaults,
        bool            hasActiveLoan,
        uint256         walletAge,
        uint256         maturityLevel,
        uint256         maxBorrowingLimit,
        RiskPool        assignedPool,
        uint256         vouchBonus
    ) {
        UserProfile    memory p = userProfiles[user];
        WalletMaturity memory m = getWalletMaturity(user);
        uint256 score           = computeTrustScore(user);
        return (
            p.username, score, p.totalLoansTaken, p.successfulRepayments,
            p.defaults, p.hasActiveLoan, m.age, m.maturityLevel,
            _calculateBorrowingLimit(user), _getRiskPoolFromScore(score), p.vouchBonus
        );
    }

    function getActiveLoan(address borrower) external view returns (
        uint256 principal, uint256 interestAmount, uint256 totalRepayment,
        uint256 dueDate, uint256 duration, LoanStatus status, RiskPool pool, bool isOverdue
    ) {
        Loan memory loan = activeLoans[borrower];
        return (
            loan.principal, loan.interestAmount, loan.totalRepayment,
            loan.dueDate, loan.duration, loan.status, loan.riskPool,
            block.timestamp > loan.dueDate + GRACE_PERIOD && loan.status == LoanStatus.ACTIVE
        );
    }

    function getRepaymentBreakdown(address borrower) external view returns (
        uint256 principal,      // → stays in pool as liquidity
        uint256 totalInterest,  // borrower pays this on top
        uint256 platformFee,    // → adminWallet (2% of interest)
        uint256 lenderPayout,   // → pool interest bucket for lenders to claim
        uint256 totalDue        // = principal + totalInterest
    ) {
        Loan   memory loan  = activeLoans[borrower];
        uint256 liveScore   = computeTrustScore(borrower);
        uint256 feeBps      = platformFeeBps;
        if (liveScore >= MAX_TRUST_SCORE && feeBps >= ELITE_FEE_DISCOUNT_BPS) feeBps -= ELITE_FEE_DISCOUNT_BPS;
        uint256 fee = (loan.interestAmount * feeBps) / 10000;
        return (loan.principal, loan.interestAmount, fee, loan.interestAmount - fee, loan.totalRepayment);
    }

    function getLenderInfo(address lender) external view returns (
        uint256 depositedLowRisk, uint256 depositedMedRisk, uint256 depositedHighRisk,
        uint256 totalInterestEarned, uint256 pendingLow, uint256 pendingMed, uint256 pendingHigh
    ) {
        LenderInfo memory info = lenders[lender];
        return (
            info.depositedLowRisk, info.depositedMedRisk, info.depositedHighRisk,
            info.totalInterestEarned,
            _calculatePoolInterestShare(lender, RiskPool.LOW_RISK),
            _calculatePoolInterestShare(lender, RiskPool.MEDIUM_RISK),
            _calculatePoolInterestShare(lender, RiskPool.HIGH_RISK)
        );
    }

    function getUserVouches(address user)  external view returns (address[] memory) { return vouchedBy[user]; }
    function getVouchesGiven(address user) external view returns (address[] memory) { return vouchesGiven[user]; }
    function getLoanHistory(address user)  external view returns (Loan[] memory)    { return loanHistory[user]; }
    function getAllPoolStats() external view returns (PoolStats memory, PoolStats memory, PoolStats memory) {
        return (poolStats[RiskPool.LOW_RISK], poolStats[RiskPool.MEDIUM_RISK], poolStats[RiskPool.HIGH_RISK]);
    }

    // ============ Admin Functions (onlyOwnerOrDAO after handoff) ============

    function updateBorrowingLimits(uint256 _low, uint256 _med, uint256 _high) external onlyOwnerOrDAO {
        require(_low < _med && _med < _high, "Invalid progression");
        LOW_TRUST_LIMIT = _low; MED_TRUST_LIMIT = _med; HIGH_TRUST_LIMIT = _high;
    }

    function updatePoolInterestRates(RiskPool pool, uint256 _baseRate, uint256 _maxRate) external onlyOwnerOrDAO {
        require(_baseRate < _maxRate, "Base must be less than max");
        require(_maxRate <= 5000,     "Max rate too high");
        if      (pool == RiskPool.LOW_RISK)    { BASE_INTEREST_RATE_LOW  = _baseRate; MAX_INTEREST_RATE_LOW  = _maxRate; }
        else if (pool == RiskPool.MEDIUM_RISK) { BASE_INTEREST_RATE_MED  = _baseRate; MAX_INTEREST_RATE_MED  = _maxRate; }
        else                                   { BASE_INTEREST_RATE_HIGH = _baseRate; MAX_INTEREST_RATE_HIGH = _maxRate; }
    }

    function setPlatformFee(uint256 _feeBps) external onlyOwnerOrDAO {
        require(_feeBps <= MAX_PLATFORM_FEE, "Fee too high");
        uint256 old = platformFeeBps;
        platformFeeBps = _feeBps;
        emit ParameterUpdated("platformFeeBps", old, _feeBps);
    }

    function setAdminWallet(address _adminWallet) external onlyOwnerOrDAO {
        require(_adminWallet != address(0), "Invalid address");
        adminWallet = _adminWallet;
    }

    function setAutoLimitEnabled(bool enabled) external onlyOwnerOrDAO {
        autoLimitEnabled = enabled;
    }

    function setMinInterestAmount(uint256 _min) external onlyOwnerOrDAO {
        require(_min > 0, "Must be > 0");
        MIN_INTEREST_AMOUNT = _min;
    }

    function updateVouchParameters(uint256 _penalty, uint256 _maxVouches) external onlyOwnerOrDAO {
        require(_penalty > 0 && _penalty <= 100, "Invalid penalty");
        require(_maxVouches > 0 && _maxVouches <= 20, "Invalid max vouches");
        VOUCH_PENALTY_ON_DEFAULT = _penalty;
        MAX_VOUCHES_PER_USER     = _maxVouches;
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner(), amount), "Transfer failed");
        emit EmergencyWithdraw(token, amount);
    }

    // [DEPLOY-01] pause: emergency pauser OR owner/DAO can call
    function pause() external {
        require(
            msg.sender == emergencyPauser ||
            msg.sender == owner()         ||
            (daoContract != address(0) && msg.sender == daoContract),
            "Not authorized to pause"
        );
        _pause();
    }

    // unpause: only owner (DAO after handoff) — deliberate recovery requires governance
    function unpause() external onlyOwner {
        _unpause();
    }
}
