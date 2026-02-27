const { ethers } = require("hardhat");

async function main() {
    const trustForgeAddress = "0x3013e7F2a98F60433BAe85c4E5569A980B0C7Cf7";
    const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

    const [signer] = await ethers.getSigners();

    const trustForge = await ethers.getContractAt("TrustForge", trustForgeAddress);
    const usdc = await ethers.getContractAt("IERC20", usdcAddress);

    console.log("Wallet:", signer.address);

    const loanAmount = ethers.parseUnits("0.1", 6);

    for (let i = 0; i < 15; i++) {
        console.log(`\nCycle ${i + 1}`);

        // Request small loan
        await (await trustForge.requestLoan(loanAmount, 86400)).wait();

        // Approve repayment (slightly higher to cover interest)
        await (await usdc.approve(trustForgeAddress, ethers.parseUnits("2", 6))).wait();

        // Repay
        await (await trustForge.repayLoan()).wait();

        const score = await trustForge.computeTrustScore(signer.address);
        console.log("Trust Score:", score.toString());
    }

    const finalScore = await trustForge.computeTrustScore(signer.address);
    console.log("\nFinal Trust Score:", finalScore.toString());
}

main().catch(console.error);