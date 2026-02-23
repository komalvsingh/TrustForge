/**
 * link.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 2 of 3 — Links TrustForge ↔ TrustForgeDAO and hands off ownership.
 *
 * This script performs every linking step in the correct order:
 *   1. trustForge.setDAO(daoAddress)
 *   2. dao.setTrustForgeAddress(trustForgeAddress)
 *   3. trustForge.transferOwnershipToDAO(daoAddress, emergencyPauser)
 *
 * Run:
 *   npx hardhat run scripts/link.js --network sepolia
 *
 * After this script completes:
 *   → Run: npx hardhat run scripts/verify-deployment.js --network sepolia
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { ethers } = require("hardhat");
const fs         = require("fs");
const path       = require("path");
require("dotenv").config();

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║       TrustForge — Contract Linking               ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Load deployment data ──────────────────────────────────────────────────
  const network      = (await ethers.provider.getNetwork()).name;
  const chainId      = (await ethers.provider.getNetwork()).chainId.toString();
  const deployPath   = path.join(__dirname, "deployments", `${network}-${chainId}.json`);

  if (!fs.existsSync(deployPath)) {
    throw new Error(
      `No deployment file found at ${deployPath}.\nRun deploy.js first.`
    );
  }

  const deployment       = JSON.parse(fs.readFileSync(deployPath, "utf8"));
  const trustForgeAddress = deployment.contracts.TrustForge.address;
  const daoAddress        = deployment.contracts.TrustForgeDAO.address;
  const emergencyPauser   = deployment.emergencyPauser;

  if (deployment.setupCompleted.transferredOwnership) {
    console.log("⚠️  Ownership was already transferred in a previous run.");
    console.log("   Skipping link.js — run verify-deployment.js to check status.");
    return;
  }

  const [deployer] = await ethers.getSigners();

  console.log("📋 Linking Configuration:");
  console.log("─".repeat(50));
  console.log(`  Deployer:         ${deployer.address}`);
  console.log(`  TrustForge:       ${trustForgeAddress}`);
  console.log(`  TrustForgeDAO:    ${daoAddress}`);
  console.log(`  Emergency pauser: ${emergencyPauser}`);
  console.log("─".repeat(50));

  // ── Attach to deployed contracts ──────────────────────────────────────────
  const trustForge = await ethers.getContractAt("TrustForge",    trustForgeAddress);
  const dao        = await ethers.getContractAt("TrustForgeDAO", daoAddress);

  // ── Verify deployer is still owner before proceeding ─────────────────────
  const currentOwner = await trustForge.owner();
  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(
      `Deployer ${deployer.address} is not the current owner of TrustForge.\n` +
      `Current owner: ${currentOwner}`
    );
  }

  // ── Step 1: trustForge.setDAO(daoAddress) ─────────────────────────────────
  if (!deployment.setupCompleted.setDAO) {
    console.log("\n[1/3] Setting DAO address in TrustForge...");
    const tx1 = await trustForge.setDAO(daoAddress);
    await tx1.wait();
    console.log(`  ✅ trustForge.setDAO(${daoAddress})`);
    console.log(`  🔗 Tx: ${tx1.hash}`);

    deployment.setupCompleted.setDAO = true;
    fs.writeFileSync(deployPath, JSON.stringify(deployment, null, 2));
  } else {
    console.log("\n[1/3] ✅ setDAO already done — skipping");
  }

  // ── Step 2: dao.setTrustForgeAddress(trustForgeAddress) ───────────────────
  if (!deployment.setupCompleted.setTrustForgeAddress) {
    console.log("\n[2/3] Linking TrustForge address into DAO...");
    const tx2 = await dao.setTrustForgeAddress(trustForgeAddress);
    await tx2.wait();
    console.log(`  ✅ dao.setTrustForgeAddress(${trustForgeAddress})`);
    console.log(`  🔗 Tx: ${tx2.hash}`);

    deployment.setupCompleted.setTrustForgeAddress = true;
    fs.writeFileSync(deployPath, JSON.stringify(deployment, null, 2));
  } else {
    console.log("\n[2/3] ✅ setTrustForgeAddress already done — skipping");
  }

  // ── Step 3: transferOwnershipToDAO (POINT OF NO RETURN) ──────────────────
  console.log("\n[3/3] Transferring TrustForge ownership to DAO...");
  console.log("  ⚠️  THIS IS IRREVERSIBLE.");
  console.log(`  → DAO address:       ${daoAddress}  (will become owner)`);
  console.log(`  → Emergency pauser:  ${emergencyPauser}  (can only pause)`);
  console.log("  → Your deployer wallet loses all admin access after this.");
  console.log("\n  Proceeding in 3 seconds...");
  await new Promise((r) => setTimeout(r, 3000));

  const tx3 = await trustForge.transferOwnershipToDAO(daoAddress, emergencyPauser);
  await tx3.wait();
  console.log(`  ✅ trustForge.transferOwnershipToDAO() complete`);
  console.log(`  🔗 Tx: ${tx3.hash}`);

  deployment.setupCompleted.transferredOwnership = true;
  deployment.contracts.TrustForge.ownershipTxHash = tx3.hash;
  fs.writeFileSync(deployPath, JSON.stringify(deployment, null, 2));

  // ── Final checks ──────────────────────────────────────────────────────────
  console.log("\n📊 Post-link verification:");

  const newOwner       = await trustForge.owner();
  const daoContract    = await trustForge.daoContract();
  const pauser         = await trustForge.emergencyPauser();
  const linkedTF       = await dao.trustForge();

  const ownerIsDAO     = newOwner.toLowerCase()    === daoAddress.toLowerCase();
  const daoSet         = daoContract.toLowerCase() === daoAddress.toLowerCase();
  const pauserSet      = pauser.toLowerCase()      === emergencyPauser.toLowerCase();
  const tfLinked       = linkedTF.toLowerCase()    === trustForgeAddress.toLowerCase();

  console.log(`  trustForge.owner()          = ${newOwner}  ${ownerIsDAO  ? "✅" : "❌"}`);
  console.log(`  trustForge.daoContract()    = ${daoContract}  ${daoSet    ? "✅" : "❌"}`);
  console.log(`  trustForge.emergencyPauser()= ${pauser}  ${pauserSet  ? "✅" : "❌"}`);
  console.log(`  dao.trustForge()            = ${linkedTF}  ${tfLinked  ? "✅" : "❌"}`);

  const allGood = ownerIsDAO && daoSet && pauserSet && tfLinked;

  if (allGood) {
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log("║            Linking Complete ✅                     ║");
    console.log("╚══════════════════════════════════════════════════╝");
    console.log("\n⏭️  Next step:");
    console.log("  npx hardhat run scripts/verify-deployment.js --network", network);
  } else {
    console.log("\n❌ Some checks failed. Review the output above.");
  }
}

main().catch((err) => {
  console.error("\n❌ Linking failed:", err.message);
  process.exit(1);
});