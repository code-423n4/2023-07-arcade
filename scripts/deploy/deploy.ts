import { ethers } from "hardhat";

import {
    ARCDVestingVault,
    ArcadeAirdrop,
    ArcadeGSCVault,
    ArcadeToken,
    ArcadeTokenDistributor,
    BadgeDescriptor,
    CoreVoting,
    ImmutableVestingVault,
    NFTBoostVault,
    ReputationBadge,
    Timelock,
    Treasury,
} from "../../typechain";
import {
    ADMIN_ADDRESS,
    AIRDROP_EXPIRATION,
    BADGE_DESCRIPTOR_BASE_URI,
    BASE_QUORUM,
    BASE_QUORUM_GSC,
    GSC_THRESHOLD,
    MIN_PROPOSAL_POWER_CORE_VOTING,
    MIN_PROPOSAL_POWER_GSC,
    NFT_BOOST_VAULT_MANAGER,
    STALE_BLOCK_LAG,
    TEAM_VESTING_VAULT_MANAGER,
    TIMELOCK_WAIT_TIME,
} from "./deployment-params";
import { SECTION_SEPARATOR, SUBSECTION_SEPARATOR } from "./test/utils";
import { writeJson } from "./write-json";

export interface DeployedResources {
    arcadeTokenDistributor: ArcadeTokenDistributor;
    arcadeToken: ArcadeToken;
    coreVoting: CoreVoting;
    arcadeGSCCoreVoting: CoreVoting;
    timelock: Timelock;
    teamVestingVault: ARCDVestingVault;
    partnerVestingVault: ImmutableVestingVault;
    NFTBoostVault: NFTBoostVault;
    arcadeGSCVault: ArcadeGSCVault;
    arcadeTreasury: Treasury;
    arcadeAirdrop: ArcadeAirdrop;
    badgeDescriptor: BadgeDescriptor;
    reputationBadge: ReputationBadge;
}

