/**
 * deploy.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 1 of 3 — Deploys TrustForge and TrustForgeDAO contracts.
 *
 * Run:
 *   npx hardhat run scripts/deploy.js --network sepolia
 *
 * After this script completes:
 *   → Run: npx hardhat run scripts/link.js --network sepolia
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { ethers } = require("hardhat");
const fs         = require("fs");
const path       = require("path");
require("dotenv").config();

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║       TrustForge — Contract Deployment            ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Validate environment variables ────────────────────────────────────────
  const requiredEnv = [
    "USDC_TOKEN_ADDRESS",
    "ADMIN_WALLET",
    "EMERGENCY_PAUSER",
    "QUORUM_THRESHOLD",
  ];

  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing required env variable: ${key}. Check your .env file.`);
    }
  }

  const USDC_ADDRESS      = process.env.USDC_TOKEN_ADDRESS;
  const ADMIN_WALLET      = process.env.ADMIN_WALLET;
  const EMERGENCY_PAUSER  = process.env.EMERGENCY_PAUSER;
  const QUORUM_THRESHOLD  = process.env.QUORUM_THRESHOLD;

  // ── Signer info ───────────────────────────────────────────────────────────
  const [deployer] = await ethers.getSigners();
  const deployerBalance = await ethers.provider.getBalance(deployer.address);

  console.log("📋 Deployment Configuration:");
  console.log("─".repeat(50));
  console.log(`  Deployer:          ${deployer.address}`);
  console.log(`  Deployer balance:  ${ethers.formatEther(deployerBalance)} ETH`);
  console.log(`  USDC token:        ${USDC_ADDRESS}`);
  console.log(`  Admin wallet:      ${ADMIN_WALLET}`);
  console.log(`  Emergency pauser:  ${EMERGENCY_PAUSER}`);
  console.log(`  Quorum threshold:  ${Number(QUORUM_THRESHOLD) / 1e6} USDC`);
  console.log(`  Network:           ${(await ethers.provider.getNetwork()).name}`);
  console.log("─".repeat(50));

  // Safety check — deployer shouldn't be admin or pauser (separation of concerns)
  if (deployer.address.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
    console.warn("\n⚠️  WARNING: Deployer and admin wallet are the same address.");
    console.warn("   Consider using a separate treasury wallet for admin fees.\n");
  }

  // ── TrustForge — already deployed, skipping ───────────────────────────────
  // console.log("\n[1/2] Deploying TrustForge...");
  // const TrustForge        = await ethers.getContractFactory("TrustForge");
  // const trustForge        = await TrustForge.deploy(USDC_ADDRESS, ADMIN_WALLET);
  // await trustForge.waitForDeployment();
  // const trustForgeAddress = await trustForge.getAddress();
  // console.log(`  ✅ TrustForge deployed at: ${trustForgeAddress}`);
  // console.log(`  🔗 Tx hash: ${trustForge.deploymentTransaction().hash}`);

  // ⬇️  Paste your already-deployed TrustForge address here
  const trustForgeAddress = "0x3013e7F2a98F60433BAe85c4E5569A980B0C7Cf7";
  console.log(`\n[1/2] TrustForge — using existing deployment: ${trustForgeAddress}`);

  // ── Deploy TrustForgeDAO ─────────────────────────────────────────────────
  console.log("\n[2/2] Deploying TrustForgeDAO...");

  const TrustForgeDAO = await ethers.getContractFactory("TrustForgeDAO");
  const dao           = await TrustForgeDAO.deploy(USDC_ADDRESS, QUORUM_THRESHOLD);
  await dao.waitForDeployment();
  const daoAddress    = await dao.getAddress();

  console.log(`  ✅ TrustForgeDAO deployed at: ${daoAddress}`);
  console.log(`  🔗 Tx hash: ${dao.deploymentTransaction().hash}`);

  // ── Save deployment addresses to file ────────────────────────────────────
  const network   = (await ethers.provider.getNetwork()).name;
  const chainId   = (await ethers.provider.getNetwork()).chainId.toString();
  const timestamp = new Date().toISOString();

  const deploymentData = {
    network,
    chainId,
    timestamp,
    deployer:         deployer.address,
    adminWallet:      ADMIN_WALLET,
    emergencyPauser:  EMERGENCY_PAUSER,
    quorumThreshold:  QUORUM_THRESHOLD,
    contracts: {
      TrustForge: {
        address: trustForgeAddress,
        txHash:  "existing deployment — not redeployed",
      },
      TrustForgeDAO: {
        address: daoAddress,
        txHash:  dao.deploymentTransaction().hash,
      },
    },
    // Tracks which setup steps have been completed
    setupCompleted: {
      deployed:              true,
      setDAO:                false,
      setTrustForgeAddress:  false,
      transferredOwnership:  false,
      verified:              false,
    },
  };

  const deploymentsDir  = path.join(__dirname, "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const outputPath = path.join(deploymentsDir, `${network}-${chainId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));

  console.log(`\n  💾 Deployment data saved to: ${outputPath}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║            Deployment Complete ✅                  ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\n  TrustForge:    ${trustForgeAddress}  (existing)`);
  console.log(`  TrustForgeDAO: ${daoAddress}  (new)`);
  console.log("\n⚠️  Re-run all linking steps — new DAO address requires re-wiring.");
  console.log("\n⏭️  Next step:");
  console.log("  npx hardhat run scripts/link.js --network", network);
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Deployment failed:", err.message);
  process.exit(1);
});