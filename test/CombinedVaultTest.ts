import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { TestContextGovernance, governanceFixture } from "./utils/governanceFixture";
import { TestContextToken, tokenFixture } from "./utils/tokenFixture";

const { provider, loadFixture } = waffle;

describe("Governance Operations with Locking and NFT Boost Vaults", async () => {
    let ctxToken: TestContextToken;
    let ctxGovernance: TestContextGovernance;
    let fixtureToken: () => Promise<TestContextToken>;
    let fixtureGov: () => Promise<TestContextGovernance>;

    const ONE = ethers.utils.parseEther("1");
    const MULTIPLIER_DENOMINATOR = 1e3;
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    beforeEach(async function () {
        fixtureToken = await tokenFixture();
        ctxToken = await loadFixture(fixtureToken);
        const { arcdToken, arcdDst, deployer } = ctxToken;

        fixtureGov = await governanceFixture(ctxToken.arcdToken);
        ctxGovernance = await loadFixture(fixtureGov);
        const { signers, lockingVotingVault } = ctxGovernance;

        // mint tokens take tokens from the distributor for use in tests
        await expect(await arcdDst.connect(deployer).toPartnerVesting(signers[0].address))
            .to.emit(arcdDst, "Distribute")
            .withArgs(arcdToken.address, signers[0].address, ethers.utils.parseEther("32700000"));
        expect(await arcdDst.vestingPartnerSent()).to.be.true;

        // transfer tokens to signers and approve locking vault to spend
        for (let i = 0; i < signers.length; i++) {
            await arcdToken.connect(signers[0]).transfer(signers[i].address, ONE.mul(100));
            await arcdToken.connect(signers[i]).approve(lockingVotingVault.address, MAX);
        }
    });

    describe("Governance flow with combination of vaults types", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            const { arcdToken } = ctxToken;
            const {
                signers,
                coreVoting,
                increaseBlockNumber,
                nftBoostVault,
                lockingVotingVault,
                reputationNft,
                reputationNft2,
                mintNfts,
                setMultipliers,
                feeController,
                votingVaults,
            } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A, MULTIPLIER_B } = await setMultipliers();

            // LockingVault users: deposits and delegation
            // query voting power to initialize history for every governance participant
            const tx = await (
                await lockingVotingVault.deposit(signers[2].address, ONE.mul(3), signers[0].address)
            ).wait();
            // view query voting power of signers[0]
            const votingPower = await lockingVotingVault.queryVotePowerView(signers[0].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(3));

            const tx2 = await (await lockingVotingVault.deposit(signers[1].address, ONE, signers[2].address)).wait();
            // view query voting power of signers[2]
            const votingPower2 = await lockingVotingVault.queryVotePowerView(signers[2].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE);

            const tx3 = await (await lockingVotingVault.deposit(signers[4].address, ONE, signers[1].address)).wait();
            // view query voting power of signers[1]
            const votingPower3 = await lockingVotingVault.queryVotePowerView(signers[1].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE);

            // approve signers[0] tokens to NFT boost vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE);
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);
            // signers[0] registers reputation NFT, deposits tokens and delegates to signers[1]
            const tx4 = await nftBoostVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);
            // view query voting power of signers[1]
            const votingPower4 = await nftBoostVault.queryVotePowerView(signers[1].address, tx4.blockNumber);
            expect(votingPower4).to.be.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // approve signers[2] tokens to NFT boost vault and approves reputation nft
            await arcdToken.connect(signers[2]).approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.connect(signers[2]).setApprovalForAll(nftBoostVault.address, true);
            // signers[2] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx5 = await (
                await nftBoostVault
                    .connect(signers[2])
                    .addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address)
            ).wait();
            // view query voting power of signers[1]
            const votingPower5 = await nftBoostVault.queryVotePowerView(signers[1].address, tx5.blockNumber);
            expect(votingPower5).to.be.eq(ONE.mul(5).add(ONE).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // approve signers[3] tokens to NFT boost vault and approves repuation nft
            await arcdToken.connect(signers[3]).approve(nftBoostVault.address, ONE);
            await reputationNft2.connect(signers[3]).setApprovalForAll(nftBoostVault.address, true);
            // signers[3] registers reputation NFT, deposits ONE tokens and delegates to signers[0]
            const tx6 = await nftBoostVault
                .connect(signers[3])
                .addNftAndDelegate(ONE, 1, reputationNft2.address, signers[0].address);

            // view query voting power of signers[0]
            const votingPower6 = await nftBoostVault.queryVotePowerView(signers[0].address, tx6.blockNumber);
            expect(votingPower6).to.be.eq(ONE.mul(MULTIPLIER_B).div(MULTIPLIER_DENOMINATOR));

            // approve signers[1] tokens to NFT boost vault and approves reputation nft
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(8));
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);
            // signers[1] registers reputation NFT, deposits 8 tokens and delegates to signers[2]
            const tx7 = await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(8), 1, reputationNft.address, signers[2].address);

            // view query voting power of signers[2]
            const votingPower7 = await nftBoostVault.queryVotePowerView(signers[2].address, tx7.blockNumber);
            expect(votingPower7).to.be.eq(ONE.mul(8).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // create proposal to update V2 originationFee
            const newFee = 60;
            const targetAddress = [feeController.address];
            // create an interface to access feeController abi
            const fcFactory = await ethers.getContractFactory("FeeController");
            // encode function signature and new fee amount to pass in proposal
            const feeContCalldata = fcFactory.interface.encodeFunctionData("setOriginationFee", [newFee]);

            // signer holding enough voting power for proposal creation creates proposal
            await coreVoting
                .connect(signers[0])
                .proposal([votingVaults[0], votingVaults[1]], zeroExtraData, targetAddress, [feeContCalldata], MAX, 0);

            // pass proposal with YES majority
            await coreVoting.connect(signers[2]).vote([votingVaults[0], votingVaults[1]], zeroExtraData, 0, 0); // yes vote

            await coreVoting.connect(signers[1]).vote([votingVaults[0], votingVaults[1]], zeroExtraData, 0, 1); // no vote

            // increase blockNumber to exceed 3 day default lock duration set in coreVoting
            await increaseBlockNumber(provider, 19488);

            // proposal execution
            await coreVoting.connect(signers[0]).execute(0, targetAddress, [feeContCalldata]);
            const originationFee = await feeController.getOriginationFee();
            expect(originationFee).to.equal(newFee);
        });

        it("Executes the correct proposal out of many", async () => {
            const { arcdToken } = ctxToken;
            const {
                signers,
                coreVoting,
                increaseBlockNumber,
                nftBoostVault,
                lockingVotingVault,
                reputationNft,
                mintNfts,
                setMultipliers,
                feeController,
                votingVaults,
            } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the multiplier values
            const { MULTIPLIER_A } = await setMultipliers();

            // LockingVault users: deposits and delegation
            // query voting power to initialize history for every governance participant
            const tx = await (
                await lockingVotingVault.deposit(signers[2].address, ONE.mul(3), signers[0].address)
            ).wait();
            // view query voting power of signers[0]
            const votingPower = await lockingVotingVault.queryVotePowerView(signers[0].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(3));

            const tx2 = await (await lockingVotingVault.deposit(signers[1].address, ONE, signers[2].address)).wait();
            // view query voting power of signers[2]
            const votingPower2 = await lockingVotingVault.queryVotePowerView(signers[2].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE);

            const tx3 = await (await lockingVotingVault.deposit(signers[4].address, ONE, signers[1].address)).wait();
            // view query voting power of signers[1]
            const votingPower3 = await lockingVotingVault.queryVotePowerView(signers[1].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE);

            // NFT boost voting vault users: Badge registration and delegation
            // approve signers[0] tokens to NFT boost vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE);
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits ONE tokens and delegates to signers[1]
            const tx4 = await nftBoostVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            const votingPower4 = await nftBoostVault.queryVotePowerView(signers[1].address, tx4.blockNumber);
            expect(votingPower4).to.be.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // approve signers[2] tokens to NFT boost vault and approves reputation nft
            await arcdToken.connect(signers[2]).approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.connect(signers[2]).setApprovalForAll(nftBoostVault.address, true);
            // signers[2] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx5 = await (
                await nftBoostVault
                    .connect(signers[2])
                    .addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address)
            ).wait();

            // view query voting power of signer[1]
            const votingPower5 = await nftBoostVault.queryVotePowerView(signers[1].address, tx5.blockNumber);
            expect(votingPower5).to.be.eq(ONE.mul(5).add(ONE).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // approve signers[3] tokens to NFT boost vault and approves reputation nft
            await arcdToken.connect(signers[3]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[3]).setApprovalForAll(nftBoostVault.address, true);
            // signers[3] registers reputation NFT, deposits ONE tokens and delegates to signers[0]
            const tx6 = await nftBoostVault
                .connect(signers[3])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);

            // view query voting power of signers[0]
            const votingPower6 = await nftBoostVault.queryVotePowerView(signers[0].address, tx6.blockNumber);
            expect(votingPower6).to.be.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // approve signers[1] tokens to NFT boost vault and approves reputation nft
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(8));
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);
            // signers[1] registers reputation NFT, deposits 8 tokens and delegates to signers[2]
            const tx7 = await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(8), 1, reputationNft.address, signers[2].address);

            // view query voting power of signers[2]
            const votingPower7 = await nftBoostVault.queryVotePowerView(signers[2].address, tx7.blockNumber);
            expect(votingPower7).to.be.eq(ONE.mul(8).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // prepare proposal data
            const newRolloverFee = 62;
            const targetAddress = [feeController.address];
            const fcFactory = await ethers.getContractFactory("FeeController");
            // encode function signature and new rollover fee amount to pass in proposal
            const rolloverFeeCalldata = fcFactory.interface.encodeFunctionData("setRolloverFee", [newRolloverFee]);
            // generate proposal => proposalId # 0
            await coreVoting
                .connect(signers[0])
                .proposal(
                    [votingVaults[0], votingVaults[1]],
                    zeroExtraData,
                    targetAddress,
                    [rolloverFeeCalldata],
                    MAX,
                    0,
                );

            const newFee = 60;
            // encode function signature and new fee origination fee amount
            const feeContCalldata = fcFactory.interface.encodeFunctionData("setOriginationFee", [newFee]);

            // create an alternate proposal
            await coreVoting
                .connect(signers[0])
                .proposal([votingVaults[0], votingVaults[1]], zeroExtraData, targetAddress, [feeContCalldata], MAX, 0);

            // pass proposal with YES majority
            await coreVoting.connect(signers[2]).vote([votingVaults[0], votingVaults[1]], zeroExtraData, 1, 0); // yes vote on proposalId 1
            await coreVoting.connect(signers[1]).vote([votingVaults[0], votingVaults[1]], zeroExtraData, 1, 1); // no vote on proposalId 1

            //increase blockNumber to exceed 3 day default lock duration set in coreVoting
            await increaseBlockNumber(provider, 19488);

            // execute proposalId #1
            await coreVoting.connect(signers[0]).execute(1, targetAddress, [feeContCalldata]);
            const originationFee = await feeController.getOriginationFee();
            expect(originationFee).to.equal(newFee);
        });
    });
});
