// scripts/burnTFX.js
import hre from "hardhat";

async function main() {
  const [signer] = await hre.ethers.getSigners();

  // 🔥 Your deployed TFX token address
  const TFX_ADDRESS = "0x4b821BBc5C7327A400486eFB61DA250979e32b3B";

  // 🔥 Amount to burn (example: 50 TFX)
  const AMOUNT_TO_BURN = "5000";

  console.log("Burner address:", signer.address);

  const TFX = await hre.ethers.getContractAt(
    "TFXToken",
    TFX_ADDRESS
  );

  const balanceBefore = await TFX.balanceOf(signer.address);
  console.log(
    "Balance before:",
    hre.ethers.formatEther(balanceBefore),
    "TFX"
  );

  const tx = await TFX.burn(
    hre.ethers.parseEther(AMOUNT_TO_BURN)
  );
  await tx.wait();

  console.log("🔥 Burn successful!");

  const balanceAfter = await TFX.balanceOf(signer.address);
  console.log(
    "Balance after:",
    hre.ethers.formatEther(balanceAfter),
    "TFX"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Burn failed:", error);
    process.exit(1);
  });
