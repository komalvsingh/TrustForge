const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  // Put your already-deployed addresses here
  const TRUSTFORGE_ADDRESS = "0x2caB839bB17CeB77c09d0EdE66E5349Cd2130c18"; // add to .env
  const DAO_ADDRESS = "0x30094799c55bf1194D046DBe0D9CDef41a6eC076";

  console.log("Transferring TrustForge ownership to DAO...");
  console.log("TrustForge:", TRUSTFORGE_ADDRESS);
  console.log("DAO:", DAO_ADDRESS);
  console.log("Caller:", deployer.address);

  const TrustForge = await ethers.getContractFactory("TrustForge");
  const trustForge = TrustForge.attach(TRUSTFORGE_ADDRESS);

  // Verify current owner is the deployer
  const currentOwner = await trustForge.owner();
  console.log("\nCurrent owner:", currentOwner);

  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error("You are not the current owner. Cannot transfer.");
  }

  // Transfer ownership
  const tx = await trustForge.transferOwnership(DAO_ADDRESS);
  console.log("\nTx sent:", tx.hash);
  await tx.wait();

  // Verify
  const newOwner = await trustForge.owner();
  console.log("New owner:", newOwner);

  if (newOwner.toLowerCase() === DAO_ADDRESS.toLowerCase()) {
    console.log("\n✅ Ownership successfully transferred to DAO!");
    console.log("The DAO can now execute proposals to change TrustForge settings.");
  } else {
    console.log("\n❌ Something went wrong. Owner did not change.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });