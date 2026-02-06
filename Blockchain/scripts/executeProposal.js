import hre from "hardhat";

async function main() {
  const DAO_ADDRESS = "0x265f963980ae706714a14C034ceF20d278E1F476";
  const PROPOSAL_ID = 1;

  const dao = await hre.ethers.getContractAt("TrustForgeDAO", DAO_ADDRESS);

  console.log("Executing proposal:", PROPOSAL_ID);

  const tx = await dao.executeProposal(PROPOSAL_ID);
  await tx.wait();

  const proposal = await dao.getProposal(PROPOSAL_ID);
  const now = Math.floor(Date.now() / 1000);

if (now < proposal[3]) {
  console.log("⏳ Voting still active. Try again later.");
  return;
}
  console.log("Executed:", proposal[4]);
}

main().catch(console.error);
