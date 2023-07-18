import { BigNumberish } from "ethers";
import fs from "fs";
import hre from "hardhat";

import { SECTION_SEPARATOR, SUBSECTION_SEPARATOR } from "./test/utils";
import { ContractData } from "./write-json";

async function verifyArtifacts(contractName: string, contractAddress: string, constructorArgs: BigNumberish[]) {
    console.log(`${contractName}: ${contractAddress}`);
    console.log(SUBSECTION_SEPARATOR);

    const address = contractAddress;

    try {
        if (contractName === "CoreVoting") {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
                contract: `contracts/external/council/CoreVoting.sol:CoreVoting`,
            });
        }
        if (contractName === "ArcadeGSCCoreVoting") {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
                contract: `contracts/ArcadeGSCCoreVoting.sol:ArcadeGSCCoreVoting`,
            });
        }
        if (contractName === "ArcadeGSCVault") {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
                contract: `contracts/ArcadeGSCVault.sol:ArcadeGSCVault`,
            });
        } else {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
            });
        }
    } catch (err: any) {
        if (!err.message.match(/already verified/i)) {
            throw err;
        } else {
            console.log("\nContract already verified.");
        }
    }

    console.log(`${contractName}: ${address}`, "has been verified.");
    console.log(SECTION_SEPARATOR);
}

// get data from deployments json to run verify artifacts
export async function main(): Promise<void> {
    // retrieve command line args array
    const [, , file] = process.argv;

    // read deployment json to get contract addresses and constructor arguments
    const readData = fs.readFileSync(file, "utf-8");
    const jsonData = JSON.parse(readData);

    // loop through jsonData to run verifyArtifacts function
    for (const property in jsonData) {
        const dataFromJson = <ContractData>jsonData[property];

        await verifyArtifacts(property, dataFromJson.contractAddress, dataFromJson.constructorArgs);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
