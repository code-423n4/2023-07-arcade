import { Contract } from "ethers";
import fs from "fs";
import { ethers } from "hardhat";

import {
    ADD_APPROVAL,
    ADD_APPROVAL_QUORUM,
    ADD_CALL,
    ADD_CALL_QUORUM,
    CALL_WHITELIST_ADDR,
    CALL_WHITELIST_APPROVALS_ADDR,
    LARGE_SPEND,
    LARGE_SPEND_QUORUM,
    LOAN_CORE_ADDR,
    MEDIUM_SPEND,
    MEDIUM_SPEND_QUORUM,
    MINT_TOKENS,
    MINT_TOKENS_QUORUM,
    ORIGINATION_CONTROLLER_ADDR,
    PAUSE,
    PAUSE_QUORUM,
    SET_ALLOWED_PAYABLE_CURRENCIES,
    SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    SET_ALLOWED_VERIFIER,
    SET_ALLOWED_VERIFIER_BATCH,
    SET_ALLOWED_VERIFIER_BATCH_QUORUM,
    SET_ALLOWED_VERIFIER_QUORUM,
    SET_FEE_CONTROLLER,
    SET_FEE_CONTROLLER_QUORUM,
    SET_MINTER,
    SET_MINTER_QUORUM,
    UNPAUSE,
    UNPAUSE_QUORUM,
} from "./custom-quorum-params";
import {
    ADMIN_ADDRESS,
    AIRDROP_MERKLE_ROOT,
    DISTRIBUTION_MULTISIG,
    GSC_MIN_LOCK_DURATION,
    REPUTATION_BADGE_ADMIN,
    REPUTATION_BADGE_MANAGER,
    REPUTATION_BADGE_RESOURCE_MANAGER,
} from "./deployment-params";
import { SECTION_SEPARATOR } from "./test/utils";

const jsonContracts: { [key: string]: string } = {
    ArcadeTokenDistributor: "arcadeTokenDistributor",
    ArcadeToken: "arcadeToken",
    CoreVoting: "coreVoting",
    ArcadeGSCCoreVoting: "arcadeGSCCoreVoting",
    Timelock: "timelock",
    ARCDVestingVault: "teamVestingVault",
    ImmutableVestingVault: "partnerVestingVault",
    NFTBoostVault: "nftBoostVault",
    ArcadeGSCVault: "arcadeGSCVault",
    ArcadeTreasury: "arcadeTreasury",
    ArcadeAirdrop: "arcadeAirdrop",
    ReputationBadge: "reputationBadge",
};

type ContractArgs = {
    arcadeTokenDistributor: Contract;
    arcadeToken: Contract;
    coreVoting: Contract;
    arcadeGSCCoreVoting: Contract;
    timelock: Contract;
    teamVestingVault: Contract;
    partnerVestingVault: Contract;
    nftBoostVault: Contract;
    arcadeGSCVault: Contract;
    arcadeTreasury: Contract;
    arcadeAirdrop: Contract;
    reputationBadge: Contract;
};

