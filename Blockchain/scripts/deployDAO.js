const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying DAO with account:", deployer.address);
  console.log(
    "Deployer balance:",
    hre.ethers.formatEther(
      await deployer.provider.getBalance(deployer.address)
    ),
    "ETH"
  );

  // Existing addresses
  const TFX_TOKEN_ADDRESS = "0x4b821BBc5C7327A400486eFB61DA250979e32b3B";
  const TRUSTFORGE_ADDRESS = "0x2caB839bB17CeB77c09d0EdE66E5349Cd2130c18";

  // 1️⃣ Deploy DAO
  const TrustForgeDAO = await hre.ethers.getContractFactory("TrustForgeDAO");
  const dao = await TrustForgeDAO.deploy(TFX_TOKEN_ADDRESS);
  await dao.waitForDeployment();

  const daoAddress = await dao.getAddress();
  console.log("✅ TrustForgeDAO deployed at:", daoAddress);

  // 2️⃣ Get TrustForge contract instance
  const trustForge = await hre.ethers.getContractAt(
    "TrustForge",
    TRUSTFORGE_ADDRESS
  );

  // 3️⃣ Transfer ownership
  console.log("🔑 Transferring TrustForge ownership to DAO...");
  const tx = await trustForge.transferOwnership(daoAddress);
  await tx.wait();

  console.log("✅ Ownership transferred.");
  console.log("🔍 New TrustForge owner:", await trustForge.owner());

  console.log("🔗 Governance token (TFX):", TFX_TOKEN_ADDRESS);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
