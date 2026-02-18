const { ethers } = require("hardhat");
require("dotenv").config();

// ── Config ────────────────────────────────────────────────────────────────────
const VAULT_ADDRESS = "0x1023a17d0E6094cc83Aa38791dbd094856c229fA";
const USDC_ADDRESS  = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const TFX_ADDRESS   = "0x4b821BBc5C7327A400486eFB61DA250979e32b3B";

// How much liquidity to add — edit these values as needed
const USDC_AMOUNT = "20";   // 100 USDC
const TFX_AMOUNT  = "20";   // 100 TFX

// ── ABIs ──────────────────────────────────────────────────────────────────────
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const VAULT_ABI = [
  "function addUSDCLiquidity(uint256 amount) external",
  "function addTFXLiquidity(uint256 amount) external",
  "function getVaultLiquidity() view returns (uint256, uint256, uint256, uint256)",
  "function owner() view returns (address)",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(val, decimals, symbol) {
  return `${ethers.formatUnits(val, decimals)} ${symbol}`;
}

async function addLiquidity(
  label,
  tokenContract,
  vaultContract,
  addFn,        // "addUSDCLiquidity" | "addTFXLiquidity"
  humanAmount,
  decimals,
  symbol,
  deployer
) {
  console.log(`\n── Adding ${humanAmount} ${symbol} liquidity ──────────────────`);

  const amountWei = ethers.parseUnits(humanAmount, decimals);

  // 1. Check balance
  const balance = await tokenContract.balanceOf(deployer.address);
  console.log(`Your ${symbol} balance : ${fmt(balance, decimals, symbol)}`);

  if (balance < amountWei) {
    console.error(
      `❌  Insufficient ${symbol}. Need ${humanAmount}, have ${ethers.formatUnits(balance, decimals)}`
    );
    return false;
  }

  // 2. Approve if needed
  const allowance = await tokenContract.allowance(deployer.address, VAULT_ADDRESS);
  if (allowance < amountWei) {
    console.log(`Approving ${humanAmount} ${symbol} for vault...`);
    const approveTx = await tokenContract.approve(VAULT_ADDRESS, amountWei);
    await approveTx.wait();
    console.log(`✅  Approved  (tx: ${approveTx.hash})`);
  } else {
    console.log(`✅  Allowance already sufficient`);
  }

  // 3. Add liquidity
  console.log(`Sending ${humanAmount} ${symbol} to vault...`);
  const tx = await vaultContract[addFn](amountWei);
  await tx.wait();
  console.log(`✅  Added     (tx: ${tx.hash})`);

  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("       Add Liquidity → TFXReserveVault         ");
  console.log("═══════════════════════════════════════════════");

  const [deployer] = await ethers.getSigners();
  const ethBalance = await deployer.provider.getBalance(deployer.address);

  console.log(`\nNetwork  : ${(await deployer.provider.getNetwork()).name}`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`ETH bal  : ${ethers.formatEther(ethBalance)} ETH`);

  // ── Contracts ──────────────────────────────────────────────────────────────
  const usdcContract  = new ethers.Contract(USDC_ADDRESS,  ERC20_ABI,  deployer);
  const tfxContract   = new ethers.Contract(TFX_ADDRESS,   ERC20_ABI,  deployer);
  const vaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI,  deployer);

  // ── Owner check ────────────────────────────────────────────────────────────
  const owner = await vaultContract.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(
      `❌  Only the vault owner can add liquidity.\n` +
      `   Owner   : ${owner}\n` +
      `   You are : ${deployer.address}`
    );
  }
  console.log(`\n✅  Owner check passed`);

  // ── Before snapshot ────────────────────────────────────────────────────────
  console.log("\n📊 Vault liquidity BEFORE:");
  const [usdcBefore, tfxBefore] = await vaultContract.getVaultLiquidity();
  console.log(`   USDC : ${fmt(usdcBefore, 6,  "USDC")}`);
  console.log(`   TFX  : ${fmt(tfxBefore,  18, "TFX")}`);

  // ── Add USDC ───────────────────────────────────────────────────────────────
  const usdcOk = await addLiquidity(
    "USDC",
    usdcContract,
    vaultContract,
    "addUSDCLiquidity",
    USDC_AMOUNT,
    6,
    "USDC",
    deployer
  );

  // ── Add TFX ────────────────────────────────────────────────────────────────
  const tfxOk = await addLiquidity(
    "TFX",
    tfxContract,
    vaultContract,
    "addTFXLiquidity",
    TFX_AMOUNT,
    18,
    "TFX",
    deployer
  );

  // ── After snapshot ─────────────────────────────────────────────────────────
  console.log("\n📊 Vault liquidity AFTER:");
  const [usdcAfter, tfxAfter] = await vaultContract.getVaultLiquidity();
  console.log(`   USDC : ${fmt(usdcAfter, 6,  "USDC")}`);
  console.log(`   TFX  : ${fmt(tfxAfter,  18, "TFX")}`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  if (usdcOk && tfxOk) {
    console.log("✅  Liquidity added successfully!");
    console.log(`   +${USDC_AMOUNT} USDC  |  +${TFX_AMOUNT} TFX`);
    console.log("\n🎯  Vault is ready. Users can now:");
    console.log("    buyTFX()  — swap USDC → TFX");
    console.log("    sellTFX() — swap TFX  → USDC");
  } else {
    console.log("⚠️   Partial failure — check errors above");
  }
  console.log("═══════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Script failed:", err.message || err);
    process.exit(1);
  });
