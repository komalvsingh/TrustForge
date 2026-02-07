// scripts/deploy_to_your_network.js
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TFXReserveVault...\n");

  // ============================================
  // 🔧 CONFIGURE THESE FOR YOUR NETWORK
  // ============================================

  // Option 1: Ethereum Mainnet
  // const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

  // Option 2: Polygon
  // const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

  // Option 3: Arbitrum
  // const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  // Option 4: Base
  // const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

  // Option 5: Sepolia Testnet (for testing)
  const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC on Sepolia

  // TFXToken address (the one you DON'T own but exists)
  const TFX_ADDRESS = "0x4b821BBc5C7327A400486eFB61DA250979e32b3B"; // ⚠️ REPLACE THIS!

  // ============================================
  // 🚀 DEPLOYMENT
  // ============================================

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("\n");

  console.log("Using USDC at:", USDC_ADDRESS);
  console.log("Using TFX at:", TFX_ADDRESS);
  console.log("\n");

  // Deploy the vault
  const TFXReserveVault = await hre.ethers.getContractFactory("TFXReserveVault");
  const vault = await TFXReserveVault.deploy(USDC_ADDRESS, TFX_ADDRESS);
  await vault.deployed();

  console.log("✅ TFXReserveVault deployed to:", vault.address);
  console.log("\n");

  // ============================================
  // ⚙️ INITIAL CONFIGURATION
  // ============================================

  console.log("⚙️  Configuring vault parameters...\n");

  // Set 0.3% fees (conservative)
  console.log("Setting fees to 0.3%...");
  await vault.setFees(30, 30); // 30 basis points = 0.3%
  console.log("✅ Fees set\n");

  // Set minimum transaction to 1 USDC
  console.log("Setting minimum transaction to 1 USDC...");
  await vault.setMinTransaction(ethers.utils.parseUnits("1", 6));
  console.log("✅ Minimum set\n");

  // ============================================
  // 📊 VAULT INFO
  // ============================================

  console.log("📊 Vault Configuration:");
  console.log("├─ Address:", vault.address);
  console.log("├─ Owner:", await vault.owner());
  console.log("├─ Rate:", (await vault.rate()).toString(), "(10000 = 1:1)");
  console.log("├─ Buy Fee:", (await vault.buyFee()).toString(), "bps");
  console.log("├─ Sell Fee:", (await vault.sellFee()).toString(), "bps");
  console.log("└─ Min Transaction:", ethers.utils.formatUnits(await vault.minTransactionAmount(), 6), "USDC");
  console.log("\n");

  // ============================================
  // 📝 NEXT STEPS
  // ============================================

  console.log("📝 NEXT STEPS:");
  console.log("\n1️⃣  Verify contract on block explorer:");
  console.log(`   npx hardhat verify --network YOUR_NETWORK ${vault.address} "${USDC_ADDRESS}" "${TFX_ADDRESS}"`);

  console.log("\n2️⃣  Add liquidity to the vault:");
  console.log("   You need to approve and transfer USDC + TFX");
  console.log("   Example:");
  console.log(`   - USDC: 10,000 USDC`);
  console.log(`   - TFX: 10,000 TFX`);

  console.log("\n3️⃣  Test with small transactions first!");
  console.log("   - Buy 10 TFX with 10 USDC");
  console.log("   - Sell 10 TFX back for USDC");
  console.log("   - Verify balances");

  console.log("\n4️⃣  Monitor the vault:");
  console.log(`   vault.getVaultLiquidity()`);
  console.log(`   vault.getVaultStats()`);

  console.log("\n✅ Deployment Complete!\n");

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    vaultAddress: vault.address,
    usdcAddress: USDC_ADDRESS,
    tfxAddress: TFX_ADDRESS,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    buyFee: 30,
    sellFee: 30,
    minTransaction: "1 USDC"
  };

  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Deployment info saved to deployment-info.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