export async function main(
    arcadeTokenDistributor: Contract,
    arcadeToken: Contract,
    coreVoting: Contract,
    arcadeGSCCoreVoting: Contract,
    timelock: Contract,
    teamVestingVault: Contract,
    partnerVestingVault: Contract,
    nftBoostVault: Contract,
    arcadeGSCVault: Contract,
    arcadeTreasury: Contract,
    arcadeAirdrop: Contract,
    reputationBadge: Contract,
): Promise<void> {
    console.log(SECTION_SEPARATOR);
    console.log("Setup contract state variables and relinquish control...");

    // set airdrop merkle root
    console.log("Setting airdrop merkle root...");
    const tx1 = await arcadeAirdrop.setMerkleRoot(AIRDROP_MERKLE_ROOT);
    await tx1.wait();

    console.log("Setting airdrop contract in nftBoostVault...");
    const tx2 = await nftBoostVault.setAirdropContract(arcadeAirdrop.address);
    await tx2.wait();

    // deployer sets token in distributor
    console.log("Setting token in ArcadeTokenDistributor...");
    const tx3 = await arcadeTokenDistributor.setToken(arcadeToken.address);
    await tx3.wait();

    // transfer ownership of arcadeTokenDistributor to multisig
    console.log("Transferring ownership of ArcadeTokenDistributor to multisig...");
    const tx4 = await arcadeTokenDistributor.transferOwnership(DISTRIBUTION_MULTISIG);
    await tx4.wait();

    // change ArcadeToken minter from deployer to CoreVoting
    console.log("Changing ArcadeToken minter from deployer to CoreVoting...");
    const tx5 = await arcadeToken.setMinter(coreVoting.address);
    await tx5.wait();

    // set vaults in core voting
    console.log("Setting up CoreVoting voting vaults...");
    const tx6 = await coreVoting.changeVaultStatus(teamVestingVault.address, true);
    await tx6.wait();
    const tx7 = await coreVoting.changeVaultStatus(partnerVestingVault.address, true);
    await tx7.wait();
    const tx8 = await coreVoting.changeVaultStatus(nftBoostVault.address, true);
    await tx8.wait();

    // set vaults in arcadeGSCCoreVoting
    console.log("Setting up ArcadeGSCCoreVoting voting vaults...");
    const tx9 = await arcadeGSCCoreVoting.changeVaultStatus(arcadeGSCVault.address, true);
    await tx9.wait();

    // change min lock time for GSC proposals from 3 days to 8 hours
    console.log("Changing min lock time for GSC proposals from 3 days to 8 hours...");
    const tx10 = await arcadeGSCCoreVoting.setLockDuration(GSC_MIN_LOCK_DURATION);
    await tx10.wait();

    // before transferring over ownership, set the custom quorum thresholds
    console.log("Setting custom quorum thresholds in CoreVoting...");
    const tx11 = await coreVoting.setCustomQuorum(
        arcadeToken.address,
        MINT_TOKENS,
        ethers.utils.parseEther(MINT_TOKENS_QUORUM),
    );
    await tx11.wait();
    const tx12 = await coreVoting.setCustomQuorum(
        arcadeToken.address,
        SET_MINTER,
        ethers.utils.parseEther(SET_MINTER_QUORUM),
    );
    await tx12.wait();
    const tx13 = await coreVoting.setCustomQuorum(
        arcadeTreasury.address,
        MEDIUM_SPEND,
        ethers.utils.parseEther(MEDIUM_SPEND_QUORUM),
    );
    await tx13.wait();
    const tx14 = await coreVoting.setCustomQuorum(
        arcadeTreasury.address,
        LARGE_SPEND,
        ethers.utils.parseEther(LARGE_SPEND_QUORUM),
    );
    await tx14.wait();
    const tx15 = await coreVoting.setCustomQuorum(
        CALL_WHITELIST_ADDR,
        ADD_CALL,
        ethers.utils.parseEther(ADD_CALL_QUORUM),
    );
    await tx15.wait();
    const tx16 = await coreVoting.setCustomQuorum(
        CALL_WHITELIST_APPROVALS_ADDR,
        ADD_APPROVAL,
        ethers.utils.parseEther(ADD_APPROVAL_QUORUM),
    );
    await tx16.wait();
    const tx17 = await coreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_VERIFIER,
        ethers.utils.parseEther(SET_ALLOWED_VERIFIER_QUORUM),
    );
    await tx17.wait();
    const tx18 = await coreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_VERIFIER_BATCH,
        ethers.utils.parseEther(SET_ALLOWED_VERIFIER_BATCH_QUORUM),
    );
    await tx18.wait();
    const tx19 = await coreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_PAYABLE_CURRENCIES,
        ethers.utils.parseEther(SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM),
    );
    await tx19.wait();

    const tx20 = await coreVoting.setCustomQuorum(LOAN_CORE_ADDR, PAUSE, ethers.utils.parseEther(PAUSE_QUORUM));
    await tx20.wait();
    const tx21 = await coreVoting.setCustomQuorum(LOAN_CORE_ADDR, UNPAUSE, ethers.utils.parseEther(UNPAUSE_QUORUM));
    await tx21.wait();
    const tx22 = await coreVoting.setCustomQuorum(
        LOAN_CORE_ADDR,
        SET_FEE_CONTROLLER,
        ethers.utils.parseEther(SET_FEE_CONTROLLER_QUORUM),
    );
    await tx22.wait();

    // authorize gsc vault and change owner to be the coreVoting contract
    console.log("Setup CoreVoting permissions...");
    const tx23 = await coreVoting.deauthorize(ADMIN_ADDRESS);
    await tx23.wait();
    const tx24 = await coreVoting.authorize(arcadeGSCCoreVoting.address);
    await tx24.wait();
    const tx25 = await coreVoting.setOwner(timelock.address);
    await tx25.wait();

    // authorize arcadeGSCCoreVoting and change owner to be the coreVoting contract
    console.log("Setup Timelock permissions...");
    const tx26 = await timelock.deauthorize(ADMIN_ADDRESS);
    await tx26.wait();
    const tx27 = await timelock.authorize(arcadeGSCCoreVoting.address);
    await tx27.wait();
    const tx28 = await timelock.setOwner(coreVoting.address);
    await tx28.wait();

    // set owner in arcadeGSCCoreVoting
    console.log("Setup ArcadeGSCCoreVoting permissions...");
    const tx29 = await arcadeGSCCoreVoting.setOwner(timelock.address);
    await tx29.wait();

    // ArcadeTreasury permissions
    console.log("Setup ArcadeTreasury permissions...");
    const tx30 = await arcadeTreasury.grantRole(
        await arcadeTreasury.GSC_CORE_VOTING_ROLE(),
        arcadeGSCCoreVoting.address,
    );
    await tx30.wait();
    const tx31 = await arcadeTreasury.grantRole(await arcadeTreasury.CORE_VOTING_ROLE(), coreVoting.address);
    await tx31.wait();
    const tx32 = await arcadeTreasury.grantRole(await arcadeTreasury.ADMIN_ROLE(), timelock.address);
    await tx32.wait();
    const tx33 = await arcadeTreasury.renounceRole(await arcadeTreasury.ADMIN_ROLE(), ADMIN_ADDRESS);
    await tx33.wait();

    // ReputationBadge permissions
    console.log("Setup ReputationBadge permissions...");
    const tx34 = await reputationBadge.grantRole(await reputationBadge.BADGE_MANAGER_ROLE(), REPUTATION_BADGE_MANAGER);
    await tx34.wait();
    const tx35 = await reputationBadge.grantRole(
        await reputationBadge.RESOURCE_MANAGER_ROLE(),
        REPUTATION_BADGE_RESOURCE_MANAGER,
    );
    await tx35.wait();
    const tx36 = await reputationBadge.grantRole(await reputationBadge.ADMIN_ROLE(), REPUTATION_BADGE_ADMIN);
    await tx36.wait();
    const tx37 = await reputationBadge.renounceRole(await reputationBadge.ADMIN_ROLE(), ADMIN_ADDRESS);
    await tx37.wait();
}

