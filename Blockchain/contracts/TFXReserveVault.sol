// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TFXReserveVault - Fixed Version
 * @dev Decentralized exchange for TFX <> USDC at 1:1 rate
 *
 * FIX SUMMARY:
 * - USDC has 6 decimals, TFX has 18 decimals.
 * - All rate calculations now include DECIMAL_ADJUSTMENT (1e12) to bridge
 *   the 12-decimal gap, ensuring a true 1:1 value exchange.
 *
 *   buyTFX:  tfxAmount  = usdcAmount * DECIMAL_ADJUSTMENT * rate / RATE_PRECISION
 *   sellTFX: usdcAmount = tfxAmount  * RATE_PRECISION / (rate * DECIMAL_ADJUSTMENT)
 */
contract TFXReserveVault is Ownable, ReentrancyGuard, Pausable {

    // ============ State Variables ============

    IERC20 public immutable usdc;
    IERC20 public immutable tfx;

    // Exchange rate in basis points (10000 = 1:1)
    uint256 public rate = 10000;
    uint256 public constant RATE_PRECISION = 10000;

    /**
     * @dev Bridges the decimal difference between USDC (6) and TFX (18).
     *      1e18 / 1e6 = 1e12
     *      Without this, 1 USDC (1e6 units) would only yield 1e6 TFX units
     *      (0.000000000001 TFX) instead of 1 TFX (1e18 units).
     */
    uint256 public constant DECIMAL_ADJUSTMENT = 1e12;

    // Optional fee (in basis points, 100 = 1%)
    uint256 public buyFee  = 0;
    uint256 public sellFee = 0;
    uint256 public constant MAX_FEE = 500; // Max 5%

    // Fee collection
    uint256 public collectedUSDCFees;
    uint256 public collectedTFXFees;

    // Vault statistics
    uint256 public totalUSDCDeposited;
    uint256 public totalUSDCWithdrawn;
    uint256 public totalTFXDeposited;
    uint256 public totalTFXWithdrawn;
    uint256 public totalBuyTransactions;
    uint256 public totalSellTransactions;

    // Minimum transaction: 1 USDC (6 decimals)
    uint256 public minTransactionAmount = 1e6;

    // ============ Events ============

    event BoughtTFX(address indexed user, uint256 usdcAmount, uint256 tfxAmount, uint256 fee, uint256 timestamp);
    event SoldTFX(address indexed user, uint256 tfxAmount, uint256 usdcAmount, uint256 fee, uint256 timestamp);
    event RateUpdated(uint256 oldRate, uint256 newRate);
    event FeesUpdated(uint256 newBuyFee, uint256 newSellFee);
    event MinTransactionUpdated(uint256 oldMin, uint256 newMin);
    event FeesCollected(address indexed collector, uint256 usdcFees, uint256 tfxFees);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed to);

    // ============ Constructor ============

    constructor(address _usdc, address _tfx) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_tfx != address(0), "Invalid TFX address");
        usdc = IERC20(_usdc);
        tfx  = IERC20(_tfx);
    }

    // ============ Core Functions ============

    /**
     * @dev Buy TFX with USDC at current rate.
     *      Formula: tfxAmount = usdcAmount * DECIMAL_ADJUSTMENT * rate / RATE_PRECISION
     *
     *      Example (rate = 10000, 1:1):
     *        usdcAmount = 1 USDC = 1_000_000 (1e6)
     *        tfxAmount  = 1e6 * 1e12 * 10000 / 10000 = 1e18 = 1 TFX ✓
     */
    function buyTFX(uint256 usdcAmount) external nonReentrant whenNotPaused {
        require(usdcAmount >= minTransactionAmount, "Amount below minimum");

        // ✅ FIXED: include DECIMAL_ADJUSTMENT to correct for 6 vs 18 decimals
        uint256 tfxAmount  = (usdcAmount * DECIMAL_ADJUSTMENT * rate) / RATE_PRECISION;

        uint256 feeAmount  = (tfxAmount * buyFee) / 10000;
        uint256 tfxToUser  = tfxAmount - feeAmount;

        require(tfx.balanceOf(address(this)) >= tfxAmount, "Insufficient TFX liquidity");

        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");
        require(tfx.transfer(msg.sender, tfxToUser), "TFX transfer failed");

        totalUSDCDeposited   += usdcAmount;
        totalTFXWithdrawn    += tfxToUser;
        totalBuyTransactions++;
        collectedTFXFees     += feeAmount;

        emit BoughtTFX(msg.sender, usdcAmount, tfxToUser, feeAmount, block.timestamp);
    }

    /**
     * @dev Sell TFX for USDC at current rate.
     *      Formula: usdcAmount = tfxAmount * RATE_PRECISION / (rate * DECIMAL_ADJUSTMENT)
     *
     *      Example (rate = 10000, 1:1):
     *        tfxAmount  = 1 TFX  = 1e18
     *        usdcAmount = 1e18 * 10000 / (10000 * 1e12) = 1e6 = 1 USDC ✓
     */
    function sellTFX(uint256 tfxAmount) external nonReentrant whenNotPaused {
        require(tfxAmount > 0, "Amount must be > 0");

        // ✅ FIXED: divide by (rate * DECIMAL_ADJUSTMENT) to correct for 18 vs 6 decimals
        uint256 usdcAmount = (tfxAmount * RATE_PRECISION) / (rate * DECIMAL_ADJUSTMENT);

        require(usdcAmount >= minTransactionAmount, "Amount below minimum");

        uint256 feeAmount  = (usdcAmount * sellFee) / 10000;
        uint256 usdcToUser = usdcAmount - feeAmount;

        require(usdc.balanceOf(address(this)) >= usdcAmount, "Insufficient USDC liquidity");

        require(tfx.transferFrom(msg.sender, address(this), tfxAmount), "TFX transfer failed");
        require(usdc.transfer(msg.sender, usdcToUser), "USDC transfer failed");

        totalTFXDeposited     += tfxAmount;
        totalUSDCWithdrawn    += usdcToUser;
        totalSellTransactions++;
        collectedUSDCFees     += feeAmount;

        emit SoldTFX(msg.sender, tfxAmount, usdcToUser, feeAmount, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @dev Preview how much TFX a given USDC amount will yield.
     */
    function calculateBuyTFX(uint256 usdcAmount) external view returns (
        uint256 tfxAmount,
        uint256 feeAmount,
        uint256 tfxToUser
    ) {
        tfxAmount = (usdcAmount * DECIMAL_ADJUSTMENT * rate) / RATE_PRECISION;
        feeAmount = (tfxAmount * buyFee) / 10000;
        tfxToUser = tfxAmount - feeAmount;
    }

    /**
     * @dev Preview how much USDC a given TFX amount will yield.
     */
    function calculateSellTFX(uint256 tfxAmount) external view returns (
        uint256 usdcAmount,
        uint256 feeAmount,
        uint256 usdcToUser
    ) {
        usdcAmount = (tfxAmount * RATE_PRECISION) / (rate * DECIMAL_ADJUSTMENT);
        feeAmount  = (usdcAmount * sellFee) / 10000;
        usdcToUser = usdcAmount - feeAmount;
    }

    /**
     * @dev Get current vault balances and accrued fees.
     */
    function getVaultLiquidity() external view returns (
        uint256 usdcBalance,
        uint256 tfxBalance,
        uint256 usdcFeesCollected,
        uint256 tfxFeesCollected
    ) {
        return (
            usdc.balanceOf(address(this)),
            tfx.balanceOf(address(this)),
            collectedUSDCFees,
            collectedTFXFees
        );
    }

    /**
     * @dev Get cumulative vault statistics.
     */
    function getVaultStats() external view returns (
        uint256 _totalUSDCDeposited,
        uint256 _totalUSDCWithdrawn,
        uint256 _totalTFXDeposited,
        uint256 _totalTFXWithdrawn,
        uint256 _totalBuyTx,
        uint256 _totalSellTx
    ) {
        return (
            totalUSDCDeposited,
            totalUSDCWithdrawn,
            totalTFXDeposited,
            totalTFXWithdrawn,
            totalBuyTransactions,
            totalSellTransactions
        );
    }

    // ============ Admin Functions ============

    /**
     * @dev Update exchange rate (10000 = 1:1, 20000 = 1 USDC buys 2 TFX).
     */
    function setRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Rate must be > 0");
        require(newRate <= 100000, "Rate too high");
        uint256 oldRate = rate;
        rate = newRate;
        emit RateUpdated(oldRate, newRate);
    }

    /**
     * @dev Update buy/sell fees (basis points, max 5%).
     */
    function setFees(uint256 _buyFee, uint256 _sellFee) external onlyOwner {
        require(_buyFee  <= MAX_FEE, "Buy fee too high");
        require(_sellFee <= MAX_FEE, "Sell fee too high");
        buyFee  = _buyFee;
        sellFee = _sellFee;
        emit FeesUpdated(_buyFee, _sellFee);
    }

    /**
     * @dev Update minimum transaction amount (in USDC base units).
     */
    function setMinTransaction(uint256 newMin) external onlyOwner {
        uint256 oldMin = minTransactionAmount;
        minTransactionAmount = newMin;
        emit MinTransactionUpdated(oldMin, newMin);
    }

    /**
     * @dev Withdraw accumulated fees to owner wallet.
     */
    function collectFees() external onlyOwner {
        uint256 usdcFees = collectedUSDCFees;
        uint256 tfxFees  = collectedTFXFees;
        collectedUSDCFees = 0;
        collectedTFXFees  = 0;
        if (usdcFees > 0) require(usdc.transfer(owner(), usdcFees), "USDC fee transfer failed");
        if (tfxFees  > 0) require(tfx.transfer(owner(), tfxFees),   "TFX fee transfer failed");
        emit FeesCollected(owner(), usdcFees, tfxFees);
    }

    function addUSDCLiquidity(uint256 amount) external onlyOwner {
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
    }

    function addTFXLiquidity(uint256 amount) external onlyOwner {
        require(tfx.transferFrom(msg.sender, address(this), amount), "TFX transfer failed");
    }

    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdc.transfer(owner(), amount), "Transfer failed");
    }

    function withdrawTFX(uint256 amount) external onlyOwner {
        require(tfx.transfer(owner(), amount), "Transfer failed");
    }

    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(IERC20(token).transfer(to, amount), "Transfer failed");
        emit EmergencyWithdraw(token, amount, to);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
