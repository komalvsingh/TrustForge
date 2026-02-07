// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TFXReserveVault - Enhanced Version
 * @dev Decentralized exchange for TFX <> USDC at 1:1 rate
 * 
 * PURPOSE:
 * - Provides liquidity for users to enter/exit the TrustForge lending ecosystem
 * - Allows USDC holders to get TFX for lending/borrowing
 * - Allows TFX holders to exit to USDC
 * 
 * INTEGRATION:
 * - Works independently from TrustForge contract
 * - Users interact with vault first, then use TFX in TrustForge
 * 
 * KEY FEATURES:
 * - 1:1 USDC to TFX exchange rate (adjustable)
 * - Pausable for emergencies
 * - Fee mechanism (optional)
 * - Liquidity tracking
 * - Event logging for analytics
 */
contract TFXReserveVault is Ownable, ReentrancyGuard, Pausable {
    
    // ============ State Variables ============
    
    IERC20 public immutable usdc;
    IERC20 public immutable tfx;
    
    // Exchange rate: 1 USDC = rate TFX (in basis points for precision)
    // Default: 10000 = 1:1 ratio
    uint256 public rate = 10000;
    uint256 public constant RATE_PRECISION = 10000;
    
    // Optional fee (in basis points, 100 = 1%)
    uint256 public buyFee = 0;  // Fee when buying TFX with USDC
    uint256 public sellFee = 0; // Fee when selling TFX for USDC
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
    
    // Minimum transaction amounts (prevents dust attacks)
    uint256 public minTransactionAmount = 1e6; // 1 USDC (6 decimals)
    
    // ============ Events ============
    
    event BoughtTFX(
        address indexed user,
        uint256 usdcAmount,
        uint256 tfxAmount,
        uint256 fee,
        uint256 timestamp
    );
    
    event SoldTFX(
        address indexed user,
        uint256 tfxAmount,
        uint256 usdcAmount,
        uint256 fee,
        uint256 timestamp
    );
    
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
        tfx = IERC20(_tfx);
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Buy TFX with USDC at current rate
     * @param usdcAmount Amount of USDC to spend
     */
    function buyTFX(uint256 usdcAmount) external nonReentrant whenNotPaused {
        require(usdcAmount >= minTransactionAmount, "Amount below minimum");
        
        // Calculate TFX amount based on rate
        uint256 tfxAmount = (usdcAmount * rate) / RATE_PRECISION;
        
        // Calculate fee
        uint256 feeAmount = (tfxAmount * buyFee) / 10000;
        uint256 tfxToUser = tfxAmount - feeAmount;
        
        // Check vault has enough TFX
        require(tfx.balanceOf(address(this)) >= tfxAmount, "Insufficient TFX liquidity");
        
        // Transfer USDC from user to vault
        require(
            usdc.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );
        
        // Transfer TFX to user
        require(
            tfx.transfer(msg.sender, tfxToUser),
            "TFX transfer failed"
        );
        
        // Update statistics
        totalUSDCDeposited += usdcAmount;
        totalTFXWithdrawn += tfxToUser;
        totalBuyTransactions++;
        collectedTFXFees += feeAmount;
        
        emit BoughtTFX(msg.sender, usdcAmount, tfxToUser, feeAmount, block.timestamp);
    }
    
    /**
     * @dev Sell TFX for USDC at current rate
     * @param tfxAmount Amount of TFX to sell
     */
    function sellTFX(uint256 tfxAmount) external nonReentrant whenNotPaused {
        require(tfxAmount > 0, "Amount must be > 0");
        
        // Calculate USDC amount based on rate
        uint256 usdcAmount = (tfxAmount * RATE_PRECISION) / rate;
        
        // Check minimum
        require(usdcAmount >= minTransactionAmount, "Amount below minimum");
        
        // Calculate fee
        uint256 feeAmount = (usdcAmount * sellFee) / 10000;
        uint256 usdcToUser = usdcAmount - feeAmount;
        
        // Check vault has enough USDC
        require(usdc.balanceOf(address(this)) >= usdcAmount, "Insufficient USDC liquidity");
        
        // Transfer TFX from user to vault
        require(
            tfx.transferFrom(msg.sender, address(this), tfxAmount),
            "TFX transfer failed"
        );
        
        // Transfer USDC to user
        require(
            usdc.transfer(msg.sender, usdcToUser),
            "USDC transfer failed"
        );
        
        // Update statistics
        totalTFXDeposited += tfxAmount;
        totalUSDCWithdrawn += usdcToUser;
        totalSellTransactions++;
        collectedUSDCFees += feeAmount;
        
        emit SoldTFX(msg.sender, tfxAmount, usdcToUser, feeAmount, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Calculate how much TFX user will receive for USDC amount
     */
    function calculateBuyTFX(uint256 usdcAmount) external view returns (
        uint256 tfxAmount,
        uint256 feeAmount,
        uint256 tfxToUser
    ) {
        tfxAmount = (usdcAmount * rate) / RATE_PRECISION;
        feeAmount = (tfxAmount * buyFee) / 10000;
        tfxToUser = tfxAmount - feeAmount;
    }
    
    /**
     * @dev Calculate how much USDC user will receive for TFX amount
     */
    function calculateSellTFX(uint256 tfxAmount) external view returns (
        uint256 usdcAmount,
        uint256 feeAmount,
        uint256 usdcToUser
    ) {
        usdcAmount = (tfxAmount * RATE_PRECISION) / rate;
        feeAmount = (usdcAmount * sellFee) / 10000;
        usdcToUser = usdcAmount - feeAmount;
    }
    
    /**
     * @dev Get vault liquidity status
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
     * @dev Get vault statistics
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
     * @dev Update exchange rate
     * @param newRate New rate in basis points (10000 = 1:1)
     */
    function setRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Rate must be > 0");
        require(newRate <= 100000, "Rate too high");
        
        uint256 oldRate = rate;
        rate = newRate;
        
        emit RateUpdated(oldRate, newRate);
    }
    
    /**
     * @dev Update transaction fees
     * @param _buyFee Fee when buying TFX (basis points)
     * @param _sellFee Fee when selling TFX (basis points)
     */
    function setFees(uint256 _buyFee, uint256 _sellFee) external onlyOwner {
        require(_buyFee <= MAX_FEE, "Buy fee too high");
        require(_sellFee <= MAX_FEE, "Sell fee too high");
        
        buyFee = _buyFee;
        sellFee = _sellFee;
        
        emit FeesUpdated(_buyFee, _sellFee);
    }
    
    /**
     * @dev Update minimum transaction amount
     */
    function setMinTransaction(uint256 newMin) external onlyOwner {
        uint256 oldMin = minTransactionAmount;
        minTransactionAmount = newMin;
        
        emit MinTransactionUpdated(oldMin, newMin);
    }
    
    /**
     * @dev Withdraw collected fees
     */
    function collectFees() external onlyOwner {
        uint256 usdcFees = collectedUSDCFees;
        uint256 tfxFees = collectedTFXFees;
        
        collectedUSDCFees = 0;
        collectedTFXFees = 0;
        
        if (usdcFees > 0) {
            require(usdc.transfer(owner(), usdcFees), "USDC fee transfer failed");
        }
        
        if (tfxFees > 0) {
            require(tfx.transfer(owner(), tfxFees), "TFX fee transfer failed");
        }
        
        emit FeesCollected(owner(), usdcFees, tfxFees);
    }
    
    /**
     * @dev Add USDC liquidity to vault (owner only)
     */
    function addUSDCLiquidity(uint256 amount) external onlyOwner {
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );
    }
    
    /**
     * @dev Add TFX liquidity to vault (owner only)
     */
    function addTFXLiquidity(uint256 amount) external onlyOwner {
        require(
            tfx.transferFrom(msg.sender, address(this), amount),
            "TFX transfer failed"
        );
    }
    
    /**
     * @dev Withdraw USDC from vault (owner only)
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdc.transfer(owner(), amount), "Transfer failed");
    }
    
    /**
     * @dev Withdraw TFX from vault (owner only)
     */
    function withdrawTFX(uint256 amount) external onlyOwner {
        require(tfx.transfer(owner(), amount), "Transfer failed");
    }
    
    /**
     * @dev Emergency withdraw any ERC20 token
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(IERC20(token).transfer(to, amount), "Transfer failed");
        
        emit EmergencyWithdraw(token, amount, to);
    }
    
    /**
     * @dev Pause vault operations
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause vault operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
