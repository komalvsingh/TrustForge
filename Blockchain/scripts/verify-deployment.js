/**
 * verify-deployment.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 3 of 3 — Full system verification after deploy + link.
 *
 * Checks every aspect of the deployment:
 *   ✅ Contract ownership
 *   ✅ DAO ↔ TrustForge link
 *   ✅ Emergency pauser
 *   ✅ USDC token connection
 *   ✅ All pool stats
 *   ✅ All contract parameters
 *   ✅ DAO quorum
 *
 * Run:
 *   npx hardhat run scripts/verify-deployment.js --network sepolia
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { ethers } = require("hardhat");
const fs         = require("fs");
const path       = require("path");
require("dotenv").config();

// Pretty print helper
function check(label, value, expected, format = (v) => v) {
  const pass = expected === undefined
    ? !!value
    : String(value).toLowerCase() === String(expected).toLowerCase();
  const icon  = pass ? "✅" : "❌";
  const shown = format(value);
  console.log(`  ${icon}  ${label.padEnd(35)} ${shown}`);
  return pass;
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║       TrustForge — Deployment Verification        ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Load deployment data ──────────────────────────────────────────────────
  const network    = (await ethers.provider.getNetwork()).name;
  const chainId    = (await ethers.provider.getNetwork()).chainId.toString();
  const deployPath = path.join(__dirname, "deployments", `${network}-${chainId}.json`);

  if (!fs.existsSync(deployPath)) {
    throw new Error(`No deployment file at ${deployPath}. Run deploy.js first.`);
  }

  const deployment        = JSON.parse(fs.readFileSync(deployPath, "utf8"));
  const trustForgeAddress = deployment.contracts.TrustForge.address;
  const daoAddress        = deployment.contracts.TrustForgeDAO.address;
  const adminWallet       = deployment.adminWallet;
  const emergencyPauser   = deployment.emergencyPauser;

  const trustForge = await ethers.getContractAt("TrustForge",    trustForgeAddress);
  const dao        = await ethers.getContractAt("TrustForgeDAO", daoAddress);

  let totalChecks  = 0;
  let passedChecks = 0;

  function runCheck(label, value, expected, format) {
    totalChecks++;
    const passed = check(label, value, expected, format);
    if (passed) passedChecks++;
    return passed;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Section 1: Ownership & Linking
  // ─────────────────────────────────────────────────────────────────────────
  console.log("━━━  1. Ownership & Linking  ━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const owner         = await trustForge.owner();
  const daoContract   = await trustForge.daoContract();
  const pauser        = await trustForge.emergencyPauser();
  const linkedTF      = await dao.trustForge();
  const tfNotPaused   = !(await trustForge.paused());

  runCheck("trustForge.owner() == DAO",      owner,      daoAddress);
  runCheck("trustForge.daoContract() == DAO", daoContract, daoAddress);
  runCheck("emergencyPauser set correctly",   pauser,     emergencyPauser);
  runCheck("dao.trustForge() == TrustForge",  linkedTF,   trustForgeAddress);
  runCheck("TrustForge is not paused",        tfNotPaused, true);

  // ─────────────────────────────────────────────────────────────────────────
  // Section 2: DAO Verification
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n━━━  2. DAO Configuration  ━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const quorum        = await dao.quorumThreshold();
  const proposalCount = await dao.proposalCount();
  const daoUsdc       = await dao.usdcToken();
  const tfUsdc        = await trustForge.lendingToken();

  runCheck(
    "Quorum threshold",
    quorum,
    undefined,
    (v) => `${(Number(v) / 1e6).toFixed(2)} USDC`
  );
  runCheck("Proposal count (should be 0)", proposalCount, 0n);
  runCheck(
    "DAO USDC token matches TrustForge",
    daoUsdc.toLowerCase() === tfUsdc.toLowerCase(),
    true,
    () => daoUsdc
  );

  // DAO verifyLink() built-in check
  const linkStatus = await dao.verifyLink();
  runCheck("dao.verifyLink() — readyForGovernance", linkStatus.readyForGovernance, true);

  // ─────────────────────────────────────────────────────────────────────────
  // Section 3: TrustForge Parameters
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n━━━  3. TrustForge Parameters  ━━━━━━━━━━━━━━━━━━━━━━━\n");

  const platformFee    = await trustForge.platformFeeBps();
  const adminWalletSet = await trustForge.adminWallet();
  const minLoan        = await trustForge.MIN_LOAN_AMOUNT();
  const maxLoan        = await trustForge.MAX_LOAN_DURATION();
  const minDuration    = await trustForge.MIN_LOAN_DURATION();
  const gracePeriod    = await trustForge.GRACE_PERIOD();
  const cooldown       = await trustForge.DEFAULT_COOLDOWN_PERIOD();
  const autoLimit      = await trustForge.autoLimitEnabled();
  const lowLimit       = await trustForge.LOW_TRUST_LIMIT();
  const medLimit       = await trustForge.MED_TRUST_LIMIT();
  const highLimit      = await trustForge.HIGH_TRUST_LIMIT();

  runCheck("platformFeeBps",         platformFee,    200n,  (v) => `${v} bps (${Number(v)/100}%)`);
  runCheck("adminWallet set",         adminWalletSet, adminWallet);
  runCheck("MIN_LOAN_AMOUNT",         minLoan,        10000n, (v) => `${Number(v)/1e6} USDC`);
  runCheck("MIN_LOAN_DURATION",       minDuration,    86400n, (v) => `${Number(v)/86400} day(s)`);
  runCheck("MAX_LOAN_DURATION",       maxLoan,        15552000n, (v) => `${Number(v)/86400} days`);
  runCheck("GRACE_PERIOD",            gracePeriod,    259200n, (v) => `${Number(v)/86400} days`);
  runCheck("DEFAULT_COOLDOWN_PERIOD", cooldown,       2592000n, (v) => `${Number(v)/86400} days`);
  runCheck("autoLimitEnabled",        autoLimit,      true);
  runCheck("LOW_TRUST_LIMIT",         lowLimit,       1000000n, (v) => `${Number(v)/1e6} USDC`);
  runCheck("MED_TRUST_LIMIT",         medLimit,       5000000n, (v) => `${Number(v)/1e6} USDC`);
  runCheck("HIGH_TRUST_LIMIT",        highLimit,      20000000n, (v) => `${Number(v)/1e6} USDC`);

  // ─────────────────────────────────────────────────────────────────────────
  // Section 4: Interest Rate Parameters
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n━━━  4. Interest Rate Parameters  ━━━━━━━━━━━━━━━━━━━━\n");

  const baseLow  = await trustForge.BASE_INTEREST_RATE_LOW();
  const maxLow   = await trustForge.MAX_INTEREST_RATE_LOW();
  const baseMed  = await trustForge.BASE_INTEREST_RATE_MED();
  const maxMed   = await trustForge.MAX_INTEREST_RATE_MED();
  const baseHigh = await trustForge.BASE_INTEREST_RATE_HIGH();
  const maxHigh  = await trustForge.MAX_INTEREST_RATE_HIGH();

  const bps = (v) => `${Number(v)/100}%`;

  runCheck("LOW_RISK  base rate",   baseLow,  300n,  bps);
  runCheck("LOW_RISK  max rate",    maxLow,   800n,  bps);
  runCheck("MED_RISK  base rate",   baseMed,  700n,  bps);
  runCheck("MED_RISK  max rate",    maxMed,   1500n, bps);
  runCheck("HIGH_RISK base rate",   baseHigh, 1200n, bps);
  runCheck("HIGH_RISK max rate",    maxHigh,  2500n, bps);

  // ─────────────────────────────────────────────────────────────────────────
  // Section 5: Pool Stats (should all be zero at launch)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n━━━  5. Pool Stats (fresh deployment — all should be 0)  ━\n");

  const [lowStats, medStats, highStats] = await trustForge.getAllPoolStats();

  const poolLabel = (name, stats) => {
    const allZero =
      stats.totalLiquidity    === 0n &&
      stats.totalActiveLoans  === 0n &&
      stats.totalDefaulted    === 0n &&
      stats.totalInterestPool === 0n &&
      stats.totalLenderDeposits === 0n;

    runCheck(`${name} pool — all zeros`, allZero, true, () =>
      `liquidity=${Number(stats.totalLiquidity)/1e6} USDC`
    );
  };

  poolLabel("LOW_RISK",    lowStats);
  poolLabel("MEDIUM_RISK", medStats);
  poolLabel("HIGH_RISK",   highStats);

  // ─────────────────────────────────────────────────────────────────────────
  // Section 6: TrustForge getDeploymentStatus()
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n━━━  6. TrustForge Built-in Deployment Status  ━━━━━━━━\n");

  const status = await trustForge.getDeploymentStatus();

  runCheck("hasLendingToken",     status.hasLendingToken,    true);
  runCheck("hasAdminWallet",      status.hasAdminWallet,     true);
  runCheck("hasDAOContract",      status.hasDAOContract,     true);
  runCheck("hasEmergencyPauser",  status.hasEmergencyPauser, true);
  runCheck("daoIsOwner",          status.daoIsOwner,         true);
  runCheck("isNotPaused",         status.isNotPaused,        true);

  // ─────────────────────────────────────────────────────────────────────────
  // Final Score
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(52));
  console.log(`  Verification result: ${passedChecks}/${totalChecks} checks passed`);

  if (passedChecks === totalChecks) {
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log("║      🎉  All checks passed — System is live!       ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    // Mark as verified in deployment file
    deployment.setupCompleted.verified = true;
    deployment.verifiedAt = new Date().toISOString();
    fs.writeFileSync(deployPath, JSON.stringify(deployment, null, 2));

    console.log("Contract Addresses:");
    console.log(`  TrustForge:    ${trustForgeAddress}`);
    console.log(`  TrustForgeDAO: ${daoAddress}\n`);

    console.log("Next steps:");
    console.log("  1. Verify contracts on block explorer:");
    console.log(`     npx hardhat verify --network ${network} ${trustForgeAddress} "${await trustForge.lendingToken()}" "${adminWallet}"`);
    console.log(`     npx hardhat verify --network ${network} ${daoAddress} "${await dao.usdcToken()}" "${quorum}"`);
    console.log("  2. Lenders can now deposit into pools via depositToPool()");
    console.log("  3. Borrowers can register usernames and request loans");
    console.log("  4. Governance proposals go through TrustForgeDAO\n");
  } else {
    const failCount = totalChecks - passedChecks;
    console.log(`\n  ❌ ${failCount} check(s) failed — DO NOT open the platform yet.`);
    console.log("  Review the ❌ items above and fix before going live.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Verification failed:", err.message);
  process.exit(1);
});