import assert from "assert";
import { expect } from "chai";
import { execSync } from "child_process";
import { ethers } from "hardhat";

import {
    ARCDVestingVault,
    ArcadeAirdrop,
    ArcadeGSCCoreVoting,
    ArcadeGSCVault,
    ArcadeToken,
    ArcadeTokenDistributor,
    ArcadeTreasury,
    CoreVoting,
    ImmutableVestingVault,
    NFTBoostVault,
    ReputationBadge,
    Timelock,
} from "../../../typechain";
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
} from "../custom-quorum-params";
import {
    ADMIN_ADDRESS,
    AIRDROP_MERKLE_ROOT,
    GSC_MIN_LOCK_DURATION,
    REPUTATION_BADGE_ADMIN,
    REPUTATION_BADGE_MANAGER,
    REPUTATION_BADGE_RESOURCE_MANAGER,
} from "../deployment-params";
import { NETWORK, getLatestDeployment, getLatestDeploymentFile, getVerifiedABI } from "./utils";

/**
 * Note: Against normal conventions, these tests are interdependent and meant
 * to run sequentially. Each subsequent test relies on the state of the previous.
 *
 * To run these this script use:
 * `yarn clean && yarn compile && npx hardhat test scripts/deploy/test/e2e.ts --network <networkName>`
 */
assert(NETWORK !== "hardhat", "Must use a long-lived network!");

