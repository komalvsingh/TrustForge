/**
 * deploy.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 1 of 3 — Deploys TrustForge v6 and TrustForgeDAO fresh.
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
  console.log("║     TrustForge v6 — Fresh Contract Deployment     ║");
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

  const USDC_ADDRESS     = process.env.USDC_TOKEN_ADDRESS;
  const ADMIN_WALLET     = process.env.ADMIN_WALLET;
  const EMERGENCY_PAUSER = process.env.EMERGENCY_PAUSER;
  const QUORUM_THRESHOLD = process.env.QUORUM_THRESHOLD;

  // ── Signer info ───────────────────────────────────────────────────────────
  const [deployer] = await ethers.getSigners();
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  const network = await ethers.provider.getNetwork();

  console.log("📋 Deployment Configuration:");
  console.log("─".repeat(52));
  console.log(`  Deployer:          ${deployer.address}`);
  console.log(`  Deployer balance:  ${ethers.formatEther(deployerBalance)} ETH`);
  console.log(`  USDC token:        ${USDC_ADDRESS}`);
  console.log(`  Admin wallet:      ${ADMIN_WALLET}`);
  console.log(`  Emergency pauser:  ${EMERGENCY_PAUSER}`);
  console.log(`  Quorum threshold:  ${Number(QUORUM_THRESHOLD) / 1e6} USDC`);
  console.log(`  Network:           ${network.name} (chainId: ${network.chainId})`);
  console.log("─".repeat(52));

  // ── Safety checks ─────────────────────────────────────────────────────────
  if (deployer.address.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
    console.warn("\n⚠️  WARNING: Deployer and admin wallet are the same address.");
    console.warn("   Consider using a separate treasury wallet for admin fees.\n");
  }

  if (EMERGENCY_PAUSER.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
    console.warn("\n⚠️  WARNING: Emergency pauser and admin wallet are the same address.");
    console.warn("   These should ideally be separate for security.\n");
  }

  if (ethers.formatEther(deployerBalance) < 0.05) {
    console.warn("\n⚠️  WARNING: Deployer balance is low (< 0.05 ETH).");
    console.warn("   Make sure you have enough ETH for both deployments + linking txs.\n");
  }

  // ── [1/2] Deploy TrustForge v6 ────────────────────────────────────────────
  console.log("\n[1/2] Deploying TrustForge v6...");
  console.log("      Changes from v5:");
  console.log("      • 3-per-30-day loan window → 10-hour repayment cooldown");
  console.log("      • getClaimableInterest() view function added");
  console.log("      • markDefault() status bug fixed (FIX-05)");

  const TrustForge  = await ethers.getContractFactory("TrustForge");
  const trustForge  = await TrustForge.deploy(USDC_ADDRESS, ADMIN_WALLET);
  await trustForge.waitForDeployment();
  const trustForgeAddress = await trustForge.getAddress();

  console.log(`\n  ✅ TrustForge v6 deployed at: ${trustForgeAddress}`);
  console.log(`  🔗 Tx hash: ${trustForge.deploymentTransaction().hash}`);

  // Quick sanity check — verify constructor args were set correctly
  const deployedToken       = await trustForge.lendingToken();
  const deployedAdminWallet = await trustForge.adminWallet();
  console.log(`\n  🔍 Verification:`);
  console.log(`     lendingToken  = ${deployedToken}  ${deployedToken.toLowerCase() === USDC_ADDRESS.toLowerCase() ? "✅" : "❌ MISMATCH"}`);
  console.log(`     adminWallet   = ${deployedAdminWallet}  ${deployedAdminWallet.toLowerCase() === ADMIN_WALLET.toLowerCase() ? "✅" : "❌ MISMATCH"}`);

  // ── [2/2] Deploy TrustForgeDAO ────────────────────────────────────────────
  console.log("\n[2/2] Deploying TrustForgeDAO v3.1...");

  const TrustForgeDAO = await ethers.getContractFactory("TrustForgeDAO");
  const dao           = await TrustForgeDAO.deploy(USDC_ADDRESS, QUORUM_THRESHOLD);
  await dao.waitForDeployment();
  const daoAddress    = await dao.getAddress();

  console.log(`\n  ✅ TrustForgeDAO deployed at: ${daoAddress}`);
  console.log(`  🔗 Tx hash: ${dao.deploymentTransaction().hash}`);

  // Quick sanity check
  const deployedQuorum = await dao.quorumThreshold();
  console.log(`\n  🔍 Verification:`);
  console.log(`     quorumThreshold = ${Number(deployedQuorum) / 1e6} USDC  ${deployedQuorum.toString() === QUORUM_THRESHOLD ? "✅" : "❌ MISMATCH"}`);

  // ── Save deployment data ──────────────────────────────────────────────────
  const timestamp = new Date().toISOString();
  const chainId   = network.chainId.toString();

  const deploymentData = {
    network:          network.name,
    chainId,
    timestamp,
    deployer:         deployer.address,
    adminWallet:      ADMIN_WALLET,
    emergencyPauser:  EMERGENCY_PAUSER,
    quorumThreshold:  QUORUM_THRESHOLD,
    contracts: {
      TrustForge: {
        version: "v6",
        address: trustForgeAddress,
        txHash:  trustForge.deploymentTransaction().hash,
        constructorArgs: {
          lendingToken: USDC_ADDRESS,
          adminWallet:  ADMIN_WALLET,
        },
      },
      TrustForgeDAO: {
        version: "v3.1",
        address: daoAddress,
        txHash:  dao.deploymentTransaction().hash,
        constructorArgs: {
          usdcToken:        USDC_ADDRESS,
          quorumThreshold:  QUORUM_THRESHOLD,
        },
      },
    },
    // Tracks which setup steps have been completed — updated by link.js
    setupCompleted: {
      deployed:             true,
      setDAO:               false,
      setTrustForgeAddress: false,
      transferredOwnership: false,
      verified:             false,
    },
  };

  const deploymentsDir = path.join(__dirname, "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const outputPath = path.join(deploymentsDir, `${network.name}-${chainId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log(`\n  💾 Deployment data saved to: ${outputPath}`);

  // ── Reminder: update frontend addresses ───────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         Both Contracts Deployed ✅                 ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\n  TrustForge v6:    ${trustForgeAddress}`);
  console.log(`  TrustForgeDAO:    ${daoAddress}`);

  console.log("\n📝 Update these files with the new addresses:");
  console.log("─".repeat(52));
  console.log("  src/context/BlockchainContext.js");
  console.log(`    TRUSTFORGE_ADDRESS = "${trustForgeAddress}"`);
  console.log(`    DAO_ADDRESS        = "${daoAddress}"`);
  console.log("\n  src/context/DAOContext.js");
  console.log(`    DAO_ADDRESS        = "${daoAddress}"`);
  console.log(`    TRUSTFORGE_ADDRESS = "${trustForgeAddress}"`);

  console.log("\n⏭️  Next step — run the linking script:");
  console.log(`  npx hardhat run scripts/link.js --network ${network.name}`);
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Deployment failed:", err.message);
  process.exit(1);
});