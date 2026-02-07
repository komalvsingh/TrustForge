// // scripts/deploy.js
// const hre = require("hardhat");

// async function main() {
//   console.log("Starting deployment...\n");

//   // Get the deployer account
//   const [deployer] = await hre.ethers.getSigners();
//   console.log("Deploying contracts with account:", deployer.address);
//   console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
//   console.log("\n");

//   // ============ Step 1: Deploy TFXToken ============
//   console.log("📝 Deploying TFXToken...");
//   const TFXToken = await hre.ethers.getContractFactory("TFXToken");
//   const tfxToken = await TFXToken.deploy();
//   await tfxToken.waitForDeployment();
//   const tfxTokenAddress = await tfxToken.getAddress();

//   console.log("✅ TFXToken deployed to:", tfxTokenAddress);
//   console.log("   Token Name: TrustForge Token");
//   console.log("   Token Symbol: TFX");
//   console.log("   Initial Supply: 1,000,000 TFX");
//   console.log("\n");

//   // ============ Step 2: Deploy TrustForge ============
//   console.log("📝 Deploying TrustForge...");
//   const TrustForge = await hre.ethers.getContractFactory("TrustForge");
//   const trustForge = await TrustForge.deploy(tfxTokenAddress);
//   await trustForge.waitForDeployment();
//   const trustForgeAddress = await trustForge.getAddress();

//   console.log("✅ TrustForge deployed to:", trustForgeAddress);
//   console.log("\n");

//   // ============ Step 3: Verification Info ============
//   console.log("📋 Deployment Summary:");
//   console.log("==========================================");
//   console.log("TFXToken Address:    ", tfxTokenAddress);
//   console.log("TrustForge Address:  ", trustForgeAddress);
//   console.log("Deployer Address:    ", deployer.address);
//   console.log("==========================================");
//   console.log("\n");

//   // ============ Step 4: Save Deployment Info ============
//   const fs = require("fs");
//   const deploymentInfo = {
//     network: hre.network.name,
//     deployer: deployer.address,
//     timestamp: new Date().toISOString(),
//     contracts: {
//       TFXToken: {
//         address: tfxTokenAddress,
//         name: "TrustForge Token",
//         symbol: "TFX"
//       },
//       TrustForge: {
//         address: trustForgeAddress,
//         lendingToken: tfxTokenAddress
//       }
//     }
//   };

//   fs.writeFileSync(
//     "deployment-info.json",
//     JSON.stringify(deploymentInfo, null, 2)
//   );
//   console.log("✅ Deployment info saved to deployment-info.json\n");

//   // ============ Step 5: Verification Commands ============
//   if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
//     console.log("📝 Verification Commands:");
//     console.log("==========================================");
//     console.log("\nTo verify TFXToken:");
//     console.log(`npx hardhat verify --network ${hre.network.name} ${tfxTokenAddress}`);
//     console.log("\nTo verify TrustForge:");
//     console.log(`npx hardhat verify --network ${hre.network.name} ${trustForgeAddress} ${tfxTokenAddress}`);
//     console.log("\n==========================================\n");
//   }

//   // ============ Step 6: Next Steps ============
//   console.log("📌 Next Steps:");
//   console.log("==========================================");
//   console.log("1. Approve TrustForge to spend TFX tokens (for lenders)");
//   console.log("2. Deposit liquidity into the pool using depositToPool()");
//   console.log("3. Users can request loans using requestLoan()");
//   console.log("4. (Optional) Enable DAO governance using enableDAO()");
//   console.log("==========================================\n");

//   console.log("🎉 Deployment completed successfully!\n");

//   return {
//     tfxToken: tfxTokenAddress,
//     trustForge: trustForgeAddress
//   };
// }

// // Execute deployment
// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });

 const hre = require("hardhat");
const { ethers } = require("hardhat"); // Add this line!
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying TFXReserveVault to", hre.network.name, "\n");

  // Get addresses from .env
  const USDC_ADDRESS = process.env.USDC_ADDRESS;
  const TFX_ADDRESS = process.env.TFX_ADDRESS;

  if (!USDC_ADDRESS || !TFX_ADDRESS) {
    throw new Error("Please set USDC_ADDRESS and TFX_ADDRESS in .env file");
  }

  const [deployer] = await ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);

  console.log("Deploying from:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  console.log("Using USDC at:", USDC_ADDRESS);
  console.log("Using TFX at:", TFX_ADDRESS);
  console.log("\n");

  // Deploy
  console.log("Deploying contract...");
  const TFXReserveVault = await ethers.getContractFactory("TFXReserveVault");
  const vault = await TFXReserveVault.deploy(USDC_ADDRESS, TFX_ADDRESS);
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("✅ Vault deployed to:", vaultAddress);

  // Configure
  console.log("\n⚙️  Configuring vault...");

  console.log("Setting fees to 0.3%...");
  const feesTx = await vault.setFees(30, 30); // 30 basis points = 0.3%
  await feesTx.wait();
  console.log("✅ Fees set");

  console.log("\nSetting minimum transaction to 1 USDC...");
  const minTx = await vault.setMinTransaction(ethers.parseUnits("1", 6)); // 1 USDC (6 decimals)
  await minTx.wait();
  console.log("✅ Minimum set");

  console.log("\n✅ Configuration complete!");

  // Display info
  console.log("\n📊 Vault Configuration:");
  console.log("├─ Address:", vaultAddress);
  console.log("├─ Owner:", await vault.owner());
  console.log("├─ Rate:", (await vault.rate()).toString(), "(10000 = 1:1)");
  console.log("├─ Buy Fee:", (await vault.buyFee()).toString(), "bps");
  console.log("├─ Sell Fee:", (await vault.sellFee()).toString(), "bps");
  console.log("└─ Min Transaction:", ethers.formatUnits(await vault.minTransactionAmount(), 6), "USDC");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    vaultAddress: vaultAddress,
    usdcAddress: USDC_ADDRESS,
    tfxAddress: TFX_ADDRESS,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  console.log("\n📋 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require('fs');
  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Saved to deployment-info.json");

  // Next steps
  console.log("\n📝 NEXT STEPS:");
  console.log("\n1️⃣  Verify contract on Etherscan:");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${vaultAddress} "${USDC_ADDRESS}" "${TFX_ADDRESS}"`);

  console.log("\n2️⃣  Add liquidity to the vault:");
  console.log("   You need USDC and TFX tokens");
  console.log("   Run: npx hardhat run scripts/add_liquidity.js --network sepolia");

  console.log("\n3️⃣  Test the vault:");
  console.log("   Run: npx hardhat run scripts/test_buy.js --network sepolia");

  console.log("\n✅ Deployment Complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
