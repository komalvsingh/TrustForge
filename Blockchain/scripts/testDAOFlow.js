import hre from "hardhat";

async function main() {
  const [user] = await hre.ethers.getSigners();

  console.log("User:", user.address);

  // =========================
  // Addresses
  // =========================
  const TFX_TOKEN = "0x3BfC9C9A6BA115223283ffA1a1CdE90a9D6e187b";
  const DAO_ADDRESS = "0x59A139652C16982cec62120854Ffa231f36B2AAD";

  // =========================
  // Contract Instances
  // =========================
  const tfx = await hre.ethers.getContractAt("TFXToken", TFX_TOKEN);
  const dao = await hre.ethers.getContractAt("TrustForgeDAO", DAO_ADDRESS);

  // =========================
  // Check TFX Balance
  // =========================
  const balance = await tfx.balanceOf(user.address);
  console.log("🪙 TFX Balance:", hre.ethers.formatEther(balance));

  if (balance < hre.ethers.parseEther("100")) {
    throw new Error("Not enough TFX to create a proposal (min 100 TFX)");
  }

  // =========================
  // Create Proposal ONLY
  // =========================
  console.log("📜 Creating proposal...");

  const tx = await dao.createProposal(
    "Reduce base interest rate from 10% to 8%"
  );

  console.log("⏳ Waiting for confirmation...");
  await tx.wait();

  const proposalId = await dao.proposalCount();

  console.log("✅ Proposal created successfully!");
  console.log("🆔 Proposal ID:", proposalId.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
