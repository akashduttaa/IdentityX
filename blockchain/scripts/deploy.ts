import { ethers } from "hardhat";

async function main() {
  console.log("Deploying IdentityChain contracts to Polygon Mumbai...");

  // Deploy DID Registry
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy();
  await didRegistry.deployed();
  console.log("DIDRegistry deployed to:", didRegistry.address);

  // Deploy Credential Registry
  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await CredentialRegistry.deploy();
  await credentialRegistry.deployed();
  console.log("CredentialRegistry deployed to:", credentialRegistry.address);

  // Deploy ZKP Verifier
  const ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
  const zkpVerifier = await ZKPVerifier.deploy();
  await zkpVerifier.deployed();
  console.log("ZKPVerifier deployed to:", zkpVerifier.address);

  console.log("\nDeployment complete!");
  console.log("=".repeat(50));
  console.log("DIDRegistry:", didRegistry.address);
  console.log("CredentialRegistry:", credentialRegistry.address);
  console.log("ZKPVerifier:", zkpVerifier.address);
  console.log("=".repeat(50));

  // Verify contracts on Polygonscan (if not on localhost)
  if (network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await didRegistry.deployTransaction.wait(6);
    await credentialRegistry.deployTransaction.wait(6);
    await zkpVerifier.deployTransaction.wait(6);

    console.log("Verifying contracts on Polygonscan...");

    try {
      await hre.run("verify:verify", {
        address: didRegistry.address,
        constructorArguments: [],
      });
    } catch (e) {
      console.log("DIDRegistry verification failed:", e);
    }

    try {
      await hre.run("verify:verify", {
        address: credentialRegistry.address,
        constructorArguments: [],
      });
    } catch (e) {
      console.log("CredentialRegistry verification failed:", e);
    }

    try {
      await hre.run("verify:verify", {
        address: zkpVerifier.address,
        constructorArguments: [],
      });
    } catch (e) {
      console.log("ZKPVerifier verification failed:", e);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
