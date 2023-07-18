import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { Wallet } from "ethers";
import hre from "hardhat";
import { MerkleTree } from "merkletreejs";

import { ArcadeAirdrop, ArcadeTokenDistributor, IArcadeToken, NFTBoostVault } from "../../src/types";
import { deploy } from "./contracts";
import { Account, getMerkleTree } from "./external/council/helpers/merkle";
import { BlockchainTime } from "./time";

type Signer = SignerWithAddress;

export interface TestContextToken {
    deployer: Signer;
    other: Signer;
    other2: Signer;
    treasury: Wallet;
    devPartner: Wallet;
    communityRewardsPool: Wallet;
    vestingTeamMultisig: Wallet;
    vestingPartner: Wallet;
    arcdAirdrop: ArcadeAirdrop;
    arcdToken: IArcadeToken;
    arcdDst: ArcadeTokenDistributor;
    mockNFTBoostVault: NFTBoostVault;
    recipients: Account;
    blockchainTime: BlockchainTime;
    merkleTrie: MerkleTree;
    expiration: number;
    staleBlockNum: number;
    bootstrapVestingManager: () => Promise<void>;
}

/**
 * This fixture is test context for the Arcade token, deploying the Arcade token, distribution and airdrop contracts
 * and returning them for use in unit testing.
 */
export const tokenFixture = (): (() => Promise<TestContextToken>) => {
    return async (): Promise<TestContextToken> => {
        const blockchainTime = new BlockchainTime();

        // ======================================== ACCOUNTS ========================================
        const signers: Signer[] = await hre.ethers.getSigners();
        const deployer: Signer = signers[0];
        const other: Signer = signers[1];
        const other2: Signer = signers[2];

        // mock recipients for distribution
        const treasury = new Wallet.createRandom();
        const devPartner = new Wallet.createRandom();
        const communityRewardsPool = new Wallet.createRandom();
        const vestingTeamMultisig = new Wallet.createRandom();
        const vestingPartner = new Wallet.createRandom();

        // ==================================== TOKEN DEPLOYMENT ====================================

        // deploy distribution contract
        const arcdDst = <ArcadeTokenDistributor>await deploy("ArcadeTokenDistributor", signers[0], []);
        await arcdDst.deployed();

        // deploy the Arcade token, with minter role set to the distribution contract
        const arcdToken = <ArcadeToken>await deploy("ArcadeToken", signers[0], [deployer.address, arcdDst.address]);
        await arcdToken.deployed();

        // deployer sets token in the distribution contract
        await arcdDst.connect(deployer).setToken(arcdToken.address);
        expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

        // ========================== MOCK AIRDROP VAULT DEPLOYMENT =========================

        const staleBlock = await ethers.provider.getBlock("latest");
        const staleBlockNum = staleBlock.number;

        // deploy mock voting vault to simulate the nftBoostVault vault in production
        const mockNFTBoostVault = <NFTBoostVault>await deploy("NFTBoostVault", signers[0], [
            arcdToken.address,
            staleBlockNum,
            deployer.address, // timelock - vault admin (can update manager)
            signers[1].address, // manager - vault manager (can set airdrop contract and multipliers)
        ]);
        await mockNFTBoostVault.deployed();

        // ====================================== AIRDROP SETUP =====================================

        // airdrop claims data
        const recipients: Account = [
            {
                address: deployer.address,
                value: ethers.utils.parseEther("1000"),
            },
            {
                address: other.address,
                value: ethers.utils.parseEther("1000000"),
            },
            {
                address: other2.address,
                value: ethers.utils.parseEther("8000000"),
            },
        ];

        // hash leaves
        const merkleTrie = await getMerkleTree(recipients);
        const root = merkleTrie.getHexRoot();

        // airdrop claim expiration is current unix stamp + 1 hour
        const expiration = await blockchainTime.secondsFromNow(3600);

        // =================================== AIRDROP DEPLOYMENT ==================================

        // deploy airdrop contract
        const arcdAirdrop = <ArcadeAirdrop>await deploy("ArcadeAirdrop", signers[0], [
            signers[0].address, // in production this is to be the governance timelock address
            root,
            arcdToken.address,
            expiration,
            mockNFTBoostVault.address,
        ]);
        await arcdAirdrop.deployed();

        // set airdrop contract in mockNftBoostVault
        await mockNFTBoostVault.connect(signers[1]).setAirdropContract(arcdAirdrop.address);

        // ==================================== HELPER FUNCTIONS ===================================

        const bootstrapVestingManager = async (): Promise<void> => {
            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(signers[1].address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, signers[1].address, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(signers[1].address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, signers[1].address, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(signers[1].address)).to.equal(partnerVestingAmount.add(teamVestingAmount));
        };

        return {
            deployer,
            other,
            other2,
            treasury,
            devPartner,
            communityRewardsPool,
            vestingTeamMultisig,
            vestingPartner,
            arcdAirdrop,
            arcdToken,
            arcdDst,
            mockNFTBoostVault,
            recipients,
            blockchainTime,
            merkleTrie,
            expiration,
            staleBlockNum,
            bootstrapVestingManager,
        };
    };
};
