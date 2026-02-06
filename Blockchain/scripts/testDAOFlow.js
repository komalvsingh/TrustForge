// scripts/createProposal.js
const hre = require("hardhat");

async function main() {
  const [proposer] = await hre.ethers.getSigners();

  // 🔹 ADD YOUR DEPLOYED ADDRESSES HERE
  const DAO_ADDRESS = "0x30094799c55bf1194D046DBe0D9CDef41a6eC076";
  const TRUSTFORGE_ADDRESS = "0x2caB839bB17CeB77c09d0EdE66E5349Cd2130c18";

  console.log("Proposer:", proposer.address);

  // Get DAO contract
  const DAO = await hre.ethers.getContractAt(
    "TrustForgeDAO",
    DAO_ADDRESS
  );

  // Get TrustForge interface to encode calldata
  const TrustForge = await hre.ethers.getContractAt(
    "TrustForge",
    TRUSTFORGE_ADDRESS
  );

  // 🔧 Encode function call (pause())
  const data = TrustForge.interface.encodeFunctionData("pause", []);

  console.log("Creating proposal...");

  const tx = await DAO.createProposal(
    TRUSTFORGE_ADDRESS, // target
    0,                  // ETH value
    data,               // encoded calldata
    "Pause protocol due to emergency" // description
  );

  await tx.wait();

  const proposalId = await DAO.proposalCount();

  console.log("✅ Proposal created successfully!");
  console.log("Proposal ID:", proposalId.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });