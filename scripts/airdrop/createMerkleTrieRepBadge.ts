import { ethers } from "ethers";
import fs from "fs";
import { MerkleTree } from "merkletreejs";

import repBadgeData from "./repBadgeData.json";

/**
 * To run this script use the command: `npx hardhat run scripts/airdrop/createMerkleTrieRepBadge.ts`
 */

interface Account {
    address: string;
    tokenId: number;
    amount: number;
}

async function getMerkleTree(accounts: Account[]) {
    const leaves = await Promise.all(
        accounts.map(account =>
            ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [account.address, account.tokenId, account.amount],
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
    const merkleTrie = await getMerkleTree(repBadgeData);
    const root = merkleTrie.getHexRoot();

    console.log("Merkle Root: ", root);

    const proofs = await Promise.all(
        repBadgeData.map(async account => {
            const tokenId = ethers.utils.parseEther(account.tokenId.toString());
            const amount = ethers.utils.parseEther(account.amount.toString());

            const proof = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256", "uint256"], [account.address, account.tokenId, account.amount]),
            );
            console.log(proof);
            return {
                address: account.address,
                value: account.amount,
                tokenId: account.tokenId,
                proof: proof,
            };
        }),
    );

    fs.writeFileSync("scripts/airdrop/repBadgeMerkleProofs.json", JSON.stringify(proofs, null, 2));
    console.log("Merkle Proofs written to scripts/airdrop/repBadgeMerkleProofs.json");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
