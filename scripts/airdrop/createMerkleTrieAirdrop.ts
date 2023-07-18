import { ethers } from "ethers";
import fs from "fs";
import { MerkleTree } from "merkletreejs";

import airdropData from "./airdropData.json";

/**
 * To run this script use the command: `npx hardhat run scripts/airdrop/createMerkleTrieAirdrop.ts`
 */

interface Account {
    address: string;
    value: number;
}

async function getMerkleTree(accounts: Account[]) {
    const leaves = await Promise.all(
        accounts.map(account =>
            ethers.utils.solidityKeccak256(
                ["address", "uint256"],
                [account.address, ethers.utils.parseEther(account.value.toString())],
            ),
        ),
    );
    return new MerkleTree(leaves, keccak256Custom, {
        hashLeaves: false,
        sortPairs: true,
    });
}

function keccak256Custom(bytes: Buffer) {
    const buffHash = ethers.utils.solidityKeccak256(["bytes"], ["0x" + bytes.toString("hex")]);
    return Buffer.from(buffHash.slice(2), "hex");
}

export async function main() {
    const merkleTrie = await getMerkleTree(airdropData);
    const root = merkleTrie.getHexRoot();

    console.log("Merkle Root: ", root);

    const proofs = await Promise.all(
        airdropData.map(async account => {
            const amount = ethers.utils.parseEther(account.value.toString());
            const proof = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [account.address, amount]),
            );
            console.log(proof);
            return {
                address: account.address,
                value: account.value,
                proof: proof,
            };
        }),
    );

    fs.writeFileSync("scripts/airdrop/airdropMerkleProofs.json", JSON.stringify(proofs, null, 2));
    console.log("Merkle Proofs written to scripts/airdrop/airdropMerkleProofs.json");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