async function attachAddresses(jsonFile: string): Promise<ContractArgs> {
    const readData = fs.readFileSync(jsonFile, "utf-8");
    const jsonData = JSON.parse(readData);
    const contracts: { [key: string]: Contract } = {};

    for await (const key of Object.keys(jsonData)) {
        if (!(key in jsonContracts)) continue;

        const argKey = jsonContracts[key];
        // console.log(`Key: ${key}, address: ${jsonData[key]["contractAddress"]}`);

        const contract: Contract = await ethers.getContractAt(key, jsonData[key]["contractAddress"]);

        contracts[argKey] = contract;
    }

    return contracts as ContractArgs;
}

if (require.main === module) {
    // retrieve command line args array
    const [, , file] = process.argv;

    console.log("File:", file);

    // assemble args to access the relevant deployment json in .deployment
    void attachAddresses(file).then((res: ContractArgs) => {
        const {
            arcadeTokenDistributor,
            arcadeToken,
            coreVoting,
            arcadeGSCCoreVoting,
            timelock,
            teamVestingVault,
            partnerVestingVault,
            nftBoostVault,
            arcadeGSCVault,
            arcadeTreasury,
            arcadeAirdrop,
            reputationBadge,
        } = res;

        main(
            arcadeTokenDistributor,
            arcadeToken,
            coreVoting,
            arcadeGSCCoreVoting,
            timelock,
            teamVestingVault,
            partnerVestingVault,
            nftBoostVault,
            arcadeGSCVault,
            arcadeTreasury,
            arcadeAirdrop,
            reputationBadge,
        )
            .then(() => process.exit(0))
            .catch((error: Error) => {
                console.error(error);
                process.exit(1);
            });
    });
}
