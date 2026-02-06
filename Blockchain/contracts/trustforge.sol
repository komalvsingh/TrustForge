// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustForge v2
 * @dev Trust-based, collateral-free micro-lending platform with Risk-Based Pools
 * Key Features: 
 * - Wallet Maturity + Behavior Trust
 * - Risk-Based Lending Pools (Low/Medium/High Risk)
 * - Username System
 * - Enhanced Security & Vouching System
 */
contract TrustForge is ReentrancyGuard, Pausable, Ownable {
    
    // ============ State Variables ============
    
    IERC20 public lendingToken;
    
    // Trust score constants
    uint256 public constant INITIAL_TRUST_SCORE = 100;
    uint256 public constant MAX_TRUST_SCORE = 1000;
    uint256 public TRUST_INCREASE_PER_REPAYMENT = 50;
    uint256 public TRUST_DECREASE_ON_DEFAULT = 200;
    uint256 public VOUCH_PENALTY_ON_DEFAULT = 30; // Trust loss for vouchers
    
    // Wallet maturity constants
    uint256 public constant MATURITY_LEVEL_1 = 7 days;
    uint256 public constant MATURITY_LEVEL_2 = 30 days;
    uint256 public constant MATURITY_LEVEL_3 = 90 days;
    
    // Risk Pool Thresholds
    uint256 public constant LOW_RISK_THRESHOLD = 600;    // Trust >= 600
    uint256 public constant MEDIUM_RISK_THRESHOLD = 300; // Trust >= 300
    // Below 300 = High Risk
    
    // Interest rate parameters (basis points, 100 = 1%)
    // Low Risk Pool
    uint256 public BASE_INTEREST_RATE_LOW = 300;      // 3%
    uint256 public MAX_INTEREST_RATE_LOW = 800;       // 8%
    
    // Medium Risk Pool
    uint256 public BASE_INTEREST_RATE_MED = 700;      // 7%
    uint256 public MAX_INTEREST_RATE_MED = 1500;      // 15%
    
    // High Risk Pool
    uint256 public BASE_INTEREST_RATE_HIGH = 1200;    // 12%
    uint256 public MAX_INTEREST_RATE_HIGH = 2500;     // 25%
    
    // Loan parameters
    uint256 public MIN_LOAN_AMOUNT = 0.01 ether;
    uint256 public MIN_LOAN_DURATION = 1 days;
    uint256 public MAX_LOAN_DURATION = 180 days;
    uint256 public DEFAULT_COOLDOWN_PERIOD = 30 days;
    uint256 public GRACE_PERIOD = 3 days;
    
    // Borrowing limits per trust level
    uint256 public LOW_TRUST_LIMIT = 0.1 ether;    // Trust < 300
    uint256 public MED_TRUST_LIMIT = 0.5 ether;    // Trust 300-600
    uint256 public HIGH_TRUST_LIMIT = 20 ether;    // Trust > 600 (UPDATED)
    
    // Pool safety
    uint256 public constant POOL_SAFETY_BUFFER = 500; // 5% buffer (basis points)
    
    // Vouch limits
    uint256 public MAX_VOUCHES_PER_USER = 5;
    
    // Reputation decay
    uint256 public constant REPUTATION_DECAY_PERIOD = 180 days;
    uint256 public constant REPUTATION_DECAY_AMOUNT = 50; // -5% of trust
    
    // ============ Enums ============
    
    enum LoanStatus {
        ACTIVE,
        REPAID,
        DEFAULTED
    }
    
    enum RiskPool {
        LOW_RISK,
        MEDIUM_RISK,
        HIGH_RISK
    }
    
    // ============ Structs ============
    
    struct UserProfile {
        string username;
        uint256 trustScore;
        uint256 totalLoansTaken;
        uint256 successfulRepayments;
        uint256 defaults;
        bool hasActiveLoan;
        uint256 lastDefaultTime;
        uint256 walletFirstSeen;
        uint256 totalTransactions;
        uint256 vouchCount;
        uint256 lastActivityTime;
    }
    
    struct Loan {
        address borrower;
        uint256 principal;
        uint256 interestAmount;
        uint256 totalRepayment;
        uint256 startTime;
        uint256 dueDate;
        uint256 duration;
        LoanStatus status;
        RiskPool riskPool;
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
    
    mapping(address => UserProfile) public userProfiles;
    mapping(string => address) public usernameToAddress;
    mapping(address => bool) public hasUsername;
    
    mapping(address => Loan) public activeLoans;
    mapping(address => Loan[]) public loanHistory;
    mapping(address => LenderInfo) public lenders;
    
    // Vouch tracking
    mapping(address => mapping(address => bool)) public vouches;
    mapping(address => address[]) public vouchedBy;
    mapping(address => address[]) public vouchesGiven;
    
    // Risk Pool tracking
    mapping(RiskPool => PoolStats) public poolStats;
    
    // ============ Events ============
    
    event UsernameRegistered(address indexed user, string username);
    event LoanRequested(address indexed borrower, string username, uint256 amount, uint256 duration, RiskPool pool);
    event LoanIssued(address indexed borrower, uint256 principal, uint256 interest, uint256 dueDate, uint256 duration, RiskPool pool);
    event LoanRepaid(address indexed borrower, uint256 principal, uint256 interest, uint256 totalRepayment);
    event LoanDefaulted(address indexed borrower, uint256 lostAmount, RiskPool pool);
    event TrustUpdated(address indexed user, uint256 oldScore, uint256 newScore, string reason);
    event WalletMaturityEvaluated(address indexed user, uint256 maturityLevel, uint256 walletAge);
    
    event LenderDeposited(address indexed lender, uint256 amount, RiskPool pool);
    event LenderWithdrew(address indexed lender, uint256 amount, RiskPool pool);
    event InterestClaimed(address indexed lender, uint256 amount);
    event InterestDistributed(uint256 totalAmount, RiskPool pool);
    
    event VouchCreated(address indexed voucher, address indexed vouchee, string voucherName, string voucheeName);
    event VoucherPenalized(address indexed voucher, address indexed defaulter, uint256 trustLost);
    event ParameterUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event EmergencyWithdraw(address indexed token, uint256 amount);
    event ReputationDecayed(address indexed user, uint256 oldScore, uint256 newScore);
    
    // ============ Modifiers ============
    
    modifier trackWalletActivity() {
        UserProfile storage user = userProfiles[msg.sender];
        if (user.walletFirstSeen == 0) {
            user.walletFirstSeen = block.timestamp;
        }
        user.totalTransactions++;
        user.lastActivityTime = block.timestamp;
        _;
    }
    
    modifier hasValidUsername() {
        require(hasUsername[msg.sender], "Username required");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _lendingToken) Ownable(msg.sender) {
        lendingToken = IERC20(_lendingToken);
    }
    
    // ============ Username Functions ============
    
    /**
     * @dev Register a username for the wallet
     */
    function registerUsername(string memory username) external trackWalletActivity {
        require(!hasUsername[msg.sender], "Username already registered");
        require(bytes(username).length >= 3 && bytes(username).length <= 20, "Username length 3-20");
        require(usernameToAddress[username] == address(0), "Username taken");
        require(_isValidUsername(username), "Invalid username format");
        
        userProfiles[msg.sender].username = username;
        usernameToAddress[username] = msg.sender;
        hasUsername[msg.sender] = true;
        
        emit UsernameRegistered(msg.sender, username);
    }
    
    /**
     * @dev Check if username is valid (alphanumeric and underscore only)
     */
    function _isValidUsername(string memory username) internal pure returns (bool) {
        bytes memory b = bytes(username);
        for (uint i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            if (!(
                (char >= 0x30 && char <= 0x39) || // 0-9
                (char >= 0x41 && char <= 0x5A) || // A-Z
                (char >= 0x61 && char <= 0x7A) || // a-z
                (char == 0x5F)                     // _
            )) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @dev Get address by username
     */
    function getAddressByUsername(string memory username) external view returns (address) {
        return usernameToAddress[username];
    }
    
    // ============ Wallet Maturity Functions ============
    
    /**
     * @dev Get wallet maturity information
     */
    function getWalletMaturity(address wallet) public view returns (WalletMaturity memory) {
        UserProfile memory user = userProfiles[wallet];
        WalletMaturity memory maturity;
        
        if (user.walletFirstSeen == 0) {
            maturity.age = 0;
            maturity.maturityLevel = 0;
            maturity.maturityMultiplier = 30; // 30% for very new wallets (UPDATED from 20%)
            return maturity;
        }
        
        maturity.age = block.timestamp - user.walletFirstSeen;
        
        if (maturity.age >= MATURITY_LEVEL_3) {
            maturity.maturityLevel = 3;
            maturity.maturityMultiplier = 150;
        } else if (maturity.age >= MATURITY_LEVEL_2) {
            maturity.maturityLevel = 2;
            maturity.maturityMultiplier = 100;
        } else if (maturity.age >= MATURITY_LEVEL_1) {
            maturity.maturityLevel = 1;
            maturity.maturityMultiplier = 50;
        } else {
            maturity.maturityLevel = 0;
            maturity.maturityMultiplier = 30; // UPDATED from 20%
        }
        
        return maturity;
    }
    
    // ============ Risk Pool Assignment ============
    
    /**
     * @dev Determine risk pool based on trust score
     */
    function _getRiskPool(uint256 trustScore) internal pure returns (RiskPool) {
        if (trustScore >= LOW_RISK_THRESHOLD) {
            return RiskPool.LOW_RISK;
        } else if (trustScore >= MEDIUM_RISK_THRESHOLD) {
            return RiskPool.MEDIUM_RISK;
        } else {
            return RiskPool.HIGH_RISK;
        }
    }
    
    /**
     * @dev Get pool statistics for a specific risk pool
     */
    function getPoolStatsForRisk(RiskPool pool) external view returns (
        uint256 totalLiquidity,
        uint256 totalActiveLoanAmount,
        uint256 availableLiquidity,
        uint256 utilizationRate,
        uint256 interestPool,
        uint256 totalDefaulted
    ) {
        PoolStats memory stats = poolStats[pool];
        uint256 available = stats.totalLiquidity > stats.totalActiveLoans ? 
            stats.totalLiquidity - stats.totalActiveLoans : 0;
        uint256 utilization = stats.totalLiquidity > 0 ? 
            (stats.totalActiveLoans * 10000) / stats.totalLiquidity : 0;
        
        return (
            stats.totalLiquidity,
            stats.totalActiveLoans,
            available,
            utilization,
            stats.totalInterestPool,
            stats.totalDefaulted
        );
    }
    
    // ============ Lender Functions ============
    
    /**
     * @dev Deposit tokens into a specific risk pool
     */
    function depositToPool(uint256 amount, RiskPool pool) external nonReentrant whenNotPaused trackWalletActivity {
        require(amount > 0, "Amount must be > 0");
        require(lendingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        LenderInfo storage lender = lenders[msg.sender];
        PoolStats storage stats = poolStats[pool];
        
        if (pool == RiskPool.LOW_RISK) {
            lender.depositedLowRisk += amount;
        } else if (pool == RiskPool.MEDIUM_RISK) {
            lender.depositedMedRisk += amount;
        } else {
            lender.depositedHighRisk += amount;
        }
        
        lender.lastClaimTime = block.timestamp;
        
        stats.totalLiquidity += amount;
        stats.totalLenderDeposits += amount;
        
        emit LenderDeposited(msg.sender, amount, pool);
    }
    
    /**
     * @dev Withdraw tokens from a specific pool
     */
    function withdrawFromPool(uint256 amount, RiskPool pool) external nonReentrant whenNotPaused trackWalletActivity {
        LenderInfo storage lender = lenders[msg.sender];
        PoolStats storage stats = poolStats[pool];
        
        require(amount > 0, "Amount must be > 0");
        
        // Check lender has enough in this pool
        uint256 lenderBalance;
        if (pool == RiskPool.LOW_RISK) {
            lenderBalance = lender.depositedLowRisk;
        } else if (pool == RiskPool.MEDIUM_RISK) {
            lenderBalance = lender.depositedMedRisk;
        } else {
            lenderBalance = lender.depositedHighRisk;
        }
        
        require(lenderBalance >= amount, "Insufficient balance in pool");
        
        // Check pool liquidity
        uint256 availableLiquidity = stats.totalLiquidity - stats.totalActiveLoans;
        require(availableLiquidity >= amount, "Insufficient pool liquidity");
        
        // Update balances
        if (pool == RiskPool.LOW_RISK) {
            lender.depositedLowRisk -= amount;
        } else if (pool == RiskPool.MEDIUM_RISK) {
            lender.depositedMedRisk -= amount;
        } else {
            lender.depositedHighRisk -= amount;
        }
        
        stats.totalLiquidity -= amount;
        stats.totalLenderDeposits -= amount;
        
        require(lendingToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit LenderWithdrew(msg.sender, amount, pool);
    }
    
    /**
     * @dev Claim interest from all pools
     */
    function claimInterest() external nonReentrant whenNotPaused trackWalletActivity {
        LenderInfo storage lender = lenders[msg.sender];
        uint256 totalInterest = 0;
        
        // Calculate interest from each pool
        uint256 lowInterest = _calculatePoolInterestShare(msg.sender, RiskPool.LOW_RISK);
        uint256 medInterest = _calculatePoolInterestShare(msg.sender, RiskPool.MEDIUM_RISK);
        uint256 highInterest = _calculatePoolInterestShare(msg.sender, RiskPool.HIGH_RISK);
        
        totalInterest = lowInterest + medInterest + highInterest;
        require(totalInterest > 0, "No interest to claim");
        
        // Deduct from pool interest
        if (lowInterest > 0) poolStats[RiskPool.LOW_RISK].totalInterestPool -= lowInterest;
        if (medInterest > 0) poolStats[RiskPool.MEDIUM_RISK].totalInterestPool -= medInterest;
        if (highInterest > 0) poolStats[RiskPool.HIGH_RISK].totalInterestPool -= highInterest;
        
        lender.totalInterestEarned += totalInterest;
        lender.lastClaimTime = block.timestamp;
        
        require(lendingToken.transfer(msg.sender, totalInterest), "Transfer failed");
        
        emit InterestClaimed(msg.sender, totalInterest);
    }
    
    /**
     * @dev Calculate lender's interest share from a specific pool
     */
    function _calculatePoolInterestShare(address lenderAddress, RiskPool pool) internal view returns (uint256) {
        LenderInfo memory lender = lenders[lenderAddress];
        PoolStats memory stats = poolStats[pool];
        
        if (stats.totalLenderDeposits == 0 || stats.totalInterestPool == 0) {
            return 0;
        }
        
        uint256 lenderDeposit;
        if (pool == RiskPool.LOW_RISK) {
            lenderDeposit = lender.depositedLowRisk;
        } else if (pool == RiskPool.MEDIUM_RISK) {
            lenderDeposit = lender.depositedMedRisk;
        } else {
            lenderDeposit = lender.depositedHighRisk;
        }
        
        return (lenderDeposit * stats.totalInterestPool) / stats.totalLenderDeposits;
    }
    
    // ============ Borrower Functions ============
    
    /**
     * @dev Request a loan - pool is auto-assigned based on trust score
     */
    function requestLoan(uint256 amount, uint256 duration) external nonReentrant whenNotPaused trackWalletActivity hasValidUsername {
        UserProfile storage user = userProfiles[msg.sender];
        
        // Initialize new user trust
        if (user.trustScore == 0) {
            user.trustScore = INITIAL_TRUST_SCORE;
        }
        
        // Apply reputation decay if needed
        _applyReputationDecay(msg.sender);
        
        // Validation
        require(!user.hasActiveLoan, "Already has active loan");
        require(amount >= MIN_LOAN_AMOUNT, "Amount below minimum");
        require(duration > 0, "Duration cannot be zero"); // ADDED
        require(duration >= MIN_LOAN_DURATION, "Duration too short");
        require(duration <= MAX_LOAN_DURATION, "Duration too long");
        
        // Check default cooldown
        if (user.defaults > 0) {
            require(
                block.timestamp > user.lastDefaultTime + DEFAULT_COOLDOWN_PERIOD,
                "Blocked due to recent default"
            );
        }
        
        // Check wallet maturity and calculate limit
        WalletMaturity memory maturity = getWalletMaturity(msg.sender);
        emit WalletMaturityEvaluated(msg.sender, maturity.maturityLevel, maturity.age);
        
        uint256 maxLoan = _calculateBorrowingLimit(user.trustScore, maturity.maturityMultiplier);
        require(amount <= maxLoan, "Amount exceeds trust/maturity limit");
        
        // Determine risk pool based on trust
        RiskPool assignedPool = _getRiskPool(user.trustScore);
        PoolStats storage stats = poolStats[assignedPool];
        
        // Check pool has liquidity with safety buffer
        uint256 availableLiquidity = stats.totalLiquidity - stats.totalActiveLoans;
        uint256 requiredLiquidity = amount + (amount * POOL_SAFETY_BUFFER / 10000);
        require(availableLiquidity >= requiredLiquidity, "Insufficient pool liquidity");
        
        emit LoanRequested(msg.sender, user.username, amount, duration, assignedPool);
        
        // Issue loan
        _issueLoan(msg.sender, amount, duration, maturity.maturityLevel, assignedPool);
    }
    
    /**
     * @dev Internal: Issue loan to borrower
     */
    function _issueLoan(
        address borrower, 
        uint256 amount, 
        uint256 duration, 
        uint256 maturityLevel,
        RiskPool pool
    ) internal {
        UserProfile storage user = userProfiles[borrower];
        PoolStats storage stats = poolStats[pool];
        
        // Calculate interest based on trust, maturity, and pool
        uint256 interestRate = _calculateInterestRate(user.trustScore, maturityLevel, pool);
        
        // Calculate interest amount
        uint256 interestAmount = (amount * interestRate * duration) / (10000 * 365 days);
        uint256 totalRepayment = amount + interestAmount;
        
        // Create loan
        Loan storage loan = activeLoans[borrower];
        loan.borrower = borrower;
        loan.principal = amount;
        loan.interestAmount = interestAmount;
        loan.totalRepayment = totalRepayment;
        loan.startTime = block.timestamp;
        loan.dueDate = block.timestamp + duration;
        loan.duration = duration;
        loan.status = LoanStatus.ACTIVE;
        loan.riskPool = pool;
        
        // Update state
        user.hasActiveLoan = true;
        user.totalLoansTaken++;
        stats.totalActiveLoans += amount;
        
        // Transfer tokens to borrower
        require(lendingToken.transfer(borrower, amount), "Transfer failed");
        
        emit LoanIssued(borrower, amount, interestAmount, loan.dueDate, duration, pool);
    }
    
    /**
     * @dev Repay loan
     */
    function repayLoan() external nonReentrant whenNotPaused trackWalletActivity {
        Loan storage loan = activeLoans[msg.sender];
        UserProfile storage user = userProfiles[msg.sender];
        
        require(user.hasActiveLoan, "No active loan");
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        
        uint256 principal = loan.principal;
        uint256 interest = loan.interestAmount;
        uint256 totalRepayment = loan.totalRepayment;
        RiskPool pool = loan.riskPool;
        
        // Transfer repayment from borrower
        require(lendingToken.transferFrom(msg.sender, address(this), totalRepayment), "Transfer failed");
        
        // Store loan in history before clearing
        loanHistory[msg.sender].push(loan);
        
        // Update loan status
        loan.status = LoanStatus.REPAID;
        
        // Clear active loan struct (FIX #1)
        delete activeLoans[msg.sender];
        
        user.hasActiveLoan = false;
        user.successfulRepayments++;
        
        // Update pool stats
        PoolStats storage stats = poolStats[pool];
        stats.totalActiveLoans -= principal;
        stats.totalInterestPool += interest;
        
        emit InterestDistributed(interest, pool);
        
        // Increase trust
        uint256 oldTrust = user.trustScore;
        _increaseTrustScore(msg.sender);
        emit TrustUpdated(msg.sender, oldTrust, user.trustScore, "Successful repayment");
        
        emit LoanRepaid(msg.sender, principal, interest, totalRepayment); // UPDATED event
    }
    
    /**
     * @dev Mark overdue loan as defaulted
     */
    function markDefault(address borrower) external nonReentrant {
        Loan storage loan = activeLoans[borrower];
        UserProfile storage user = userProfiles[borrower];
        
        require(user.hasActiveLoan, "No active loan");
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        require(block.timestamp > loan.dueDate + GRACE_PERIOD, "Grace period not over"); // ADDED grace period
        
        uint256 lostAmount = loan.principal;
        RiskPool pool = loan.riskPool;
        
        // Store loan in history
        loanHistory[borrower].push(loan);
        
        // Update loan
        loan.status = LoanStatus.DEFAULTED;
        
        // Clear active loan (FIX #1)
        delete activeLoans[borrower];
        
        user.hasActiveLoan = false;
        user.defaults++;
        user.lastDefaultTime = block.timestamp;
        
        // Pool absorbs loss (FIX #3 - safe underflow handling)
        PoolStats storage stats = poolStats[pool];
        stats.totalActiveLoans -= lostAmount;
        
        if (stats.totalLiquidity >= lostAmount) {
            stats.totalLiquidity -= lostAmount;
        } else {
            stats.totalLiquidity = 0;
        }
        
        stats.totalDefaulted += lostAmount;
        
        // Penalize vouchers (FIX #6)
        _penalizeVouchers(borrower);
        
        // Decrease trust
        uint256 oldTrust = user.trustScore;
        _decreaseTrustScore(borrower);
        emit TrustUpdated(borrower, oldTrust, user.trustScore, "Loan defaulted");
        
        emit LoanDefaulted(borrower, lostAmount, pool);
    }
    
    // ============ Trust & Vouch Functions ============
    
    /**
     * @dev Vouch for another user by username
     */
    function vouchForUser(string memory voucheeUsername) external trackWalletActivity hasValidUsername {
        address vouchee = usernameToAddress[voucheeUsername];
        require(vouchee != address(0), "Username not found");
        require(vouchee != msg.sender, "Cannot vouch yourself");
        
        UserProfile storage voucher = userProfiles[msg.sender];
        UserProfile storage voucheeProfile = userProfiles[vouchee];
        
        require(voucher.trustScore >= 500, "Insufficient trust");
        require(voucher.successfulRepayments >= 2, "Need 2+ repayments");
        require(!vouches[msg.sender][vouchee], "Already vouched");
        require(voucher.vouchCount < MAX_VOUCHES_PER_USER, "Vouch limit reached"); // FIX #5
        
        vouches[msg.sender][vouchee] = true;
        vouchedBy[vouchee].push(msg.sender);
        vouchesGiven[msg.sender].push(vouchee);
        voucher.vouchCount++;
        
        // Give trust boost
        if (voucheeProfile.trustScore == 0) {
            voucheeProfile.trustScore = INITIAL_TRUST_SCORE + 50;
        } else if (voucheeProfile.trustScore < 300) {
            voucheeProfile.trustScore += 30;
        }
        
        emit VouchCreated(msg.sender, vouchee, voucher.username, voucheeProfile.username);
    }
    
    /**
     * @dev Penalize vouchers when their vouchee defaults (FIX #6)
     */
    function _penalizeVouchers(address defaulter) internal {
        address[] storage vouchers = vouchedBy[defaulter];
        
        for (uint i = 0; i < vouchers.length; i++) {
            address voucher = vouchers[i];
            UserProfile storage voucherProfile = userProfiles[voucher];
            
            uint256 oldTrust = voucherProfile.trustScore;
            
            if (voucherProfile.trustScore > VOUCH_PENALTY_ON_DEFAULT) {
                voucherProfile.trustScore -= VOUCH_PENALTY_ON_DEFAULT;
            } else {
                voucherProfile.trustScore = INITIAL_TRUST_SCORE / 2;
            }
            
            emit VoucherPenalized(voucher, defaulter, oldTrust - voucherProfile.trustScore);
        }
    }
    
    /**
     * @dev Apply reputation decay if user has been inactive
     */
    function _applyReputationDecay(address user) internal {
        UserProfile storage profile = userProfiles[user];
        
        if (profile.lastActivityTime == 0 || profile.trustScore <= INITIAL_TRUST_SCORE) {
            return;
        }
        
        uint256 timeSinceActivity = block.timestamp - profile.lastActivityTime;
        
        if (timeSinceActivity >= REPUTATION_DECAY_PERIOD) {
            uint256 oldScore = profile.trustScore;
            uint256 decay = REPUTATION_DECAY_AMOUNT;
            
            if (profile.trustScore > decay) {
                profile.trustScore -= decay;
            } else {
                profile.trustScore = INITIAL_TRUST_SCORE;
            }
            
            emit ReputationDecayed(user, oldScore, profile.trustScore);
        }
    }
    
    function _increaseTrustScore(address user) internal {
        UserProfile storage profile = userProfiles[user];
        
        uint256 increase = TRUST_INCREASE_PER_REPAYMENT;
        
        // Bonus for consistency
        if (profile.successfulRepayments >= 5) {
            increase += 20;
        }
        if (profile.successfulRepayments >= 10) {
            increase += 10;
        }
        
        if (profile.trustScore + increase > MAX_TRUST_SCORE) {
            profile.trustScore = MAX_TRUST_SCORE;
        } else {
            profile.trustScore += increase;
        }
    }
    
    function _decreaseTrustScore(address user) internal {
        UserProfile storage profile = userProfiles[user];
        
        uint256 decrease = TRUST_DECREASE_ON_DEFAULT;
        
        if (profile.defaults > 1) {
            decrease += 100;
        }
        
        if (profile.trustScore > decrease) {
            profile.trustScore -= decrease;
        } else {
            profile.trustScore = INITIAL_TRUST_SCORE / 2;
        }
    }
    
    // ============ Calculation Functions ============
    
    /**
     * @dev Calculate borrowing limit based on trust and maturity
     */
    function _calculateBorrowingLimit(uint256 trustScore, uint256 maturityMultiplier) 
        internal 
        view 
        returns (uint256) 
    {
        uint256 baseLimit;
        
        if (trustScore < 300) {
            baseLimit = LOW_TRUST_LIMIT;
        } else if (trustScore < 600) {
            baseLimit = MED_TRUST_LIMIT;
        } else {
            baseLimit = HIGH_TRUST_LIMIT;
        }
        
        return (baseLimit * maturityMultiplier) / 100;
    }
    
    /**
     * @dev Calculate interest rate based on pool, trust, and maturity (FIX #7 - reduced utilization sensitivity)
     */
    function _calculateInterestRate(uint256 trustScore, uint256 maturityLevel, RiskPool pool) 
        internal 
        view 
        returns (uint256) 
    {
        uint256 baseRate;
        uint256 maxRate;
        
        // Set base and max rates per pool
        if (pool == RiskPool.LOW_RISK) {
            baseRate = BASE_INTEREST_RATE_LOW;
            maxRate = MAX_INTEREST_RATE_LOW;
        } else if (pool == RiskPool.MEDIUM_RISK) {
            baseRate = BASE_INTEREST_RATE_MED;
            maxRate = MAX_INTEREST_RATE_MED;
        } else {
            baseRate = BASE_INTEREST_RATE_HIGH;
            maxRate = MAX_INTEREST_RATE_HIGH;
        }
        
        uint256 rate = baseRate;
        
        // Trust penalty (smaller in low-risk pool)
        if (pool == RiskPool.HIGH_RISK) {
            if (trustScore < 200) {
                rate += 500;
            } else if (trustScore < 300) {
                rate += 300;
            }
        }
        
        // Maturity penalty
        if (maturityLevel == 0) {
            rate += 300;
        } else if (maturityLevel == 1) {
            rate += 150;
        }
        
        // Pool utilization (FIX #7 - less sensitive)
        PoolStats memory stats = poolStats[pool];
        if (stats.totalLiquidity > 0) {
            uint256 utilization = (stats.totalActiveLoans * 100) / stats.totalLiquidity;
            rate += utilization / 5; // Changed from * 2 to / 5
        }
        
        if (rate > maxRate) {
            rate = maxRate;
        }
        
        return rate;
    }
    
    // ============ View Functions ============
    
    function getUserProfile(address user) external view returns (
        string memory username,
        uint256 trustScore,
        uint256 totalLoansTaken,
        uint256 successfulRepayments,
        uint256 defaults,
        bool hasActiveLoan,
        uint256 walletAge,
        uint256 maturityLevel,
        uint256 maxBorrowingLimit,
        RiskPool assignedPool
    ) {
        UserProfile memory profile = userProfiles[user];
        WalletMaturity memory maturity = getWalletMaturity(user);
        uint256 trust = profile.trustScore == 0 ? INITIAL_TRUST_SCORE : profile.trustScore;
        
        return (
            profile.username,
            trust,
            profile.totalLoansTaken,
            profile.successfulRepayments,
            profile.defaults,
            profile.hasActiveLoan,
            maturity.age,
            maturity.maturityLevel,
            _calculateBorrowingLimit(trust, maturity.maturityMultiplier),
            _getRiskPool(trust)
        );
    }
    
    function getActiveLoan(address borrower) external view returns (
        uint256 principal,
        uint256 interestAmount,
        uint256 totalRepayment,
        uint256 dueDate,
        uint256 duration,
        LoanStatus status,
        RiskPool pool,
        bool isOverdue
    ) {
        Loan memory loan = activeLoans[borrower];
        return (
            loan.principal,
            loan.interestAmount,
            loan.totalRepayment,
            loan.dueDate,
            loan.duration,
            loan.status,
            loan.riskPool,
            block.timestamp > loan.dueDate + GRACE_PERIOD && loan.status == LoanStatus.ACTIVE
        );
    }
    
    function getLenderInfo(address lender) external view returns (
        uint256 depositedLowRisk,
        uint256 depositedMedRisk,
        uint256 depositedHighRisk,
        uint256 totalInterestEarned,
        uint256 pendingInterestLow,
        uint256 pendingInterestMed,
        uint256 pendingInterestHigh
    ) {
        LenderInfo memory info = lenders[lender];
        return (
            info.depositedLowRisk,
            info.depositedMedRisk,
            info.depositedHighRisk,
            info.totalInterestEarned,
            _calculatePoolInterestShare(lender, RiskPool.LOW_RISK),
            _calculatePoolInterestShare(lender, RiskPool.MEDIUM_RISK),
            _calculatePoolInterestShare(lender, RiskPool.HIGH_RISK)
        );
    }
    
    /**
     * @dev Get users who vouched for an address (FIX #11)
     */
    function getUserVouches(address user) external view returns (address[] memory) {
        return vouchedBy[user];
    }
    
    /**
     * @dev Get users that an address has vouched for
     */
    function getVouchesGiven(address user) external view returns (address[] memory) {
        return vouchesGiven[user];
    }
    
    /**
     * @dev Get loan history for a user (FIX #10)
     */
    function getLoanHistory(address user) external view returns (Loan[] memory) {
        return loanHistory[user];
    }
    
    /**
     * @dev Get all pool statistics
     */
    function getAllPoolStats() external view returns (
        PoolStats memory lowRisk,
        PoolStats memory medRisk,
        PoolStats memory highRisk
    ) {
        return (
            poolStats[RiskPool.LOW_RISK],
            poolStats[RiskPool.MEDIUM_RISK],
            poolStats[RiskPool.HIGH_RISK]
        );
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Update trust parameters
     */
    function updateTrustParameters(
        uint256 _increasePerRepayment,
        uint256 _decreaseOnDefault,
        uint256 _vouchPenalty
    ) external onlyOwner {
        require(_increasePerRepayment > 0 && _increasePerRepayment <= 100, "Invalid increase");
        require(_decreaseOnDefault > 0 && _decreaseOnDefault <= 500, "Invalid decrease");
        require(_vouchPenalty > 0 && _vouchPenalty <= 100, "Invalid penalty");
        
        TRUST_INCREASE_PER_REPAYMENT = _increasePerRepayment;
        TRUST_DECREASE_ON_DEFAULT = _decreaseOnDefault;
        VOUCH_PENALTY_ON_DEFAULT = _vouchPenalty;
    }
    
    /**
     * @dev Update borrowing limits
     */
    function updateBorrowingLimits(
        uint256 _lowTrust,
        uint256 _medTrust,
        uint256 _highTrust
    ) external onlyOwner {
        require(_lowTrust < _medTrust && _medTrust < _highTrust, "Invalid progression");
        
        LOW_TRUST_LIMIT = _lowTrust;
        MED_TRUST_LIMIT = _medTrust;
        HIGH_TRUST_LIMIT = _highTrust;
    }
    
    /**
     * @dev Update interest rates for a specific pool
     */
    function updatePoolInterestRates(
        RiskPool pool,
        uint256 _baseRate,
        uint256 _maxRate
    ) external onlyOwner {
        require(_baseRate < _maxRate, "Base < max");
        require(_maxRate <= 5000, "Max too high");
        
        if (pool == RiskPool.LOW_RISK) {
            BASE_INTEREST_RATE_LOW = _baseRate;
            MAX_INTEREST_RATE_LOW = _maxRate;
        } else if (pool == RiskPool.MEDIUM_RISK) {
            BASE_INTEREST_RATE_MED = _baseRate;
            MAX_INTEREST_RATE_MED = _maxRate;
        } else {
            BASE_INTEREST_RATE_HIGH = _baseRate;
            MAX_INTEREST_RATE_HIGH = _maxRate;
        }
    }
    
    /**
     * @dev Emergency withdraw stuck tokens (FIX #13)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner(), amount), "Transfer failed");
        emit EmergencyWithdraw(token, amount);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}
