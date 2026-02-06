import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying DAO with account:", deployer.address);
  console.log(
    "Deployer balance:",
    hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "ETH"
  );

  // 🔗 Existing TFX Token address
  const TFX_TOKEN_ADDRESS = "0x3BfC9C9A6BA115223283ffA1a1CdE90a9D6e187b";

  // DAO contract
  const TrustForgeDAO = await hre.ethers.getContractFactory("TrustForgeDAO");
  const dao = await TrustForgeDAO.deploy(TFX_TOKEN_ADDRESS);

  await dao.waitForDeployment();

  console.log("✅ TrustForgeDAO deployed at:", await dao.getAddress());
  console.log("🔗 Governance token (TFX):", TFX_TOKEN_ADDRESS);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