export async function main(): Promise<DeployedResources> {
    // Hardhat always runs the compile task when running scripts through it.
    // If this runs in a standalone fashion you may want to call compile manually
    // to make sure everything is compiled
    // await run("compile");

    // ================= TOKEN + AIRDROP =================

    console.log(SECTION_SEPARATOR);
    console.log("Deploying ARCD token and Distributor contracts...");

    // token distributor
    const ArcadeTokenDistributorFactory = await ethers.getContractFactory("ArcadeTokenDistributor");
    const arcadeTokenDistributor = <ArcadeTokenDistributor>await ArcadeTokenDistributorFactory.deploy();
    await arcadeTokenDistributor.deployed();
    const arcadeTokenDistributorAddress = arcadeTokenDistributor.address;
    console.log("ArcadeTokenDistributor deployed to:", arcadeTokenDistributorAddress);
    console.log(SUBSECTION_SEPARATOR);

    // token
    const ArcadeTokenFactory = await ethers.getContractFactory("ArcadeToken");
    const arcadeToken = <ArcadeToken>await ArcadeTokenFactory.deploy(ADMIN_ADDRESS, arcadeTokenDistributor.address);
    await arcadeToken.deployed();
    const arcadeTokenAddress = arcadeToken.address;
    console.log("ArcadeToken deployed to:", arcadeTokenAddress);
    console.log(SUBSECTION_SEPARATOR);

    // ================= GOVERNANCE =================

    console.log(SECTION_SEPARATOR);
    console.log("Deploying governance...");

    // // ======= CORE VOTING =======

    // core voting
    const CoreVotingFactory = await ethers.getContractFactory("CoreVoting");
    const coreVoting = await CoreVotingFactory.deploy(
        ADMIN_ADDRESS,
        ethers.utils.parseEther(BASE_QUORUM),
        ethers.utils.parseEther(MIN_PROPOSAL_POWER_CORE_VOTING),
        ethers.constants.AddressZero,
        [],
    );
    await coreVoting.deployed();
    const coreVotingAddress = coreVoting.address;
    console.log("CoreVoting deployed to:", coreVotingAddress);
    console.log(SUBSECTION_SEPARATOR);

    // GSC cote voting
    const ArcadeGSCCoreVotingFactory = await ethers.getContractFactory("ArcadeGSCCoreVoting");
    const arcadeGSCCoreVoting = await ArcadeGSCCoreVotingFactory.deploy(
        ADMIN_ADDRESS,
        BASE_QUORUM_GSC,
        MIN_PROPOSAL_POWER_GSC,
        ethers.constants.AddressZero,
        [],
    );
    await arcadeGSCCoreVoting.deployed();
    const arcadeGSCCoreVotingAddress = arcadeGSCCoreVoting.address;
    console.log("ArcadeGSCCoreVoting deployed to:", arcadeGSCCoreVotingAddress);
    console.log(SUBSECTION_SEPARATOR);

    // timelock
    const TimelockFactory = await ethers.getContractFactory("Timelock");
    const timelock = await TimelockFactory.deploy(TIMELOCK_WAIT_TIME, ADMIN_ADDRESS, ADMIN_ADDRESS);
    await timelock.deployed();
    const timelockAddress = timelock.address;
    console.log("Timelock deployed to:", timelockAddress);
    console.log(SUBSECTION_SEPARATOR);

    // // ======= VAULTS =======

    // team vesting vault (ARCDVestingVault)
    const TeamVestingVaultFactory = await ethers.getContractFactory("ARCDVestingVault");
    const teamVestingVault = await TeamVestingVaultFactory.deploy(
        arcadeToken.address,
        STALE_BLOCK_LAG,
        TEAM_VESTING_VAULT_MANAGER,
        timelock.address,
    );
    await teamVestingVault.deployed();
    const teamVestingVaultAddress = teamVestingVault.address;
    console.log("ARCDVestingVault deployed to:", teamVestingVaultAddress);
    console.log(SUBSECTION_SEPARATOR);

    // partner vesting vault (ImmutableVestingVault)
    const PartnerVestingVaultFactory = await ethers.getContractFactory("ImmutableVestingVault");
    const partnerVestingVault = await PartnerVestingVaultFactory.deploy(
        arcadeToken.address,
        STALE_BLOCK_LAG,
        TEAM_VESTING_VAULT_MANAGER,
        timelock.address,
    );
    await partnerVestingVault.deployed();
    const partnerVestingVaultAddress = partnerVestingVault.address;
    console.log("ImmutableVestingVault deployed to:", partnerVestingVaultAddress);
    console.log(SUBSECTION_SEPARATOR);

    // NFTBoostVault
    const NFTBoostVaultFactory = await ethers.getContractFactory("NFTBoostVault");
    const NFTBoostVault = await NFTBoostVaultFactory.deploy(
        arcadeToken.address,
        STALE_BLOCK_LAG,
        timelock.address,
        NFT_BOOST_VAULT_MANAGER,
    );
    await NFTBoostVault.deployed();
    const NFTBoostVaultAddress = NFTBoostVault.address;
    console.log("NFTBoostVault deployed to:", NFTBoostVaultAddress);
    console.log(SUBSECTION_SEPARATOR);

    // GSC vault
    const ArcadeGSCVaultFactory = await ethers.getContractFactory("ArcadeGSCVault");
    const arcadeGSCVault = await ArcadeGSCVaultFactory.deploy(
        coreVoting.address,
        ethers.utils.parseEther(GSC_THRESHOLD),
        timelock.address
    );
    await arcadeGSCVault.deployed();
    const arcadeGSCVaultAddress = arcadeGSCVault.address;
    console.log("ArcadeGSCVault deployed to:", arcadeGSCVaultAddress);
    console.log(SUBSECTION_SEPARATOR);

    // ================= TREASURY =================

    // treasury
    const ArcadeTreasuryFactory = await ethers.getContractFactory("ArcadeTreasury");
    const arcadeTreasury = await ArcadeTreasuryFactory.deploy(ADMIN_ADDRESS);
    await arcadeTreasury.deployed();
    const arcadeTreasuryAddress = arcadeTreasury.address;
    console.log("ArcadeTreasury deployed to:", arcadeTreasuryAddress);
    console.log(SUBSECTION_SEPARATOR);

    // ================== AIRDROP ==================

    console.log(SECTION_SEPARATOR);
    console.log("Deploying Airdrop...");

    // airdrop
    const ArcadeAirdropFactory = await ethers.getContractFactory("ArcadeAirdrop");
    // deploy with high gas limit
    const arcadeAirdrop = await ArcadeAirdropFactory.deploy(
        ADMIN_ADDRESS,
        ethers.constants.HashZero,
        arcadeToken.address,
        AIRDROP_EXPIRATION,
        NFTBoostVault.address,
    );
    await arcadeAirdrop.deployed();
    const arcadeAirdropAddress = arcadeAirdrop.address;
    console.log("ArcadeAirdrop deployed to:", arcadeAirdropAddress);
    console.log(SECTION_SEPARATOR);

    // =============== REPUTATION BADGE ===============

    const BadgeDescriptorFactory = await ethers.getContractFactory("BadgeDescriptor");
    const badgeDescriptor = await BadgeDescriptorFactory.deploy(BADGE_DESCRIPTOR_BASE_URI);
    await badgeDescriptor.deployed();
    const badgeDescriptorAddress = badgeDescriptor.address;
    console.log("BadgeDescriptor deployed to:", badgeDescriptorAddress);

    const ReputationBadgeFactory = await ethers.getContractFactory("ReputationBadge");
    const reputationBadge = await ReputationBadgeFactory.deploy(ADMIN_ADDRESS, badgeDescriptorAddress);
    await reputationBadge.deployed();
    const reputationBadgeAddress = reputationBadge.address;
    console.log("ReputationBadge deployed to:", reputationBadgeAddress);

    // ================= SAVE ARTIFACTS =================

    console.log("Writing deployment artifacts...");
    await writeJson(
        arcadeTokenDistributorAddress,
        arcadeTokenAddress,
        coreVotingAddress,
        arcadeGSCCoreVotingAddress,
        timelockAddress,
        teamVestingVaultAddress,
        partnerVestingVaultAddress,
        NFTBoostVaultAddress,
        arcadeGSCVaultAddress,
        arcadeTreasuryAddress,
        arcadeAirdropAddress,
        badgeDescriptorAddress,
        reputationBadgeAddress,
    );

    console.log(SECTION_SEPARATOR);

    return {
        arcadeTokenDistributor,
        arcadeToken,
        coreVoting,
        arcadeGSCCoreVoting,
        timelock,
        teamVestingVault,
        partnerVestingVault,
        NFTBoostVault,
        arcadeGSCVault,
        arcadeTreasury,
        arcadeAirdrop,
        badgeDescriptor,
        reputationBadge,
    };
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
