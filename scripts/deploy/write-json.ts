import { BigNumberish } from "ethers";
import fs from "fs";
import hre from "hardhat";
import { ethers } from "hardhat";
import path from "path";

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
    REPUTATION_BADGE_ADMIN,
    STALE_BLOCK_LAG,
    TEAM_VESTING_VAULT_MANAGER,
    TIMELOCK_WAIT_TIME,
} from "./deployment-params";

export interface ContractData {
    contractAddress: string;
    constructorArgs: BigNumberish[];
}

export interface DeploymentData {
    [contractName: string]: ContractData;
}

export async function writeJson(
    arcadeTokenDistributorAddress: string,
    arcadeTokenAddress: string,
    coreVotingAddress: string,
    arcadeGSCCoreVotingAddress: string,
    timelockAddress: string,
    teamVestingVaultAddress: string,
    partnerVestingVaultAddress: string,
    NFTBoostVaultAddress: string,
    arcadeGSCVaultAddress: string,
    arcadeTreasuryAddress: string,
    arcadeAirdropAddress: string,
    badgeDescriptorAddress: string,
    reputationBadgeAddress: string,
): Promise<void> {
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const networkName = hre.network.name;
    const deploymentsFolder = `.deployments`;
    const jsonFile = `${networkName}-${timestamp}.json`;

    const deploymentsFolderPath = path.join(__dirname, "../../", deploymentsFolder);
    if (!fs.existsSync(deploymentsFolderPath)) fs.mkdirSync(deploymentsFolderPath);

    const networkFolderPath = path.join(deploymentsFolderPath, networkName);
    if (!fs.existsSync(networkFolderPath)) fs.mkdirSync(networkFolderPath);

    const contractInfo = await createInfo(
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

    fs.writeFileSync(path.join(networkFolderPath, jsonFile), JSON.stringify(contractInfo, undefined, 2));

    console.log("Contract info written to: ", path.join(networkFolderPath, jsonFile));
}

export async function createInfo(
    arcadeTokenDistributorAddress: string,
    arcadeTokenAddress: string,
    coreVotingAddress: string,
    arcadeGSCCoreVotingAddress: string,
    timelockAddress: string,
    teamVestingVaultAddress: string,
    partnerVestingVaultAddress: string,
    NFTBoostVaultAddress: string,
    arcadeGSCVaultAddress: string,
    arcadeTreasuryAddress: string,
    arcadeAirdropAddress: string,
    badgeDescriptorAddress: string,
    reputationBadgeAddress: string,
): Promise<DeploymentData> {
    const contractInfo: DeploymentData = {};

    contractInfo["ArcadeTokenDistributor"] = {
        contractAddress: arcadeTokenDistributorAddress,
        constructorArgs: [],
    };

    contractInfo["ArcadeToken"] = {
        contractAddress: arcadeTokenAddress,
        constructorArgs: [ADMIN_ADDRESS, arcadeTokenDistributorAddress],
    };

    contractInfo["CoreVoting"] = {
        contractAddress: coreVotingAddress,
        constructorArgs: [
            ADMIN_ADDRESS,
            ethers.utils.parseEther(BASE_QUORUM),
            ethers.utils.parseEther(MIN_PROPOSAL_POWER_CORE_VOTING),
            ethers.constants.AddressZero,
            [],
        ],
    };

    contractInfo["ArcadeGSCCoreVoting"] = {
        contractAddress: arcadeGSCCoreVotingAddress,
        constructorArgs: [ADMIN_ADDRESS, BASE_QUORUM_GSC, MIN_PROPOSAL_POWER_GSC, ethers.constants.AddressZero, []],
    };

    contractInfo["Timelock"] = {
        contractAddress: timelockAddress,
        constructorArgs: [TIMELOCK_WAIT_TIME, ADMIN_ADDRESS, ADMIN_ADDRESS],
    };

    contractInfo["ARCDVestingVault"] = {
        contractAddress: teamVestingVaultAddress,
        constructorArgs: [arcadeTokenAddress, STALE_BLOCK_LAG, TEAM_VESTING_VAULT_MANAGER, timelockAddress],
    };

    contractInfo["ImmutableVestingVault"] = {
        contractAddress: partnerVestingVaultAddress,
        constructorArgs: [arcadeTokenAddress, STALE_BLOCK_LAG, TEAM_VESTING_VAULT_MANAGER, timelockAddress],
    };

    contractInfo["NFTBoostVault"] = {
        contractAddress: NFTBoostVaultAddress,
        constructorArgs: [arcadeTokenAddress, STALE_BLOCK_LAG, timelockAddress, NFT_BOOST_VAULT_MANAGER],
    };

    contractInfo["ArcadeGSCVault"] = {
        contractAddress: arcadeGSCVaultAddress,
        constructorArgs: [coreVotingAddress, ethers.utils.parseEther(GSC_THRESHOLD), timelockAddress],
    };

    contractInfo["ArcadeTreasury"] = {
        contractAddress: arcadeTreasuryAddress,
        constructorArgs: [ADMIN_ADDRESS],
    };

    contractInfo["ArcadeAirdrop"] = {
        contractAddress: arcadeAirdropAddress,
        constructorArgs: [
            ADMIN_ADDRESS,
            ethers.constants.HashZero,
            arcadeTokenAddress,
            AIRDROP_EXPIRATION,
            NFTBoostVaultAddress,
        ],
    };

    contractInfo["BadgeDescriptor"] = {
        contractAddress: badgeDescriptorAddress,
        constructorArgs: [BADGE_DESCRIPTOR_BASE_URI],
    };

    contractInfo["ReputationBadge"] = {
        contractAddress: reputationBadgeAddress,
        constructorArgs: [REPUTATION_BADGE_ADMIN, badgeDescriptorAddress],
    };

    return contractInfo;
}
