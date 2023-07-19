import { expect } from "chai";
import { constants } from "ethers";
import { ethers, waffle } from "hardhat";

import { deploy } from "./utils/deploy";
import { TestContextGovernance, governanceFixture } from "./utils/governanceFixture";
import { TestContextToken, tokenFixture } from "./utils/tokenFixture";

const { provider, loadFixture } = waffle;

describe("Governance Operations with NFT Boost Voting Vault", async () => {
    let ctxToken: TestContextToken;
    let ctxGovernance: TestContextGovernance;
    let fixtureToken: () => Promise<TestContextToken>;

    const ONE = ethers.utils.parseEther("1");
    const MULTIPLIER_DENOMINATOR = 1e3;
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    beforeEach(async function () {
        fixtureToken = await tokenFixture();
        ctxToken = await loadFixture(fixtureToken);
        const { arcdToken, arcdDst, deployer } = ctxToken;

        const fixtureGov = await governanceFixture(ctxToken.arcdToken);
        ctxGovernance = await loadFixture(fixtureGov);
        const { signers } = ctxGovernance;

        // mint tokens take tokens from the distributor for use in tests
        await expect(await arcdDst.connect(deployer).toPartnerVesting(signers[0].address))
            .to.emit(arcdDst, "Distribute")
            .withArgs(arcdToken.address, signers[0].address, ethers.utils.parseEther("32700000"));
        expect(await arcdDst.vestingPartnerSent()).to.be.true;

        // transfer tokens to signers and approve locking vault to spend
        for (let i = 0; i < signers.length; i++) {
            await arcdToken.connect(signers[0]).transfer(signers[i].address, ONE.mul(100));
        }
    });

    it("Invalid deployment parameters", async () => {
        const { signers } = ctxGovernance;

        const staleBlockNum = 10;

        // get current block number
        const blockNumber = await ethers.provider.getBlockNumber();
        const staleBlockNum2 = blockNumber + 10; // adding ten to exceed current block

        await expect(
            deploy("NFTBoostVault", signers[0], [
                ethers.constants.AddressZero,
                staleBlockNum,
                signers[0].address,
                signers[1].address,
            ]),
        ).to.be.revertedWith(`BVV_ZeroAddress("token")`);

        await expect(
            deploy("NFTBoostVault", signers[0], [
                signers[0].address,
                staleBlockNum,
                ethers.constants.AddressZero,
                signers[1].address,
            ]),
        ).to.be.revertedWith(`NBV_ZeroAddress("timelock")`);

        await expect(
            deploy("NFTBoostVault", signers[0], [
                signers[0].address,
                staleBlockNum,
                signers[1].address,
                ethers.constants.AddressZero,
            ]),
        ).to.be.revertedWith(`NBV_ZeroAddress("manager")`);

        await expect(
            deploy("NFTBoostVault", signers[0], [
                signers[0].address,
                staleBlockNum2, // make the staleBlockLag equal to current block number
                signers[1].address,
                signers[1].address,
            ]),
        ).to.be.revertedWith(`BVV_UpperLimitBlock(${staleBlockNum2}`);
    });

    describe("Governance flow with NFT boost vault", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            const { arcdToken } = ctxToken;
            const {
                signers,
                coreVoting,
                increaseBlockNumber,
                nftBoostVault,
                reputationNft,
                reputationNft2, // other ERC1155 reputation NFT w/ different multiplier
                mintNfts,
                setMultipliers,
                feeController,
            } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A, MULTIPLIER_B } = await setMultipliers();

            // signers[0] approves tokens to NFT boost vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE);
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits tokens and delegates to signers[1]
            const tx = await nftBoostVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            const votingPower = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // approve signer tokens to NFT boost vault and approves reputation nft
            await arcdToken.connect(signers[2]).approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.connect(signers[2]).setApprovalForAll(nftBoostVault.address, true);

            // signers[2] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx1 = await nftBoostVault
                .connect(signers[2])
                .addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address);

            // view query voting power of signers 1
            const votingPower1 = await nftBoostVault.queryVotePowerView(signers[1].address, tx1.blockNumber);
            expect(votingPower1).to.be.eq(ONE.mul(6).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // approve signer tokens to NFT boost vault
            await arcdToken.connect(signers[3]).approve(nftBoostVault.address, ONE.mul(3));
            await reputationNft2.connect(signers[3]).setApprovalForAll(nftBoostVault.address, true);
            // signers[3] registers reputation NFT type 2, deposits three tokens and delegates to signers[0]
            const tx2 = await nftBoostVault
                .connect(signers[3])
                .addNftAndDelegate(ONE.mul(3), 1, reputationNft2.address, signers[0].address);

            // view query voting power of signers[0]
            const votingPower2 = await nftBoostVault.queryVotePowerView(signers[0].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE.mul(3).mul(MULTIPLIER_B).div(MULTIPLIER_DENOMINATOR));

            // signers[1] approves ONE tokens to voting vault and approves reputation nft
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(3));
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers reputation NFT, deposits THREE tokens and delegates to signers[2]
            const tx3 = await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(3), 1, reputationNft.address, signers[2].address);

            // view query voting power of signers[2]
            const votingPower3 = await nftBoostVault.queryVotePowerView(signers[2].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE.mul(3).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // proposal creation to update originationFee in FeeController
            const newFee = 62;
            const targetAddress = [feeController.address];
            // create an interface to access feeController abi
            const fcFactory = await ethers.getContractFactory("FeeController");
            // encode function signature and new fee amount to pass in proposal execution if majority votes YES
            const feeContCalldata = fcFactory.interface.encodeFunctionData("setOriginationFee", [newFee]);

            // a signer that holds enough voting power for proposal creation, creates the proposal
            // with a YES ballot
            await coreVoting
                .connect(signers[0])
                .proposal([nftBoostVault.address], zeroExtraData, targetAddress, [feeContCalldata], MAX, 0);

            // pass proposal with YES majority
            await coreVoting.connect(signers[2]).vote([nftBoostVault.address], zeroExtraData, 0, 0); // yes vote

            //increase blockNumber to exceed 3 day default lock duration set in coreVoting
            await increaseBlockNumber(provider, 19488);

            // proposal 0 execution
            await coreVoting.connect(signers[0]).execute(0, targetAddress, [feeContCalldata]);
            const originationFee = await feeController.getOriginationFee();
            expect(originationFee).to.equal(newFee);
        });

        it("Partial token withdrawal reduces delegatee voting power", async () => {
            const { arcdToken, blockchainTime } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

            // initialize history for signers[1]
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx = await nftBoostVault.addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address);
            await tx.wait();

            // get contract balance after these txns
            const contractBalance = await arcdToken.balanceOf(nftBoostVault.address);

            // get delegatee voting power amount
            const votingPower = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(6).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers[0] withdraws ONE token
            await nftBoostVault.connect(signers[0]).withdraw(ONE);

            // get contract balance after withdrawal
            const contractBalanceAfter = await arcdToken.balanceOf(nftBoostVault.address);
            // confirm current contract balance equals previous balance minus ONE
            expect(contractBalanceAfter).to.eq(contractBalance.sub(ONE));

            const nowBlock = await blockchainTime.secondsFromNow(0);
            // get delegatee voting power after
            const votingPowerAfter = await nftBoostVault.queryVotePowerView(signers[1].address, nowBlock);
            // confirm that delegatee voting power is ONE less than before withdrawal
            expect(votingPowerAfter).to.eq(votingPower.sub(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR)));
        });

        it("Full token withdrawal reduces delegatee voting power. Withdrawn tokens transferred back to user", async () => {
            const { arcdToken, blockchainTime } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

            // initialize history for signers[1]
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            const now = await blockchainTime.secondsFromNow(0);
            // get signers[1] voting power before they receive any further delegation
            const votingPowerBefore = await nftBoostVault.queryVotePowerView(signers[1].address, now);
            expect(votingPowerBefore).to.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits FIVE tokens and delegates to signers[1]
            const tx = await (
                await nftBoostVault.addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address)
            ).wait();

            // confirm that signers[0] no longer holds their reputation nft, it is held by the contract
            const erc1155Bal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(erc1155Bal).to.be.eq(0);

            // get contract ERC20 balance after these txns
            const contractBalance = await arcdToken.balanceOf(nftBoostVault.address);

            // get delegatee total voting power amount
            const votingPower = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(6).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers[0] balance before they withdraw
            const withdrawerBalBefore = await arcdToken.balanceOf(signers[0].address);
            // signers[0] withdraws all their deposited tokens
            await nftBoostVault.connect(signers[0]).withdraw(ONE.mul(5));

            // get contract balance after withdraw txn
            const contractBalanceAfter = await arcdToken.balanceOf(nftBoostVault.address);
            // confirm current contract balance is balance minus amount withdrawn
            expect(contractBalanceAfter).to.eq(contractBalance.sub(ONE.mul(5)));

            const afterBlock = await blockchainTime.secondsFromNow(0);
            // get delegatee voting power after token withdrawal
            const votingPowerAfter = await nftBoostVault.queryVotePowerView(signers[1].address, afterBlock);
            // confirm that the delegatee voting is now less
            expect(votingPowerAfter).to.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers[0] balance after withdraw
            const withdrawerBalAfter = await arcdToken.balanceOf(signers[0].address);
            // confirm that signers[0] balance voting is more than before token withdrawal
            expect(withdrawerBalAfter).to.eq(withdrawerBalBefore.add(ONE.mul(5)));
            // confirm that signers[0] now holds their reputation nft
            const erc1155Bal2 = await reputationNft.balanceOf(signers[0].address, 1);
            expect(erc1155Bal2).to.be.eq(1);
        });

        it("It reduces the correct amount of voting power from a delegate when a user changes their delegation", async () => {
            const { arcdToken, blockchainTime } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

            // initialize history for signers[1]
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            // signers[0] approves 5 tokens to NFT boost vault and reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits FIVE tokens and delegates to signers[1]
            const tx = await (
                await nftBoostVault.addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address)
            ).wait();

            // get delegatee total voting power amount
            const votingPowerSignersOne = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPowerSignersOne).to.be.eq(ONE.mul(6).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers [3] approves tokens to voting vault and approves reputation nft
            await arcdToken.connect(signers[3]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[3]).setApprovalForAll(nftBoostVault.address, true);

            // signers[3] registers reputation NFT, deposits ONE tokens and delegates to signers[0]
            const tx2 = await nftBoostVault
                .connect(signers[3])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);

            // view query voting power of signers[0]
            const votingPowerSignersZero = await nftBoostVault.queryVotePowerView(signers[0].address, tx2.blockNumber);
            expect(votingPowerSignersZero).to.be.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers[0] changes their delegation from users[1] to users[3]
            await (await nftBoostVault.connect(signers[0]).delegate(signers[3].address)).wait();

            const afterBlock = await blockchainTime.secondsFromNow(0);

            // confirm that signers[1] lost signers[0]'s voting power
            const votingPowerSignersOneAfter = await nftBoostVault.queryVotePowerView(signers[1].address, afterBlock);
            expect(votingPowerSignersOneAfter).to.eq(
                votingPowerSignersOne.sub(ONE.mul(5).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR)),
            );

            // confirm that signers[3] has received signers[0]'s voting power
            const votingPowerSignersThreeAfter = await nftBoostVault.queryVotePowerView(signers[3].address, afterBlock);
            expect(votingPowerSignersThreeAfter).to.eq(ONE.mul(5).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));
        });

        it("Reverts a user calls addNftAndDelegate() with an nft they do not own", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // signers[1] approves ERC1155 to signers[0]
            await reputationNft.connect(signers[1]).setApprovalForAll(signers[0].address, true);

            // signers[1] transfers their 1 ERC1155 id 1 to signers[0]
            await reputationNft
                .connect(signers[1])
                .safeTransferFrom(signers[1].address, signers[0].address, 1, 1, "0x");

            // confirm that signers[1] no longer owns any ERC1155 id 1
            const userBal = await reputationNft.balanceOf(signers[1].address, 1);
            expect(userBal).to.be.eq(0);

            // signers[1] approves tokens to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] tries to add ERC1155 id 1 in their call for registration
            const tx = nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            await expect(tx).to.be.revertedWith("NBV_DoesNotOwn");
        });

        it("Reverts when user who has an existing registration tries to call addNftAndDelegate() again", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, reputationNft2, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[1] approves tokens to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            // signers[1] approves their other ERC1155 to the voting vault
            await reputationNft2.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] tries to register a second time
            const tx2 = nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft2.address, signers[1].address);

            await expect(tx2).to.be.revertedWith("NBV_HasRegistration");
        });

        it("Reverts when user tries to register with token amount of zero", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[1] approves tokens to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers
            await expect(
                nftBoostVault.connect(signers[1]).addNftAndDelegate(0, 1, reputationNft.address, signers[1].address),
            ).to.be.revertedWith("NBV_ZeroAmount");
        });

        it("Allows user to self-delegate", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            const { MULTIPLIER_A } = await setMultipliers();

            // signers[1] approves tokens to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers and delegates to self by not specifying a delegation address
            const tx = await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, constants.AddressZero);
            await tx.wait();

            const newAmount = ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR);
            await expect(tx)
                .to.emit(nftBoostVault, "VoteChange")
                .withArgs(signers[1].address, signers[1].address, newAmount);

            // confirm that the registration delegatee is signers[1]
            const registration = await nftBoostVault.getRegistration(signers[1].address);
            expect(registration[0]).to.eq(ONE);
            expect(registration[1]).to.eq(newAmount);
            expect(registration[2]).to.eq(0);
            expect(registration[3]).to.eq(1);
            expect(registration[4]).to.eq(reputationNft.address);
            expect(registration[5]).to.eq(signers[1].address);
        });

        it("Returns a user's registration with getRegistration()", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            const { MULTIPLIER_A } = await setMultipliers();

            // signers[1] approves tokens to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers and delegates to self by not specifying a delegation address
            const tx = await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, constants.AddressZero);
            await tx.wait();

            // get signers[1] registration
            const registration = await nftBoostVault.getRegistration(signers[1].address);

            // confirm signers[1] registration data
            expect(registration[0]).to.eq(ONE);
            expect(registration[1]).to.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));
            expect(registration[2]).to.eq(0);
            expect(registration[3]).to.eq(1);
            expect(registration[4]).to.eq(reputationNft.address);
            expect(registration[5]).to.eq(signers[1].address);
        });

        it("Reverts when calling delegate() when 'to' is already the user's delegatee", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[1] approves tokens to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers and delegates signers[2]
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[2].address);

            // get signers[1] registration
            const registration = await nftBoostVault.getRegistration(signers[1].address);
            // confirm that signers[2] is signers[1] delegatee
            expect(registration[5]).to.eq(signers[2].address);

            // signers[1] calls delegate() on signers[2] who is already their delegate
            const tx = nftBoostVault.connect(signers[1]).delegate(signers[2].address);
            await expect(tx).to.be.revertedWith("NBV_AlreadyDelegated");
        });

        it("Reverts when calling delegate() when 'to' is address zero", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[1] approves tokens to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers and delegates signers[2]
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[2].address);

            // get signers[1] registration
            const registration = await nftBoostVault.getRegistration(signers[1].address);
            // confirm that signers[2] is signers[1] delegatee
            expect(registration[5]).to.eq(signers[2].address);

            // signers[1] calls delegate() on signers[2] who is already their delegate
            const tx = nftBoostVault.connect(signers[1]).delegate(constants.AddressZero);
            await expect(tx).to.be.revertedWith(`BV_ZeroAddress("to")`);
        });

        it("withdraw() correctly transfers all deposited ERC20 tokens back to the user if no ERC1155 nft has been deposited with registration", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // initialize history for signers[1]
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(5));

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(5), 0, constants.AddressZero, signers[1].address);

            // get user balance after deposit
            const balanceBefore = await arcdToken.balanceOf(signers[1].address);

            // signers[1] withdraws their deposited token
            await nftBoostVault.connect(signers[1]).withdraw(ONE.mul(5));

            // get user balance after withdraw
            const balanceAfter = await arcdToken.balanceOf(signers[1].address);
            // confirm user balance has grown by 5 tokens after withdraw
            expect(balanceAfter).to.eq(balanceBefore.add(ONE.mul(5)));
        });

        it("full withdraw() transfers nft back to the user if ERC1155 address and ERC1155 id does not equal zero", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            const amountToDeposit = ONE;
            const amountToWithdraw = ONE;

            // initialize history for signers[1]
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, amountToDeposit);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(amountToDeposit, 1, reputationNft.address, signers[1].address);

            // confirm that signers[1] no longer holds their reputation nft, it is deposited in the contract
            const erc1155Bal = await reputationNft.balanceOf(signers[1].address, 1);
            expect(erc1155Bal).to.be.eq(0);

            // confirm that amountToDeposit and amountToWithdraw are equal
            expect(amountToDeposit).to.eq(amountToWithdraw);

            // get signers[1] registration
            const registration = await nftBoostVault.getRegistration(signers[1].address);
            // confirm that registration.tokenId != 0
            expect(registration.tokenId).to.not.eq(0);
            // confirm that registration.tokenAddress != address(0)
            expect(registration.tokenAddress).to.not.eq(constants.AddressZero);

            // signers[1] withdraws their deposited token
            await nftBoostVault.connect(signers[1]).withdraw(amountToWithdraw);

            // confirm that signers[1] now is the holder of their reputation nft
            const erc1155Bal2 = await reputationNft.balanceOf(signers[1].address, 1);
            expect(erc1155Bal2).to.be.eq(1);
        });

        it("Reverts if user tries to call withdraw() on amount larger than contract ERC20 balance", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // signers[1] approves tokens to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers and delegates signers[2]
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[2].address);

            // signers[1] calls withdraw for FIVE tokens, which is larger than what the contract holds
            const tx = nftBoostVault.connect(signers[1]).withdraw(ONE.mul(5));
            await expect(tx).to.be.revertedWith("NBV_InsufficientBalance");
        });

        it("Reverts if user calls withdraw() with an amount larger than their registration amount", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // signers[1] approves tokens to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers depositing ONE tokens and delegating to signers[2]
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[2].address);

            // signers[2] approves tokens to voting vault
            await arcdToken.connect(signers[2]).approve(nftBoostVault.address, ONE.mul(10));
            await reputationNft.connect(signers[2]).setApprovalForAll(nftBoostVault.address, true);

            // signers[2] registers depositing TEN tokens and delegating to self
            await nftBoostVault
                .connect(signers[2])
                .addNftAndDelegate(ONE.mul(10), 1, reputationNft.address, constants.AddressZero);

            // signers[1] calls withdraw for THREE tokens, which is larger than what they have deposited in their registration
            const tx = nftBoostVault.connect(signers[1]).withdraw(ONE.mul(3));
            await expect(tx).to.be.revertedWith(`NBV_InsufficientWithdrawableBalance(${ONE})`);
        });

        it("Reverts if user tries calls withdraw() with ZERO amount", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // signers[2] approves tokens to voting vault
            await arcdToken.connect(signers[2]).approve(nftBoostVault.address, ONE.mul(10));
            await reputationNft.connect(signers[2]).setApprovalForAll(nftBoostVault.address, true);

            // signers[2] registers depositing TEN tokens and delegating to self
            await nftBoostVault
                .connect(signers[2])
                .addNftAndDelegate(ONE.mul(10), 1, reputationNft.address, constants.AddressZero);

            // signers[2] calls withdraw for 0 tokens
            const tx = nftBoostVault.connect(signers[2]).withdraw(0);
            await expect(tx).to.be.revertedWith("NBV_ZeroAmount");
        });

        it("ERC1155 stays locked when a user withdraws a fraction of their deposited tokens", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // confirm the user is holding the erc1155 nft they will deposit
            const userNftBal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userNftBal).to.be.eq(1);

            // confirm the contract is not holding any erc1155 nft
            const contractNftBal = await reputationNft.balanceOf(nftBoostVault.address, 1);
            expect(contractNftBal).to.be.eq(0);

            // signers[0] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx = await nftBoostVault.addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address);
            await tx.wait();

            // confirm the user is no longer holding the erc1155 nft they deposited
            const userNftBal1 = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userNftBal1).to.be.eq(0);

            // confirm the contract now holds the erc1155 nft
            const contractNftBal1 = await reputationNft.balanceOf(nftBoostVault.address, 1);
            expect(contractNftBal1).to.be.eq(1);

            // get the user's current ERC20 balance
            const userErc20Bal = await arcdToken.balanceOf(signers[0].address);

            // user calls withdraw() on THREE tokens / partial deposit amount withdrawal
            await nftBoostVault.withdraw(ONE.mul(3));

            // confirm the user is now holding the withdrawn ERC20 tokens
            const userErc20BalAfter = await arcdToken.balanceOf(signers[0].address);
            expect(userErc20BalAfter).to.be.eq(userErc20Bal.add(ONE.mul(3)));

            // confirm the contract is still the holding the erc1155 nft
            const contractNftBal2 = await reputationNft.balanceOf(nftBoostVault.address, 1);
            expect(contractNftBal2).to.be.eq(1);
        });

        it("Reverts if a user calls withdraw() an ERC20 amount larger than their 'withdrawable' amount", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // initialize history for signers[1]
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(8));
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers reputation NFT, deposits EIGHT tokens and delegates to self
            const tx = await (
                await nftBoostVault
                    .connect(signers[1])
                    .addNftAndDelegate(ONE.mul(8), 1, reputationNft.address, signers[1].address)
            ).wait();

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits FIVE tokens and delegates to self
            // this deposit is for padding NBV's ERC20 balance, so that when signers[1] tries to withdraw
            // an amount larger than their registration withdrawable amount, the txn does not revert with
            // custom error "NBV_InsufficientBalance"
            await nftBoostVault.addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[0].address);

            // get signers 1 voting power amount
            const votingPower = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(8).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers 1 withdraws THREE tokens
            const tx2 = await nftBoostVault.connect(signers[1]).withdraw(ONE.mul(3));
            const votingPower2 = await nftBoostVault.queryVotePowerView(signers[1].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE.mul(5).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // calculate signers[1] withdrawable amount
            const withdrawable = votingPower2.div(MULTIPLIER_A);
            expect(withdrawable).to.be.eq(ONE.mul(5).div(MULTIPLIER_DENOMINATOR));

            // signers 1 tries to withdraw SIX tokens (less than registration amount but larger than
            // registration withdrawable amount)
            const tx3 = nftBoostVault.connect(signers[1]).withdraw(ONE.mul(6));
            await expect(tx3).to.be.revertedWith(`NBV_InsufficientWithdrawableBalance(${ONE.mul(5)})`);
        });

        it("addTokens() transfers added funds to contract and increases delegatee voting power", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // initialize history for signers[1]
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(5));
            // signers[1] registers reputation NFT, deposits ONE arcdToken and delegates to self
            const tx = await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(5), 0, constants.AddressZero, signers[1].address);
            await tx.wait();

            // get user balance before addTokens()
            const userBalBefore = await arcdToken.balanceOf(signers[1].address);
            // get contract balance before addTokens()
            const contractBalBefore = await arcdToken.balanceOf(nftBoostVault.address);

            // get delegatee voting power amount
            const votingPower = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(5));

            // signers[1] approves TWO more arcdToken to be added their registration
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(2));
            // adds TWO arcdTokens
            const tx2 = await nftBoostVault.connect(signers[1]).addTokens(ONE.mul(2));
            await tx2.wait();

            // get contract balance after add arcdTokens
            const contractBalAfter = await arcdToken.balanceOf(nftBoostVault.address);
            // get user balance after add arcdTokens
            const userBalAfter = await arcdToken.balanceOf(signers[1].address);

            // confirm contract balance now has TWO more tokens
            await expect(contractBalAfter).to.eq(contractBalBefore.add(ONE.mul(2)));
            // confirm user balance has 2 less arcdTokens
            await expect(userBalAfter).to.eq(userBalBefore.sub(ONE.mul(2)));

            // confirm the delegatee voting power has increased with the added arcdTokens
            const votingPower2 = await nftBoostVault.queryVotePowerView(signers[1].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE.mul(7));
        });

        it("addTokens() updates the amount in the registration data", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            const { MULTIPLIER_A } = await setMultipliers();

            // signers[1] approves arcdToken to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers and delegates to self by not specifying a delegation address
            const tx = await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, constants.AddressZero);
            await tx.wait();

            // get signers[1] registration
            const registration = await nftBoostVault.getRegistration(signers[1].address);

            // confirm signers[1] registration data
            expect(registration[0]).to.eq(ONE); // amount
            expect(registration[1]).to.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR)); // latestVotingPower
            expect(registration[2]).to.eq(0); // withdrawn
            expect(registration[3]).to.eq(1); // tokenId
            expect(registration[4]).to.eq(reputationNft.address); // tokenAddress
            expect(registration[5]).to.eq(signers[1].address); // delegatee

            // signers[1] approves TWO more arcdTokens to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(2));
            // signers[1] adds TWO more arcdTokens to their registration
            const tx2 = await nftBoostVault.connect(signers[1]).addTokens(ONE.mul(2));
            await tx2.wait();

            // get signers[1] registration
            const registration2 = await nftBoostVault.getRegistration(signers[1].address);
            // added amount in registration, now equals three
            expect(registration2[0]).to.eq(ONE.mul(3));
        });

        it("reverts if addTokens() is called with amount zero", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[2] approves arcdTokens to voting vault
            await arcdToken.connect(signers[2]).approve(nftBoostVault.address, ONE.mul(10));
            await reputationNft.connect(signers[2]).setApprovalForAll(nftBoostVault.address, true);

            // signers[2] registers depositing TEN arcdTokens and delegating to self
            await nftBoostVault
                .connect(signers[2])
                .addNftAndDelegate(ONE.mul(10), 1, reputationNft.address, constants.AddressZero);

            // signers[2] calls addTokens with amount 0
            const tx = nftBoostVault.connect(signers[2]).addTokens(0);
            await expect(tx).to.be.revertedWith("NBV_ZeroAmount");
        });

        it("user calls addTokens() without prior registration", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // signers[1] approves TWO arcdTokens to be added to their registration
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(2));
            // signers[1] calls addTokens() without prior registration
            await expect(nftBoostVault.connect(signers[1]).addTokens(ONE.mul(2))).to.be.revertedWith(
                "NBV_NoRegistration()",
            );
        });

        it("Transfers reputation nft back to user when withdrawNft() is called", async () => {
            const { arcdToken } = ctxToken;
            const { nftBoostVault, signers, reputationNft, mintNfts } = ctxGovernance;

            // mint user some nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await nftBoostVault.setMultiplier(reputationNft.address, 1, 1200);

            // signers[0] approves ONE tokens to the voting vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE);
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits tokens and delegates to self
            await nftBoostVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);

            // check that the user balance for reputation nft is now zero
            const userErc1155Bal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal).to.be.eq(0);

            // check that the contract is the holder of the reputation nft
            const erc1155Bal = await reputationNft.balanceOf(nftBoostVault.address, 1);
            expect(erc1155Bal).to.be.eq(1);

            // user withdraws ERC1155
            await nftBoostVault.withdrawNft();

            // check that the user balance for reputation nft is now one
            const userErc1155Bal2 = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal2).to.be.eq(1);
        });

        it("Reverts when withdrawNft() is called on an invalid token address", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // signers[0] approves 5 tokens and erc1155 nft to voting vault
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registration deposits 5 tokens, delegates to signers[1] and deposits NO erc1155 nft
            await nftBoostVault.addNftAndDelegate(ONE.mul(5), 0, constants.AddressZero, signers[1].address);

            const tx = nftBoostVault.withdrawNft();
            await expect(tx).to.be.revertedWith(`NBV_InvalidNft("${constants.AddressZero}", ${0})`);
        });

        it("Reverts when withdrawNft() is called on an invalid token id", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // signers[0] approves 5 tokens and erc1155 nft to voting vault
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registration deposits 5 tokens, delegates to signers[1] and deposits NO erc1155 nft
            await nftBoostVault.addNftAndDelegate(ONE.mul(5), 0, reputationNft.address, signers[1].address);

            const tx = nftBoostVault.withdrawNft();
            await expect(tx).to.be.revertedWith(`NBV_InvalidNft("${reputationNft.address}", ${0})`);
        });

        it("Reverts if withdrawNft() is called and the user has not deposited an ERC1155 nft", async () => {
            const { arcdToken } = ctxToken;
            const { nftBoostVault, signers } = ctxGovernance;

            // signers[0] approves 5 tokens to voting vault
            await arcdToken.approve(nftBoostVault.address, ONE);

            // signers[0] registers reputation NFT as address zero, deposits FIVE tokens and delegates to self
            await nftBoostVault.addNftAndDelegate(ONE, 0, ethers.constants.AddressZero, signers[0].address);

            // user calls withdraws ERC1155
            const tx = nftBoostVault.withdrawNft();
            await expect(tx).to.be.revertedWith(`NBV_InvalidNft("0x0000000000000000000000000000000000000000", 0)`);
        });

        it("Reduces delegatee votingPower if withdrawNft() is called and user tokens are still locked", async () => {
            const { arcdToken } = ctxToken;
            const { nftBoostVault, signers, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint user some nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

            // initialize history for signers[1]
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            // signers[0] approves 5 tokens to NFT boost vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx = await nftBoostVault.addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address);
            await tx.wait();

            // get delegatee voting power amount
            const votingPower = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(6).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers[0] withdraws ERC1155
            const tx2 = await nftBoostVault.withdrawNft();
            await tx2.wait();

            // get delegatee voting power amount
            const votingPowerAfter = await nftBoostVault.queryVotePowerView(signers[1].address, tx2.blockNumber);
            // expect only the votingPower amount associated with signers[0] to have the multiplier value eliminated
            // from the delegatee's voting power
            expect(votingPowerAfter).to.be.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR).add(ONE.mul(5)));
        });

        it("User can change their multiplier with updateNft()", async () => {
            const { arcdToken } = ctxToken;
            const {
                signers,
                nftBoostVault,
                reputationNft,
                reputationNft2, // other ERC1155 reputation NFT w/ different multiplier
                mintNfts,
                setMultipliers,
            } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A, MULTIPLIER_B } = await setMultipliers();

            // signers[0] approves tokens to NFT boost vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE);
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits tokens and delegates to signers[1]
            const tx = await nftBoostVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            const votingPower = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers[1] approves tokens to voting vault and approves reputation nft
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers reputation NFT, deposits 5 tokens and delegates to self
            const tx1 = await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address);

            // view query voting power of signers 1
            const votingPower1 = await nftBoostVault.queryVotePowerView(signers[1].address, tx1.blockNumber);
            expect(votingPower1).to.be.eq(ONE.mul(5).add(ONE).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers[0] approves reputation nft 2 to voting vault
            await reputationNft2.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] updates their reputation nft to reputationNft2 which is associated with MULTIPLIER_B
            const tx2 = await nftBoostVault.updateNft(1, reputationNft2.address);

            // they are now again holding the first reputation nft which they have replaced
            const userErc1155Bal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal).to.be.eq(1);

            // their delegatee voting power is updated based on the multiplier value of their new ERC1155 nft
            // view query voting power of signers 1
            const votingPower2 = await nftBoostVault.queryVotePowerView(signers[1].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(
                ONE.mul(5).mul(MULTIPLIER_A).add(ONE.mul(MULTIPLIER_B)).div(MULTIPLIER_DENOMINATOR),
            );
        });

        it("Reverts if user calls updateNft() with invalid token address", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            await setMultipliers();

            // signers[1] approves ERC20 tokens and reputationNft to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] deposits ERC20 tokens, reputationNft and delegates to signers[3]
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[3].address);

            // signers[1] tries to update ERC1155 in their registration using zero token address and zero token id
            const tx = nftBoostVault.connect(signers[1]).updateNft(0, constants.AddressZero);
            await expect(tx).to.be.revertedWith(`NBV_InvalidNft("0x0000000000000000000000000000000000000000", 0)`);
        });

        it("Reverts if user calls updateNft() with invalid token id", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            await setMultipliers();

            // signers[1] approves ERC20 tokens and reputationNft to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] deposits ERC20 tokens, reputationNft and delegates to signers[3]
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[3].address);

            // signers[1] tries to update ERC1155 in their registration using zero token address and zero token id
            const tx = nftBoostVault.connect(signers[1]).updateNft(0, reputationNft.address);
            await expect(tx).to.be.revertedWith(`NBV_InvalidNft("${reputationNft.address}", 0)`);
        });

        it("Reverts if user calls updateNft() with ERC1155 token they do not own", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, reputationNft2, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            await setMultipliers();

            // signers[1] approves ERC1155 to signers[0]
            await reputationNft.connect(signers[1]).setApprovalForAll(signers[0].address, true);

            // signers[1] transfers their reputationNft ERC1155 id 1 to signers[0]
            await reputationNft
                .connect(signers[1])
                .safeTransferFrom(signers[1].address, signers[0].address, 1, 1, "0x");

            // confirm that signers[1] no longer owns any reputationNft ERC1155 id 1
            const userBal = await reputationNft.balanceOf(signers[1].address, 1);
            expect(userBal).to.be.eq(0);

            // signers[1] approves ERC20 tokens and reputationNft2 to voting vault
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft2.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] deposits ERC20 tokens, reputationNft2 and delegates to signers[3]
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft2.address, signers[3].address);

            // signers[1] tries to update ERC1155 in their registration, replacing reputationNft2 by reputationNft
            const tx = nftBoostVault.connect(signers[1]).updateNft(1, reputationNft.address);
            await expect(tx).to.be.revertedWith("NBV_DoesNotOwn");
        });

        it("Reverts if user calls updateNft() without an existing registration", async () => {
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some ERC1155 nfts
            await mintNfts();

            await setMultipliers();

            // confirm that signers[1] owns reputationNft id 1
            const userBal = await reputationNft.balanceOf(signers[1].address, 1);
            expect(userBal).to.be.eq(1);

            // signers[1] tries to add NFT without prior registration
            await expect(nftBoostVault.connect(signers[1]).updateNft(1, reputationNft.address)).to.be.revertedWith(
                "NBV_NoRegistration()",
            );
        });

        it("Returns ZERO when _getWithdrawableAmount() is triggered for a non-registration", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits FIVE tokens and delegates to self
            // this deposit is for padding NBV's ERC20 balance, so that when signers[1] tries to withdraw
            // an amount larger than their registration withdrawable amount, the txn does not revert with
            // custom error "NBV_InsufficientBalance"
            await nftBoostVault.addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[0].address);

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // signers[1] tries to withdraw ONE tokens
            const tx = nftBoostVault.connect(signers[1]).withdraw(ONE);
            await expect(tx).to.be.revertedWith("NBV_InsufficientWithdrawableBalance(0)");
        });

        it("Returns ZERO when _getWithdrawableAmount() is triggered where a user's registration withdrawable amount would be overdrawn", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits FIVE tokens and delegates to self
            // this deposit is for padding NBV's ERC20 balance, so that when signers[1] tries to withdraw
            // an amount larger than their registration withdrawable amount, the txn does not revert with
            // custom error "NBV_InsufficientBalance"
            await nftBoostVault.addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[0].address);

            // initialize history for signers[1]
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(10));
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(10), 1, reputationNft.address, signers[1].address);

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // signers[1] withdraws all of their deposited tokens
            await nftBoostVault.connect(signers[1]).withdraw(ONE.mul(10));

            // signers[1] tries to withdraws another token
            const tx = nftBoostVault.connect(signers[1]).withdraw(ONE.mul(2));
            await expect(tx).to.be.revertedWith("NBV_InsufficientWithdrawableBalance(0)");
        });

        it("reverts if withdraw() is called before unlock", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // initialize history for signers[1]
            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE.mul(5));

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(5), 0, constants.AddressZero, signers[1].address);

            // signers[1] withdraws their deposited token
            const tx = nftBoostVault.connect(signers[1]).withdraw(ONE.mul(5));
            await expect(tx).to.be.revertedWith("NBV_Locked");
        });

        it("reverts if unlock() is called more than once", async () => {
            const { signers, nftBoostVault, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // timelock unlocks ERC20 withdrawals
            await nftBoostVault.connect(signers[0]).unlock();

            // call unlock again
            const tx = nftBoostVault.connect(signers[0]).unlock();
            await expect(tx).to.be.revertedWith("NBV_AlreadyUnlocked");
        });

        it("reverts if address other than timelock calls unlock()", async () => {
            const { signers, nftBoostVault, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // other account tries to unlock ERC20 withdrawals
            const tx = nftBoostVault.connect(signers[1]).unlock();
            await expect(tx).to.be.revertedWith("BVV_NotTimelock()");
        });
    });

    describe("Multiplier functionality", async () => {
        it("Sets the multiplier value", async () => {
            const { signers, nftBoostVault, reputationNft } = ctxGovernance;

            // manager updates the value of the ERC1155 token multiplier
            await nftBoostVault.connect(signers[0]).setMultiplier(reputationNft.address, 1, 1200);

            // get new multiplier value
            const multiplierVal = await nftBoostVault.getMultiplier(reputationNft.address, 1);
            expect(multiplierVal).to.eq(1200);
        });

        it("Reverts if setMultiplier() is called with a value higher than multiplier limit", async () => {
            const { signers, nftBoostVault, reputationNft } = ctxGovernance;

            // manager tries to update the value of the ERC1155 token multiplier w/ value higher than limit
            const tx = nftBoostVault.connect(signers[0]).setMultiplier(reputationNft.address, 1, 1501);

            await expect(tx).to.be.revertedWith("NBV_MultiplierLimit()");
        });

        it("Sets a multiplier for each different tokenId of the same ERC1155 token address", async () => {
            const { signers, nftBoostVault, reputationNft } = ctxGovernance;

            // manager sets the value of the multiplier for ERC1155's token id 1
            await nftBoostVault.connect(signers[0]).setMultiplier(reputationNft.address, 1, 1200);

            // manager sets the value of the multiplier for ERC1155's token id 2
            await nftBoostVault.connect(signers[0]).setMultiplier(reputationNft.address, 2, 1400);

            // get multiplier value for tokenId 1
            const multiplier1Val = await nftBoostVault.getMultiplier(reputationNft.address, 1);
            await expect(multiplier1Val).to.eq(1200);

            // get multiplier value for tokenId 2
            const multiplier2Val = await nftBoostVault.getMultiplier(reputationNft.address, 2);
            await expect(multiplier2Val).to.eq(1400);
        });

        it("Fails if the caller is not the manager", async () => {
            const { signers, nftBoostVault, reputationNft } = ctxGovernance;

            // non-manager account to try to update the value of the token address multiplier
            const tx = nftBoostVault.connect(signers[2]).setMultiplier(reputationNft.address, 1, 1200);
            await expect(tx).to.be.revertedWith("BVV_NotManager()");
        });

        it("Only timelock can set a new manager", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // timelock sets a new manager
            await nftBoostVault.connect(signers[0]).setManager(signers[5].address);
            await expect(await nftBoostVault.manager()).to.be.eq(signers[5].address);
        });

        it("Correctly updates the value of multiplier", async () => {
            const { signers, nftBoostVault, reputationNft } = ctxGovernance;

            // manager sets the value of the token address multiplier
            await nftBoostVault.connect(signers[0]).setMultiplier(reputationNft.address, 1, 1200);

            // get the current multiplier
            const multiplier = await nftBoostVault.getMultiplier(reputationNft.address, 1);
            await expect(multiplier).to.eq(1200);

            // manager updates the value of the multiplier
            await nftBoostVault.connect(signers[0]).setMultiplier(reputationNft.address, 1, 1400);

            // get new multiplier value
            const newMultiplier = await nftBoostVault.getMultiplier(reputationNft.address, 1);
            await expect(newMultiplier).to.eq(1400);
        });

        it("Returns ZERO if getMultiplier() is called on a token that does not have a multiplier", async () => {
            const { nftBoostVault, reputationNft } = ctxGovernance;

            // no multiplier has been set for reputationNft.address
            // get reputationNft.address multiplier
            const multiplier = await nftBoostVault.getMultiplier(reputationNft.address, 1);
            await expect(multiplier).to.eq(0);
        });

        it("Reverts if addNftAndDelegate() is called with a token that does not have a multiplier", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts } = ctxGovernance;

            // mint nft for user
            await mintNfts();

            // no multiplier has been set for reputationNft.address

            await arcdToken.connect(signers[1]).approve(nftBoostVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(nftBoostVault.address, true);

            const tx = nftBoostVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);
            await expect(tx).to.be.revertedWith("NBV_NoMultiplierSet");
        });

        it("Multiplier value returns ONE when addNftAndDelegate() is called with ERC1155 token address == 0", async () => {
            const { arcdToken } = ctxToken;
            const { nftBoostVault, signers } = ctxGovernance;

            // signers[0] approves 5 tokens to NFT boost vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));

            // signers[0] registers reputation NFT as address zero, deposits FIVE tokens and delegates to self
            const tx = await nftBoostVault.addNftAndDelegate(
                ONE.mul(5),
                0,
                ethers.constants.AddressZero,
                signers[0].address,
            );

            // get total voting power amount
            const votingPower = await nftBoostVault.queryVotePowerView(signers[0].address, tx.blockNumber);

            // get the current multiplier
            const multiplier = await nftBoostVault.getMultiplier(constants.AddressZero, 1);
            await expect(multiplier).to.eq(MULTIPLIER_DENOMINATOR);
            await expect(votingPower).to.be.eq(ONE.mul(5).mul(multiplier).div(MULTIPLIER_DENOMINATOR));
        });

        it("Multiplier value returns ONE when addNftAndDelegate() is called with ERC1155 token id == 0", async () => {
            const { arcdToken } = ctxToken;
            const { nftBoostVault, signers, reputationNft } = ctxGovernance;

            // signers[0] approves 5 tokens to NFT boost vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));

            // signers[0] registers reputation NFT as address zero, deposits FIVE tokens and delegates to self
            const tx = await nftBoostVault.addNftAndDelegate(ONE.mul(5), 0, reputationNft.address, signers[0].address);

            // get total voting power amount
            const votingPower = await nftBoostVault.queryVotePowerView(signers[0].address, tx.blockNumber);

            // get the current multiplier
            const multiplier = await nftBoostVault.getMultiplier(reputationNft.address, 0);
            await expect(multiplier).to.eq(MULTIPLIER_DENOMINATOR);
            await expect(votingPower).to.be.eq(ONE.mul(5).mul(multiplier).div(MULTIPLIER_DENOMINATOR));
        });

        it("Calling updateVotingPower() syncs delegates voting power when a multiplier value is adjusted", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, setMultipliers, mintNfts } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

            // signers[0] approves arcdTokens to NFT boost vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE);
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits arcdTokens and delegates to signers[1]
            const tx = await nftBoostVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            // get signers[1] voting power
            const votingPower1Before = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower1Before).to.be.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // signers[2] approves arcdTokens to NFT boost vault and approves reputation nft
            await arcdToken.connect(signers[2]).approve(nftBoostVault.address, ONE.mul(5));
            await reputationNft.connect(signers[2]).setApprovalForAll(nftBoostVault.address, true);

            // signers[2] registers reputation NFT, deposits 5 arcdTokens and delegates to signers[3]
            const tx1 = await nftBoostVault
                .connect(signers[2])
                .addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[3].address);

            // view query voting power of signers[3]
            const votingPower3Before = await nftBoostVault.queryVotePowerView(signers[3].address, tx1.blockNumber);
            expect(votingPower3Before).to.be.eq(ONE.mul(5).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // get the current multiplier
            const multiplier = await nftBoostVault.getMultiplier(reputationNft.address, 1);
            await expect(multiplier).to.eq(1200);

            // manager updates the value of the multiplier
            await nftBoostVault.connect(signers[0]).setMultiplier(reputationNft.address, 1, 1400);

            // get new multiplier value
            const newMultiplier = await nftBoostVault.getMultiplier(reputationNft.address, 1);
            await expect(newMultiplier).to.eq(1400);

            const nowBlock = await ethers.provider.getBlock("latest");

            // signers[1] voting power is still as it was before the multiplier update
            const votingPower1After = await nftBoostVault.queryVotePowerView(signers[1].address, nowBlock.number);
            expect(votingPower1After).to.eq(votingPower1Before);

            // signers[3] calls updateVotingPower on signers[0] and signers[2], to adjust their registration delegatee voting power
            await nftBoostVault.connect(signers[3]).updateVotingPower([signers[0].address, signers[2].address]);

            const nowBlock2 = await ethers.provider.getBlock("latest");

            // signers[1] voting power has now reflects new multiplier value boost
            const votingPower1AfterUpdateVP = await nftBoostVault.queryVotePowerView(
                signers[1].address,
                nowBlock2.number,
            );
            expect(votingPower1AfterUpdateVP).to.eq(ONE.mul(newMultiplier).div(MULTIPLIER_DENOMINATOR));

            // manager updates the value of the multiplier again, this time reducing it
            await nftBoostVault.connect(signers[0]).setMultiplier(reputationNft.address, 1, 1100);

            // get new multiplier value
            const reducedMultiplier = await nftBoostVault.getMultiplier(reputationNft.address, 1);
            await expect(reducedMultiplier).to.eq(1100);

            // signers[3] voting power value is still the same as pre multiplier updates
            const votingPower3After = await nftBoostVault.queryVotePowerView(signers[3].address, nowBlock.number);
            expect(votingPower3After).to.eq(votingPower3Before);

            // signers[0] calls updateVotingPower on signers[2] and signers[0], to adjust their delegatee's voting power
            await nftBoostVault.connect(signers[0]).updateVotingPower([signers[0].address, signers[2].address]);

            const currentBlock = await ethers.provider.getBlock("latest");

            //confirm that signers[3] voting power is now aligned with the reduced multiplier value
            const votingPower3C = await nftBoostVault.queryVotePowerView(signers[3].address, currentBlock.number);
            expect(votingPower3C).to.eq(ONE.mul(5).mul(reducedMultiplier).div(MULTIPLIER_DENOMINATOR));
        });

        it("Reverts if updateVotingPower() is called with more than 50 addresses", async () => {
            const { signers, nftBoostVault } = ctxGovernance;
            const addresses = [];

            for (let i = 0; i < 51; i++) {
                addresses.push(signers[5].address);
            }

            await expect(nftBoostVault.connect(signers[0]).updateVotingPower(addresses)).to.be.revertedWith(
                "NBV_ArrayTooManyElements()",
            );
        });
    });

    describe("BaseVotingVault functionality", async () => {
        it("reverts if setTimelock() is called by an address other that the timelock", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // other account tries to set a new timelock address
            const tx = nftBoostVault.connect(signers[4]).setTimelock(signers[5].address);
            await expect(tx).to.be.revertedWith("BVV_NotTimelock()");
        });

        it("reverts if setTimelock() is called with address zero", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // set timelock to address zero
            const tx = nftBoostVault.connect(signers[0]).setTimelock(ethers.constants.AddressZero);
            await expect(tx).to.be.revertedWith(`BVV_ZeroAddress("timelock")`);
        });

        it("successfully sets the address of the timelock with setTimelock()", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // timelock sets a new timelock address
            await nftBoostVault.connect(signers[0]).setTimelock(signers[5].address);

            // get the new timelock address
            const newTimelockAddress = await nftBoostVault.connect(signers[1]).timelock();
            await expect(newTimelockAddress).to.eq(signers[5].address);
        });

        it("reverts if setManager() is called by an address other that the timelock", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // other account tries to set a new manager
            const tx = nftBoostVault.connect(signers[4]).setManager(signers[5].address);
            await expect(tx).to.be.revertedWith("BVV_NotTimelock()");
        });

        it("reverts if setManager() is called with address zero", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // set manager to address zero
            const tx = nftBoostVault.connect(signers[0]).setManager(ethers.constants.AddressZero);
            await expect(tx).to.be.revertedWith(`BVV_ZeroAddress("manager")`);
        });

        it("successfully sets a new manager with setManager()", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // timelock sets a new timelock address
            await nftBoostVault.connect(signers[0]).setManager(signers[5].address);

            // get the new timelock address
            const newTimelockAddress = await nftBoostVault.connect(signers[1]).manager();
            await expect(newTimelockAddress).to.eq(signers[5].address);
        });

        it("calling timelock() returns the address of the timelock", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // get timelock address
            const timelockAddress = await nftBoostVault.connect(signers[1]).timelock();
            await expect(timelockAddress).to.eq(signers[0].address);
        });
    });

    describe("Airdrop functionality", async () => {
        it("Gets the current airdrop contract address", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // get airdrop contract address
            const airdropContractAddress = await nftBoostVault.connect(signers[1]).getAirdropContract();
            await expect(airdropContractAddress).to.eq(signers[0].address);
        });

        it("Reverts if airdropReceive() is called by an address other than airdrop address", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // other account tries to call airdrop()
            const tx = nftBoostVault.connect(signers[4]).airdropReceive(signers[5].address, ONE, signers[5].address);
            await expect(tx).to.be.revertedWith("NBV_NotAirdrop()");
        });

        it("Reverts if setAirdropContract() is called by an address other than the manager", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // other account tries to call setAirdropContract()
            const tx = nftBoostVault.connect(signers[4]).setAirdropContract(signers[5].address);
            await expect(tx).to.be.revertedWith("BVV_NotManager()");
        });

        it("Reverts if airdropReceive() is called with a zero amount", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // mock airdrop contract tries to call airdropReceive(), with zero amount
            const tx = nftBoostVault.connect(signers[0]).airdropReceive(signers[0].address, 0, signers[0].address);
            await expect(tx).to.be.revertedWith("NBV_ZeroAmount()");
        });

        it("Reverts if airdropReceive() is called with a zero address", async () => {
            const { signers, nftBoostVault } = ctxGovernance;

            // mock airdrop contract tries to call airdropReceive(), with zero address as recipient
            const tx = nftBoostVault.connect(signers[0]).airdropReceive(constants.AddressZero, ONE, signers[0].address);
            await expect(tx).to.be.revertedWith(`NBV_ZeroAddress("user")`);
        });

        it("User claims airdrop, then claims again. Registration and voting power are updated", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A, MULTIPLIER_B } = await setMultipliers();

            // signers[0] approves tokens to NFT boost vault
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));

            // signers[2] claims airdrop, delegates to self
            await nftBoostVault.connect(signers[0]).airdropReceive(signers[2].address, ONE.mul(5), signers[2].address);

            // get total voting power amount
            const currentBlock = await ethers.provider.getBlock("latest");
            const votingPower = await nftBoostVault.queryVotePowerView(signers[2].address, currentBlock.number);
            // confirm that signers[2] voting power is equal to the amount of tokens they have claimed
            expect(votingPower).to.be.eq(ONE.mul(5));

            // get users registration and confirm values
            const registration = await nftBoostVault.getRegistration(signers[2].address);
            expect(registration[0]).to.eq(ONE.mul(5)); // amount
            expect(registration[1]).to.eq(ONE.mul(5)); // latestVotingPower
            expect(registration[2]).to.eq(0); // withdrawn
            expect(registration[3]).to.eq(0); // tokenId
            expect(registration[4]).to.eq(ethers.constants.AddressZero); // tokenAddress
            expect(registration[5]).to.eq(signers[2].address); // delegatee

            // signers[0] approves tokens to NFT boost vault
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));

            // signers[2] claims airdrop again
            await nftBoostVault.connect(signers[0]).airdropReceive(signers[2].address, ONE.mul(5), signers[2].address);

            // get total voting power amount
            const currentBlock2 = await ethers.provider.getBlock("latest");
            const votingPower2 = await nftBoostVault.queryVotePowerView(signers[2].address, currentBlock2.number);
            // confirm that signers[2] voting power is equal to the amount of tokens they have claimed
            expect(votingPower2).to.be.eq(ONE.mul(10));

            // get users registration and confirm values
            const registration2 = await nftBoostVault.getRegistration(signers[2].address);
            expect(registration2[0]).to.eq(ONE.mul(10)); // amount
            expect(registration2[1]).to.eq(ONE.mul(10)); // latestVotingPower
            expect(registration2[2]).to.eq(0); // withdrawn
            expect(registration2[3]).to.eq(0); // tokenId
            expect(registration2[4]).to.eq(ethers.constants.AddressZero); // tokenAddress
            expect(registration2[5]).to.eq(signers[2].address); // delegatee
        });

        it("User claims airdrop, then claims again. delegates to 3rd party, registration and voting power are updated", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A, MULTIPLIER_B } = await setMultipliers();

            // signers[0] approves tokens to NFT boost vault
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));

            // signers[2] claims airdrop, delegates to signers[3]
            await nftBoostVault.connect(signers[0]).airdropReceive(signers[2].address, ONE.mul(5), signers[3].address);

            // get total voting power amount
            const currentBlock = await ethers.provider.getBlock("latest");
            const votingPower = await nftBoostVault.queryVotePowerView(signers[3].address, currentBlock.number);
            // confirm that signers[3] voting power is equal to the amount of tokens they have claimed
            expect(votingPower).to.be.eq(ONE.mul(5));

            // get users registration and confirm values
            const registration = await nftBoostVault.getRegistration(signers[2].address);
            expect(registration[0]).to.eq(ONE.mul(5)); // amount
            expect(registration[1]).to.eq(ONE.mul(5)); // latestVotingPower
            expect(registration[2]).to.eq(0); // withdrawn
            expect(registration[3]).to.eq(0); // tokenId
            expect(registration[4]).to.eq(ethers.constants.AddressZero); // tokenAddress
            expect(registration[5]).to.eq(signers[3].address); // delegatee

            // signers[0] approves tokens to NFT boost vault
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));

            // signers[2] claims airdrop again, delegates to same 3rd party address
            await nftBoostVault.connect(signers[0]).airdropReceive(signers[2].address, ONE.mul(5), signers[3].address);

            // get total voting power amount, delegates to new account
            const currentBlock2 = await ethers.provider.getBlock("latest");
            const votingPower2 = await nftBoostVault.queryVotePowerView(signers[3].address, currentBlock2.number);
            // confirm that signers[3] voting power is equal to the amount of tokens they have claimed
            expect(votingPower2).to.be.eq(ONE.mul(10));

            // get users registration and confirm values
            const registration2 = await nftBoostVault.getRegistration(signers[2].address);
            expect(registration2[0]).to.eq(ONE.mul(10)); // amount
            expect(registration2[1]).to.eq(ONE.mul(10)); // latestVotingPower
            expect(registration2[2]).to.eq(0); // withdrawn
            expect(registration2[3]).to.eq(0); // tokenId
            expect(registration2[4]).to.eq(ethers.constants.AddressZero); // tokenAddress
            expect(registration2[5]).to.eq(signers[3].address); // delegatee
        });

        it("Airdrop claim reverts when subsequent claim delegates to a different delegatee", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A, MULTIPLIER_B } = await setMultipliers();

            // signers[0] approves tokens to NFT boost vault
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));

            // signers[2] claims airdrop, delegates to signers[3]
            await nftBoostVault.connect(signers[0]).airdropReceive(signers[2].address, ONE.mul(5), signers[3].address);

            // get total voting power amount
            const currentBlock = await ethers.provider.getBlock("latest");
            const votingPower = await nftBoostVault.queryVotePowerView(signers[3].address, currentBlock.number);
            // confirm that signers[3] voting power is equal to the amount of tokens they have claimed
            expect(votingPower).to.be.eq(ONE.mul(5));

            // get users registration and confirm values
            const registration = await nftBoostVault.getRegistration(signers[2].address);
            expect(registration[0]).to.eq(ONE.mul(5)); // amount
            expect(registration[1]).to.eq(ONE.mul(5)); // latestVotingPower
            expect(registration[2]).to.eq(0); // withdrawn
            expect(registration[3]).to.eq(0); // tokenId
            expect(registration[4]).to.eq(ethers.constants.AddressZero); // tokenAddress
            expect(registration[5]).to.eq(signers[3].address); // delegatee

            // signers[0] approves tokens to NFT boost vault
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));

            // signers[2] claims airdrop again, delegates to different 3rd party address
            await expect(
                nftBoostVault.connect(signers[0]).airdropReceive(signers[2].address, ONE.mul(5), signers[4].address),
            ).to.be.revertedWith(`NBV_WrongDelegatee("${signers[4].address}", "${signers[3].address}")`);
        });

        it("reverts when user creates registration via addNftAndDelegate(), then claims airdrop with different delegatee address", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

            // signers[0] approves tokens to NFT boost vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE);
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits tokens and delegates to signers[1]
            const tx = await nftBoostVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            const votingPower = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // get users registration and confirm values
            const registration = await nftBoostVault.getRegistration(signers[0].address);
            expect(registration[0]).to.eq(ONE); // amount
            expect(registration[1]).to.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR)); // latestVotingPower
            expect(registration[2]).to.eq(0); // withdrawn
            expect(registration[3]).to.eq(1); // tokenId
            expect(registration[4]).to.eq(reputationNft.address); // tokenAddress
            expect(registration[5]).to.eq(signers[1].address); // delegatee

            // signers[0] approves tokens to NFT boost vault
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));

            // signers[0] claims airdrop, delegates to signers[3]
            await expect(
                nftBoostVault.connect(signers[0]).airdropReceive(signers[0].address, ONE.mul(5), signers[3].address),
            ).to.be.revertedWith(`NBV_WrongDelegatee("${signers[3].address}", "${signers[1].address}")`);
        });

        it("user creates registration via addNftAndDelegate(), then claims airdrop", async () => {
            const { arcdToken } = ctxToken;
            const { signers, nftBoostVault, reputationNft, mintNfts, setMultipliers } = ctxGovernance;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

            // signers[0] approves tokens to NFT boost vault and approves reputation nft
            await arcdToken.approve(nftBoostVault.address, ONE);
            await reputationNft.setApprovalForAll(nftBoostVault.address, true);

            // signers[0] registers reputation NFT, deposits tokens and delegates to signers[1]
            const tx = await nftBoostVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            const votingPower = await nftBoostVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR));

            // get users registration and confirm values
            const registration = await nftBoostVault.getRegistration(signers[0].address);
            expect(registration[0]).to.eq(ONE); // amount
            expect(registration[1]).to.eq(ONE.mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR)); // latestVotingPower
            expect(registration[2]).to.eq(0); // withdrawn
            expect(registration[3]).to.eq(1); // tokenId
            expect(registration[4]).to.eq(reputationNft.address); // tokenAddress
            expect(registration[5]).to.eq(signers[1].address); // delegatee

            // signers[0] approves tokens to NFT boost vault
            await arcdToken.approve(nftBoostVault.address, ONE.mul(5));

            // signers[0] claims airdrop, delegates to signers[3]
            await expect(
                nftBoostVault.connect(signers[0]).airdropReceive(signers[0].address, ONE.mul(5), signers[1].address),
            )
                .to.emit(nftBoostVault, "VoteChange")
                .withArgs(
                    signers[0].address,
                    signers[1].address,
                    ONE.mul(5).mul(MULTIPLIER_A).div(MULTIPLIER_DENOMINATOR),
                );
        });
    });
});
