import { expect } from "chai";
import { ethers } from "hardhat";

import { deploy } from "./utils/deploy";
import { TestContextGovernance, governanceFixture } from "./utils/governanceFixture";
import { TestContextToken, tokenFixture } from "./utils/tokenFixture";

const { provider, loadFixture } = waffle;

/**
 * Test suite for the Arcade vesting vault contracts.
 */
describe("Vesting voting vault", function () {
    let ctxToken: TestContextToken;
    let ctxGovernance: TestContextGovernance;
    let fixtureToken: () => Promise<TestContextToken>;
    let fixtureGov: () => Promise<TestContextGovernance>;

    beforeEach(async function () {
        fixtureToken = await tokenFixture();
        ctxToken = await loadFixture(fixtureToken);

        fixtureGov = await governanceFixture(ctxToken.arcdToken);
        ctxGovernance = await loadFixture(fixtureGov);
    });

    it("invalid deployment parameters", async () => {
        const { signers } = ctxGovernance;

        // get the current block number
        const currentBlockNum = 10;

        await expect(
            deploy("ARCDVestingVault", signers[0], [
                ethers.constants.AddressZero,
                currentBlockNum,
                signers[1].address,
                signers[2].address,
            ]),
        ).to.be.revertedWith(`BVV_ZeroAddress("token")`);

        await expect(
            deploy("ARCDVestingVault", signers[0], [
                signers[1].address,
                currentBlockNum,
                ethers.constants.AddressZero,
                signers[2].address,
            ]),
        ).to.be.revertedWith(`AVV_ZeroAddress("manager")`);

        await expect(
            deploy("ARCDVestingVault", signers[0], [
                signers[1].address,
                currentBlockNum,
                signers[2].address,
                ethers.constants.AddressZero,
            ]),
        ).to.be.revertedWith(`AVV_ZeroAddress("timelock")`);
    });

    describe("Manager only functions", function () {
        it("check manager address", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const MANAGER_ADDRESS = signers[1].address;

            expect(await vestingVotingVault.manager()).to.equal(MANAGER_ADDRESS);
        });

        it("manager cannot set new manager", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const OTHER_ADDRESS = signers[0].address;
            const MANAGER = signers[1];

            await expect(vestingVotingVault.connect(MANAGER).setManager(OTHER_ADDRESS)).to.be.revertedWith(
                "BVV_NotTimelock()",
            );
        });

        it("manager cannot set new timelock", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const OTHER_ADDRESS = signers[0].address;
            const MANAGER = signers[1];

            await expect(vestingVotingVault.connect(MANAGER).setTimelock(OTHER_ADDRESS)).to.be.revertedWith(
                "BVV_NotTimelock()",
            );
        });

        it("current timelock sets new manager and timelock accounts", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const OTHER_ADDRESS = signers[0].address;
            const TIMELOCK = signers[2];

            await vestingVotingVault.connect(TIMELOCK).setManager(OTHER_ADDRESS);
            expect(await vestingVotingVault.manager()).to.equal(OTHER_ADDRESS);
            await vestingVotingVault.connect(TIMELOCK).setTimelock(OTHER_ADDRESS);
            expect(await vestingVotingVault.timelock()).to.equal(OTHER_ADDRESS);
        });

        it("non-manager tries to deposit and withdraw tokens from the vv", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // transfer tokens to non-manager account for test
            await arcdToken.connect(MANAGER).transfer(OTHER_ADDRESS, ethers.utils.parseEther("100"));

            // non-manager (other) account tries to deposit
            await arcdToken.connect(OTHER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await expect(vestingVotingVault.connect(OTHER).deposit(ethers.utils.parseEther("100"))).to.be.revertedWith(
                "BVV_NotManager()",
            );

            // real manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // non-manager (other) account tries to withdraw
            await expect(
                vestingVotingVault.connect(OTHER).withdraw(ethers.utils.parseEther("100"), OTHER_ADDRESS),
            ).to.be.revertedWith("BVV_NotManager()");

            // real manager withdraws tokens from vesting vault
            const managerBalanceBefore = await arcdToken.balanceOf(MANAGER_ADDRESS);
            await vestingVotingVault.connect(MANAGER).withdraw(ethers.utils.parseEther("100"), MANAGER_ADDRESS);
            const managerBalanceAfter = await arcdToken.balanceOf(MANAGER_ADDRESS);
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("0"));
            expect(managerBalanceAfter.sub(managerBalanceBefore)).to.equal(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("100"));
        });

        it("add grant and delegate then check voting power", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // get grant
            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("100"),
            );
        });

        it("non-manager tries to add a grant", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(OTHER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx).to.be.revertedWith("BVV_NotManager()");
        });

        it("manager tries to add grant with out locking funds", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            await bootstrapVestingManager();

            // add grant without locking funds
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx).to.be.revertedWith("AVV_InsufficientBalance(0)");
        });

        it("add grant with invalid cliff and start times", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // try to add grant with invalid start time
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                expiration, // start time is after or equal to expiration
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx).to.be.revertedWith("AVV_InvalidSchedule()");

            // try to add grant with cliff after expiration
            const tx2 = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                grantCreatedBlock, // start time is current block
                expiration,
                expiration, // cliff is after expiration
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx2).to.be.revertedWith("AVV_InvalidSchedule()");

            // try to add grant with cliff before start time
            const tx3 = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                grantCreatedBlock, // start time is current block
                expiration,
                grantCreatedBlock - 1, // cliff is before start time
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx3).to.be.revertedWith("AVV_InvalidSchedule()");
        });

        it("add grant with delegate as grant recipient", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant with delegate as grant recipient
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is after or equal to expiration
                expiration,
                cliff,
                ethers.constants.AddressZero, // pass in zero to delegate to grant recipient
            );

            // get grant
            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);
        });

        it("add grant and delegate then manager tries to withdraw", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // get grant
            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(ethers.utils.parseEther("0"));
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // manager tries to withdraw
            await expect(
                vestingVotingVault.connect(MANAGER).withdraw(ethers.utils.parseEther("100"), MANAGER_ADDRESS),
            ).to.be.revertedWith("AVV_InsufficientBalance(0)");
        });

        it("reverts when manager adds grant with address zero", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // manager tries to add grant with address zero
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const expiration = currentBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                ethers.constants.AddressZero, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                currentBlock, // start time is current block
                expiration,
                currentBlock + 100, // cliff is 100 blocks in the future
                ethers.constants.AddressZero, // voting power delegate
            );

            await expect(tx).to.be.revertedWith("AVV_ZeroAddress");
        });

        it("reverts when manager adds grant with zero amount", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const OTHER_ADDRESS = signers[0].address;

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // manager tries to add grant with address zero
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const expiration = currentBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                0, // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                currentBlock, // start time is current block
                expiration,
                currentBlock + 100, // cliff is 100 blocks in the future
                ethers.constants.AddressZero, // voting power delegate
            );

            await expect(tx).to.be.revertedWith("AVV_InvalidAmount");
        });

        it("manager tries to add grant for account that already exists", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("10000"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("10000"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("10000"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // add another grant for the same account
            await expect(
                vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                    OTHER_ADDRESS, // recipient
                    ethers.utils.parseEther("1000"), // grant amount
                    ethers.utils.parseEther("500"), // cliff unlock amount
                    0, // start time is current block
                    expiration,
                    cliff,
                    OTHER_ADDRESS, // voting power delegate
                ),
            ).to.be.revertedWith("AVV_HasGrant()");
        });

        it("cliff amount greater than grant amount", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("100.1"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx).to.be.revertedWith("AVV_InvalidCliffAmount()");
        });

        it("manager revokes grant and receives granted tokens", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
            const managerBalanceBefore = await arcdToken.balanceOf(MANAGER_ADDRESS);

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // manager revokes grant before any tokens are claimed
            await vestingVotingVault.connect(MANAGER).revokeGrant(OTHER_ADDRESS);
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(
                managerBalanceBefore.add(ethers.utils.parseEther("100")),
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(0);
            expect(grant.cliffAmount).to.equal(0);
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(0);
            expect(grant.expiration).to.equal(0);
            expect(grant.cliff).to.equal(0);
            expect(grant.latestVotingPower).to.equal(0);
            expect(grant.delegatee).to.equal(ethers.constants.AddressZero);
        });

        it("manager revokes grant and receives remaining unvested tokens", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
            const managerBalanceBefore = await arcdToken.balanceOf(MANAGER_ADDRESS);

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // grant recipient claims tokens after 75% of expiration
            // increase 75% of the way to expiration
            for (let i = 0; i < 149; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // manager revokes grant
            // 75% of tokens are sent to recipient, manager receives remaining 25%
            await vestingVotingVault.connect(MANAGER).revokeGrant(OTHER_ADDRESS);
            const managerBalanceAfter = await arcdToken.balanceOf(MANAGER_ADDRESS);
            expect(managerBalanceAfter.sub(managerBalanceBefore)).to.equal(
                ethers.utils.parseEther("100").sub(ethers.utils.parseEther("75")),
            );

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(0);
            expect(grant2.cliffAmount).to.equal(0);
            expect(grant2.withdrawn).to.equal(0);
            expect(grant2.created).to.equal(0);
            expect(grant2.expiration).to.equal(0);
            expect(grant2.cliff).to.equal(0);
            expect(grant2.latestVotingPower).to.equal(0);
            expect(grant2.delegatee).to.equal(ethers.constants.AddressZero);

            // user cannot claim tokens after grant is revoked
            await expect(vestingVotingVault.connect(OTHER).claim(ethers.utils.parseEther("1"))).to.be.revertedWith(
                `AVV_NoGrantSet()`,
            );

            // check users voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("0"),
            );
        });

        it("non-manager tries to add grant", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // other account tries to add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(OTHER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx).to.be.revertedWith("BVV_NotManager()");
        });

        it("non-manager tries to revoke grant", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // other account tries to add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // other account tries to revoke grant
            const tx = vestingVotingVault.connect(OTHER).revokeGrant(OTHER_ADDRESS);
            await expect(tx).to.be.revertedWith("BVV_NotManager()");
        });

        it("manager tries to revoke grant that does not exist", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            await bootstrapVestingManager();
            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // manager revokes grant non-existent grant
            const tx2 = vestingVotingVault.connect(MANAGER).revokeGrant(OTHER_ADDRESS);
            await expect(tx2).to.be.revertedWith("AVV_NoGrantSet()");
        });
    });

    describe("Grant claiming", () => {
        it("user tries to claim without grant allocated", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const THIRD_PARTY = signers[2];
            const THIRD_PARTY_ADDRESS = signers[2].address;

            await bootstrapVestingManager();

            // manager deposits tokens into the vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            // increase blocks to right before cliff
            for (let i = 0; i < 98; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims before cliff but no tokens are transferred
            const tx2 = vestingVotingVault.connect(THIRD_PARTY).claim(ethers.utils.parseEther("1"));

            await expect(tx2).to.be.revertedWith("AVV_NoGrantSet()");
            expect(await arcdToken.balanceOf(THIRD_PARTY_ADDRESS)).to.equal(0);
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
        });

        it("grant recipient tries to claim before cliff", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens into the vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            // increase blocks to right before cliff
            for (let i = 0; i < 98; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims before cliff but no tokens are transferred
            const tx2 = vestingVotingVault.connect(OTHER).claim(ethers.utils.parseEther("1"));

            await expect(tx2).to.be.revertedWith(`AVV_CliffNotReached(${cliff})`);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(0);
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
        });

        it("grant recipient claims at cliff, and check voting power", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // increase blocks to cliff block
            for (let i = 0; i < 99; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims at cliff
            await vestingVotingVault.connect(OTHER).claim(ethers.utils.parseEther("50"));
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("50"));

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(cliff);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("50"),
            );
        });

        it("recipient claims fraction of total after cliff, then check voting power", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // increase blocks past cliff
            for (let i = 0; i < 101; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after cliff
            const claimable = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            expect(claimable).to.equal(ethers.utils.parseEther("50.5"));
            await vestingVotingVault.connect(OTHER).claim(claimable);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(claimable);

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(claimable);
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(cliff);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("100").sub(claimable));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("100").sub(claimable),
            );
        });

        it("grant recipient claims entire amount after expiration, check voting power", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // increase blocks past expiration
            for (let i = 0; i < 201; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after expiration, all tokens are transferred
            const claimable = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            expect(claimable).to.equal(ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(OTHER).claim(claimable);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(claimable);

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(claimable);
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(cliff);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("0"));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("0"),
            );
        });

        it("grant recipient claims 3 times for entire amount", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // increase blocks past cliff
            for (let i = 0; i < 99; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after cliff 50 tokens are transferred
            await vestingVotingVault.connect(OTHER).claim(ethers.utils.parseEther("50"));
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("50"));

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(cliff);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("50"),
            );

            // increase 75% of the way to expiration
            for (let i = 0; i < 50; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after 75% of the way to expiration 25 tokens are transferred
            const claimable = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            expect(claimable).to.equal(ethers.utils.parseEther("25"));
            await vestingVotingVault.connect(OTHER).claim(claimable);
            const totalClaimed = ethers.utils.parseEther("50").add(claimable);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(totalClaimed);

            const grant3 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant3.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant3.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant3.withdrawn).to.equal(totalClaimed);
            expect(grant3.created).to.equal(grantCreatedBlock);
            expect(grant3.expiration).to.equal(expiration);
            expect(grant3.cliff).to.equal(cliff);
            expect(grant3.latestVotingPower).to.equal(ethers.utils.parseEther("100").sub(totalClaimed));
            expect(grant3.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock2 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock2.number)).to.equal(
                ethers.utils.parseEther("100").sub(totalClaimed),
            );

            // increase 100% of the way to expiration
            for (let i = 0; i < 50; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // get users claimable amount
            const claimable2 = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            // user specifies more than claimable amount
            await expect(
                vestingVotingVault.connect(OTHER).claim(claimable2.add(ethers.utils.parseEther(".01"))),
            ).to.be.revertedWith(`AVV_InsufficientBalance(${claimable2})`);

            // user specifies zero as claimable amount
            await expect(vestingVotingVault.connect(OTHER).claim(0)).to.be.revertedWith("AVV_InvalidAmount()");
            // user claims after cliff all tokens are transferred
            await vestingVotingVault.connect(OTHER).claim(claimable2);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("100"));

            const grant4 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant4.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant4.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant4.withdrawn).to.equal(ethers.utils.parseEther("100"));
            expect(grant4.created).to.equal(grantCreatedBlock);
            expect(grant4.expiration).to.equal(expiration);
            expect(grant4.cliff).to.equal(cliff);
            expect(grant4.latestVotingPower).to.equal(ethers.utils.parseEther("0"));
            expect(grant4.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock3 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock3.number)).to.equal(
                ethers.utils.parseEther("0"),
            );
        });

        it("grant recipient claims less than withdrawable amount", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // increase blocks past cliff
            for (let i = 0; i < 99; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after cliff 50 tokens are transferred
            await vestingVotingVault.connect(OTHER).claim(ethers.utils.parseEther("50"));
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("50"));

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(cliff);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("50"),
            );

            // increase 75% of the way to expiration
            for (let i = 0; i < 49; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after cliff some tokens are transferred (less than total withdrawable amount)
            const claimable = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            await vestingVotingVault.connect(OTHER).claim(claimable.sub(ethers.utils.parseEther("5")));
            const totalClaimed = ethers.utils.parseEther("50").add(claimable.sub(ethers.utils.parseEther("5")));
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(totalClaimed);

            const grant3 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant3.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant3.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant3.withdrawn).to.equal(totalClaimed);
            expect(grant3.created).to.equal(grantCreatedBlock);
            expect(grant3.expiration).to.equal(expiration);
            expect(grant3.cliff).to.equal(cliff);
            expect(grant3.latestVotingPower).to.equal(ethers.utils.parseEther("100").sub(totalClaimed));
            expect(grant3.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock2 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock2.number)).to.equal(
                ethers.utils.parseEther("100").sub(totalClaimed),
            );

            // increase 100% of the way to expiration
            for (let i = 0; i < 50; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // get users claimable amount
            const claimable2 = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            // user specifies more than claimable amount
            await expect(
                vestingVotingVault.connect(OTHER).claim(claimable2.add(ethers.utils.parseEther(".01"))),
            ).to.be.revertedWith(`AVV_InsufficientBalance(${claimable2})`);

            // user specifies zero as claimable amount
            await expect(vestingVotingVault.connect(OTHER).claim(0)).to.be.revertedWith("AVV_InvalidAmount()");
            // user claims after cliff all tokens are transferred
            await vestingVotingVault.connect(OTHER).claim(claimable2);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("100"));

            const grant4 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant4.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant4.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant4.withdrawn).to.equal(ethers.utils.parseEther("100"));
            expect(grant4.created).to.equal(grantCreatedBlock);
            expect(grant4.expiration).to.equal(expiration);
            expect(grant4.cliff).to.equal(cliff);
            expect(grant4.latestVotingPower).to.equal(ethers.utils.parseEther("0"));
            expect(grant4.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock3 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock3.number)).to.equal(
                ethers.utils.parseEther("0"),
            );
        });

        it("cliff is equal to start time", async function () {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                grantCreatedBlock, // start time is current block
                expiration,
                grantCreatedBlock,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(grantCreatedBlock);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // user claims immediately, cliff amount is transferred
            const claimable = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            expect(claimable).to.equal(ethers.utils.parseEther("50"));
            await vestingVotingVault.connect(OTHER).claim(claimable);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(claimable);

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(claimable);
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(grantCreatedBlock);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("100").sub(claimable));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("100").sub(claimable),
            );

            // user claims the remaining tokens after expiration
            // increase blocks past cliff
            for (let i = 0; i < 200; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            const claimable2 = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            await vestingVotingVault.connect(OTHER).claim(claimable2);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(claimable.add(claimable2));
            expect(claimable2).to.equal(ethers.utils.parseEther("50"));

            const grant3 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant3.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant3.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant3.withdrawn).to.equal(claimable.add(claimable2));
            expect(grant3.created).to.equal(grantCreatedBlock);
            expect(grant3.expiration).to.equal(expiration);
            expect(grant3.cliff).to.equal(grantCreatedBlock);
            expect(grant3.latestVotingPower).to.equal(0);
            expect(grant3.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock2 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock2.number)).to.equal(0);
        });

        it("Amount specified to withdraw is less than cliff amount", async function () {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // increase blocks to cliff
            for (let i = 0; i < 100; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims fraction of cliff amount
            const claimable = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            expect(claimable).to.equal(ethers.utils.parseEther("50"));
            await vestingVotingVault.connect(OTHER).claim(claimable.div(2));
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(claimable.div(2));

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(claimable.div(2));
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(cliff);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("100").sub(claimable.div(2)));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("100").sub(claimable.div(2)),
            );

            // user claims remaining cliff amount 10 blocks later
            for (let i = 0; i < 10; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            const claimable2 = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            expect(claimable2).to.equal(ethers.utils.parseEther("30.5"));
            // claims second half of cliff amount
            await vestingVotingVault.connect(OTHER).claim(ethers.utils.parseEther("25"));
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("50"));

            const grant3 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant3.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant3.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant3.withdrawn).to.equal(ethers.utils.parseEther("50"));
            expect(grant3.created).to.equal(grantCreatedBlock);
            expect(grant3.expiration).to.equal(expiration);
            expect(grant3.cliff).to.equal(cliff);
            expect(grant3.latestVotingPower).to.equal(
                ethers.utils.parseEther("100").sub(ethers.utils.parseEther("50")),
            );
            expect(grant3.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock2 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock2.number)).to.equal(
                ethers.utils.parseEther("100").sub(ethers.utils.parseEther("50")),
            );

            // user claims entire remaining withdrawable amount 90 blocks later
            for (let i = 0; i < 90; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            const claimable3 = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            expect(claimable3).to.equal(ethers.utils.parseEther("50"));
            await vestingVotingVault.connect(OTHER).claim(claimable3);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("100"));

            const grant4 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant4.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant4.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant4.withdrawn).to.equal(ethers.utils.parseEther("100"));
            expect(grant4.created).to.equal(grantCreatedBlock);
            expect(grant4.expiration).to.equal(expiration);
            expect(grant4.cliff).to.equal(cliff);
            expect(grant4.latestVotingPower).to.equal(ethers.utils.parseEther("0"));
            expect(grant4.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock3 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock3.number)).to.equal(
                ethers.utils.parseEther("0"),
            );
        });
    });

    describe("Voting power delegation", function () {
        it("User changes vote delegation", async function () {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // get grant
            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("100"),
            );

            // user changes vote delegation
            await vestingVotingVault.connect(OTHER).delegate(signers[2].address);
            const checkBlock2 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock2.number)).to.equal(
                ethers.utils.parseEther("0"),
            );
            expect(await vestingVotingVault.queryVotePowerView(signers[2].address, checkBlock2.number)).to.equal(
                ethers.utils.parseEther("100"),
            );
        });

        it("User changes vote delegation to same account", async function () {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // user changes vote delegation to same account already delegated to
            const tx2 = vestingVotingVault.connect(OTHER).delegate(OTHER_ADDRESS);
            await expect(tx2).to.be.revertedWith("AVV_AlreadyDelegated()");
        });
    });

    describe("Voting on proposal", function () {
        it("User executes vote via vesting vault voting power", async function () {
            const { signers, vestingVotingVault, coreVoting, feeController, votingVaults, increaseBlockNumber } =
                ctxGovernance;
            const { arcdToken, bootstrapVestingManager } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];
            const zeroExtraData = ["0x", "0x", "0x", "0x"];
            const MAX = ethers.constants.MaxUint256;

            await bootstrapVestingManager();

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // create proposal to update V2 originationFee
            const newFee = 60;
            const targetAddress = [feeController.address];
            // create an interface to access feeController abi
            const fcFactory = await ethers.getContractFactory("FeeController");
            // encode function signature and new fee amount to pass in proposal
            const feeContCalldata = fcFactory.interface.encodeFunctionData("setOriginationFee", [newFee]);

            // signer holding enough voting power for proposal creation creates proposal
            await coreVoting
                .connect(OTHER)
                .proposal([votingVaults[2]], zeroExtraData, targetAddress, [feeContCalldata], MAX, 0);

            // vote on proposal
            await coreVoting.connect(OTHER).vote([votingVaults[2]], ["0x"], 0, 0); // yes vote

            // increase blockNumber to exceed 3 day default lock duration set in coreVoting
            await increaseBlockNumber(provider, 19488);

            // proposal execution
            await coreVoting.connect(OTHER).execute(0, targetAddress, [feeContCalldata]);
            const originationFee = await feeController.getOriginationFee();
            expect(originationFee).to.equal(newFee);
        });
    });

    describe("Reentrancy protection", async () => {
        it("Reverts when user tries to reenter", async () => {
            const { signers } = ctxGovernance;
            // deploy reentrancy contract
            const MockERC20RFactory = await ethers.getContractFactory("MockERC20Reentrancy");
            const mockERC20R = await MockERC20RFactory.deploy();
            await mockERC20R.deployed();
            // deploy the ARCDVestingVault contract
            const ARCDVestingFactory = await ethers.getContractFactory("ARCDVestingVault");
            const vestingVault = await ARCDVestingFactory.deploy(
                mockERC20R.address, // token
                10, // stale block lag
                signers[1].address, // manager
                signers[1].address, // timelock
            );
            await vestingVault.deployed();

            // set vesting vault address in mockERC20R
            await mockERC20R.setVesting(vestingVault.address);

            // manager deposits tokens in vesting contract
            await mockERC20R.connect(signers[0]).mint(signers[1].address, ethers.utils.parseEther("1000000"));
            expect(await mockERC20R.balanceOf(signers[1].address)).to.equal(ethers.utils.parseEther("1000000"));
            await mockERC20R.connect(signers[1]).approve(vestingVault.address, ethers.utils.parseEther("1000000"));
            await vestingVault.connect(signers[1]).deposit(ethers.utils.parseEther("1000000"));

            // manager adds grant for signers[3] (random user)
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVault.connect(signers[1]).addGrantAndDelegate(
                signers[3].address, // recipient
                ethers.utils.parseEther("1000000"), // grant amount
                ethers.utils.parseEther("500000"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                signers[3].address, // voting power delegate
            );

            // increase blocks to cliff
            for (let i = 0; i < 100; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims fraction of cliff amount and token tries to reenter
            const claimable = await vestingVault.connect(signers[3]).claimable(signers[3].address);
            expect(claimable).to.equal(ethers.utils.parseEther("500000"));
            await expect(vestingVault.connect(signers[3]).claim(claimable.div(2))).to.be.revertedWith("REENTRANCY");
        });
    });
});