describe("Deployment", function () {
    this.timeout(0);
    this.bail();

    it("deploys contracts and creates deployment artifacts", async () => {
        if (process.env.EXEC) {
            // Deploy everything, via command-line
            console.log(); // whitespace
            execSync(`npx hardhat --network ${NETWORK} run scripts/deploy/deploy.ts`, { stdio: "inherit" });
        }

        // Make sure JSON file exists
        const deployment = getLatestDeployment();

        // Make sure deployment artifacts has all the correct contracts specified
        expect(deployment["ArcadeTokenDistributor"]).to.exist;
        expect(deployment["ArcadeTokenDistributor"].contractAddress).to.exist;
        expect(deployment["ArcadeTokenDistributor"].constructorArgs.length).to.eq(0);

        expect(deployment["ArcadeToken"]).to.exist;
        expect(deployment["ArcadeToken"].contractAddress).to.exist;
        expect(deployment["ArcadeToken"].constructorArgs.length).to.eq(2);

        expect(deployment["CoreVoting"]).to.exist;
        expect(deployment["CoreVoting"].contractAddress).to.exist;
        expect(deployment["CoreVoting"].constructorArgs.length).to.eq(5);

        expect(deployment["ArcadeGSCCoreVoting"]).to.exist;
        expect(deployment["ArcadeGSCCoreVoting"].contractAddress).to.exist;
        expect(deployment["ArcadeGSCCoreVoting"].constructorArgs.length).to.eq(5);

        expect(deployment["Timelock"]).to.exist;
        expect(deployment["Timelock"].contractAddress).to.exist;
        expect(deployment["Timelock"].constructorArgs.length).to.eq(3);

        expect(deployment["ARCDVestingVault"]).to.exist;
        expect(deployment["ARCDVestingVault"].contractAddress).to.exist;
        expect(deployment["ARCDVestingVault"].constructorArgs.length).to.eq(4);

        expect(deployment["ImmutableVestingVault"]).to.exist;
        expect(deployment["ImmutableVestingVault"].contractAddress).to.exist;
        expect(deployment["ImmutableVestingVault"].constructorArgs.length).to.eq(4);

        expect(deployment["NFTBoostVault"]).to.exist;
        expect(deployment["NFTBoostVault"].contractAddress).to.exist;
        expect(deployment["NFTBoostVault"].constructorArgs.length).to.eq(4);

        expect(deployment["ArcadeGSCVault"]).to.exist;
        expect(deployment["ArcadeGSCVault"].contractAddress).to.exist;
        expect(deployment["ArcadeGSCVault"].constructorArgs.length).to.eq(3);

        expect(deployment["ArcadeTreasury"]).to.exist;
        expect(deployment["ArcadeTreasury"].contractAddress).to.exist;
        expect(deployment["ArcadeTreasury"].constructorArgs.length).to.eq(1);

        expect(deployment["ArcadeAirdrop"]).to.exist;
        expect(deployment["ArcadeAirdrop"].contractAddress).to.exist;
        expect(deployment["ArcadeAirdrop"].constructorArgs.length).to.eq(5);

        expect(deployment["BadgeDescriptor"]).to.exist;
        expect(deployment["BadgeDescriptor"].contractAddress).to.exist;
        expect(deployment["BadgeDescriptor"].constructorArgs.length).to.eq(1);

        expect(deployment["ReputationBadge"]).to.exist;
        expect(deployment["ReputationBadge"].contractAddress).to.exist;
        expect(deployment["ReputationBadge"].constructorArgs.length).to.eq(2);
    });

    it("correctly sets up all roles and permissions", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (!ADMIN_ADDRESS) {
            throw new Error("did not get admin address!");
        } else {
            console.log("Admin:", ADMIN_ADDRESS);
        }

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/setup.ts ${filename}`, { stdio: "inherit" });
        }

        /**
         * Verify all the governance setup transactions were executed properly
         */
        console.log("Verifying governance setup...")
        
        const arcadeTokenDistributor = <ArcadeTokenDistributor>(
            await ethers.getContractAt("ArcadeTokenDistributor", deployment["ArcadeTokenDistributor"].contractAddress)
        );
        const arcadeToken = <ArcadeToken>(
            await ethers.getContractAt("ArcadeToken", deployment["ArcadeToken"].contractAddress)
        );
        const coreVoting = <CoreVoting>(
            await ethers.getContractAt("CoreVoting", deployment["CoreVoting"].contractAddress)
        );
        const arcadeGSCCoreVoting = <ArcadeGSCCoreVoting>(
            await ethers.getContractAt("ArcadeGSCCoreVoting", deployment["ArcadeGSCCoreVoting"].contractAddress)
        );
        const timelock = <Timelock>await ethers.getContractAt("Timelock", deployment["Timelock"].contractAddress);
        const teamVestingVault = <ARCDVestingVault>(
            await ethers.getContractAt("ARCDVestingVault", deployment["ARCDVestingVault"].contractAddress)
        );
        const partnerVestingVault = <ImmutableVestingVault>(
            await ethers.getContractAt("ImmutableVestingVault", deployment["ImmutableVestingVault"].contractAddress)
        );
        const nftBoostVault = <NFTBoostVault>(
            await ethers.getContractAt("NFTBoostVault", deployment["NFTBoostVault"].contractAddress)
        );
        const arcadeGSCVault = <ArcadeGSCVault>(
            await ethers.getContractAt("ArcadeGSCVault", deployment["ArcadeGSCVault"].contractAddress)
        );
        const arcadeTreasury = <ArcadeTreasury>(
            await ethers.getContractAt("ArcadeTreasury", deployment["ArcadeTreasury"].contractAddress)
        );
        const arcadeAirdrop = <ArcadeAirdrop>(
            await ethers.getContractAt("ArcadeAirdrop", deployment["ArcadeAirdrop"].contractAddress)
        );
        const reputationBadge = <ReputationBadge>(
            await ethers.getContractAt("ReputationBadge", deployment["ReputationBadge"].contractAddress)
        );

        // check ArcadeAirdrop merkle root
        expect(await arcadeAirdrop.rewardsRoot()).to.equal(AIRDROP_MERKLE_ROOT);

        // make sure the nftBoostVault has the correct airdrop contract set
        expect(await nftBoostVault.getAirdropContract()).to.equal(deployment["ArcadeAirdrop"].contractAddress);

        // Make sure ArcadeTokenDistributor has the correct token for distribution set
        expect(await arcadeTokenDistributor.arcadeToken()).to.equal(deployment["ArcadeToken"].contractAddress);

        // ArcadeToken has the correct minter address
        expect(await arcadeToken.minter()).to.equal(deployment["CoreVoting"].contractAddress);

        // check the arcade token distributed the initial supply to the distributor
        expect(await arcadeToken.balanceOf(arcadeTokenDistributor.address)).to.equal(
            ethers.utils.parseEther("100000000"),
        );

        // verify correct voting vaults for CoreVoting
        expect(await coreVoting.approvedVaults(teamVestingVault.address)).to.equal(true);
        expect(await coreVoting.approvedVaults(partnerVestingVault.address)).to.equal(true);
        expect(await coreVoting.approvedVaults(nftBoostVault.address)).to.equal(true);

        // verify correct voting vaults for ArcadeGSCCoreVoting
        expect(await arcadeGSCCoreVoting.approvedVaults(arcadeGSCVault.address)).to.equal(true);

        // verify GSCCoreVoting has the correct minimum lock duration
        expect(await arcadeGSCCoreVoting.lockDuration()).to.equal(GSC_MIN_LOCK_DURATION);

        // check custom quorums in CoreVoting
        expect(await coreVoting.quorums(deployment["ArcadeToken"].contractAddress, MINT_TOKENS)).to.equal(
            ethers.utils.parseEther(MINT_TOKENS_QUORUM),
        );
        expect(await coreVoting.quorums(deployment["ArcadeToken"].contractAddress, SET_MINTER)).to.equal(
            ethers.utils.parseEther(SET_MINTER_QUORUM),
        );
        expect(await coreVoting.quorums(deployment["ArcadeTreasury"].contractAddress, MEDIUM_SPEND)).to.equal(
            ethers.utils.parseEther(MEDIUM_SPEND_QUORUM),
        );
        expect(await coreVoting.quorums(deployment["ArcadeTreasury"].contractAddress, LARGE_SPEND)).to.equal(
            ethers.utils.parseEther(LARGE_SPEND_QUORUM),
        );
        expect(await coreVoting.quorums(CALL_WHITELIST_ADDR, ADD_CALL)).to.equal(ethers.utils.parseEther(ADD_CALL_QUORUM));
        expect(await coreVoting.quorums(CALL_WHITELIST_APPROVALS_ADDR, ADD_APPROVAL)).to.equal(ethers.utils.parseEther(ADD_APPROVAL_QUORUM));
        expect(await coreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_VERIFIER)).to.equal(
            ethers.utils.parseEther(SET_ALLOWED_VERIFIER_QUORUM),
        );
        expect(await coreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_VERIFIER_BATCH)).to.equal(
            ethers.utils.parseEther(SET_ALLOWED_VERIFIER_BATCH_QUORUM),
        );
        expect(await coreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_PAYABLE_CURRENCIES)).to.equal(
            ethers.utils.parseEther(SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM),
        );
        expect(await coreVoting.quorums(LOAN_CORE_ADDR, PAUSE)).to.equal(ethers.utils.parseEther(PAUSE_QUORUM));
        expect(await coreVoting.quorums(LOAN_CORE_ADDR, SET_FEE_CONTROLLER)).to.equal(ethers.utils.parseEther(SET_FEE_CONTROLLER_QUORUM));

        // check authorized addresses in CoreVoting
        expect(await coreVoting.authorized(ADMIN_ADDRESS)).to.equal(false);
        expect(await coreVoting.authorized(deployment["ArcadeGSCCoreVoting"].contractAddress)).to.equal(true);

        // check CoreVoting owner
        expect(await coreVoting.owner()).to.equal(timelock.address);

        // Make sure Timelock has the correct owner
        expect(await timelock.owner()).to.equal(coreVoting.address);

        // check authorized addresses in Timelock
        expect(await timelock.authorized(ADMIN_ADDRESS)).to.equal(false);
        expect(await timelock.authorized(arcadeGSCCoreVoting.address)).to.equal(true);

        // check ArcadeGSCCoreVoting owner
        expect(await arcadeGSCCoreVoting.owner()).to.equal(timelock.address);

        // check ArcadeTreasury GSC_CORE_VOTING_ROLE
        expect(
            await arcadeTreasury.hasRole(await arcadeTreasury.GSC_CORE_VOTING_ROLE(), arcadeGSCCoreVoting.address),
        ).to.equal(true);

        // check ArcadeTreasury CORE_VOTING_ROLE
        expect(await arcadeTreasury.hasRole(await arcadeTreasury.CORE_VOTING_ROLE(), coreVoting.address)).to.equal(
            true,
        );

        // check ArcadeTreasury ADMIN_ROLE
        expect(await arcadeTreasury.hasRole(await arcadeTreasury.ADMIN_ROLE(), timelock.address)).to.equal(true);

        // check ArcadeTreasury ADMIN_ROLE was renounced by deployer
        expect(await arcadeTreasury.hasRole(await arcadeTreasury.ADMIN_ROLE(), ADMIN_ADDRESS)).to.equal(false);

        // check the ReputationBadge has the correct BADGE_MANAGER_ROLE
        expect(
            await reputationBadge.hasRole(await reputationBadge.BADGE_MANAGER_ROLE(), REPUTATION_BADGE_MANAGER),
        ).to.equal(true);

        // check the ReputationBadge has the correct RESOURCE_MANAGER_ROLE
        expect(
            await reputationBadge.hasRole(
                await reputationBadge.RESOURCE_MANAGER_ROLE(),
                REPUTATION_BADGE_RESOURCE_MANAGER,
            ),
        ).to.equal(true);

        // check the ReputationBadge has the correct ADMIN_ROLE
        expect(await reputationBadge.hasRole(await reputationBadge.ADMIN_ROLE(), REPUTATION_BADGE_ADMIN)).to.equal(
            true,
        );

        // check the ReputationBadge ADMIN_ROLE was renounced by deployer
        expect(await reputationBadge.hasRole(await reputationBadge.ADMIN_ROLE(), ADMIN_ADDRESS)).to.equal(false);
    });

    it("verifies all contracts on the proper network", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/verify-contracts.ts ${filename}`, {
                stdio: "inherit",
            });
        }

        // For each contract - compare verified ABI against artifact ABI
        for (let contractName of Object.keys(deployment)) {
            const contractData = deployment[contractName];

            if (contractName.includes("ArcadeGSCCoreVoting")) contractName = "CoreVoting";
            if (contractName.includes("ArcadeGSCVault")) contractName = "GSCVault";

            const artifact = await artifacts.readArtifact(contractName);

            const verifiedAbi = await getVerifiedABI(contractData.contractAddress);
            expect(artifact.abi).to.deep.equal(verifiedAbi);
        }
    });
});
