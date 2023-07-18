import { expect } from "chai";
import { ethers } from "hardhat";

import { ImmutableVestingVault } from "../src/types";
import { TestContextGovernance, governanceFixture } from "./utils/governanceFixture";
import { TestContextToken, tokenFixture } from "./utils/tokenFixture";

const { loadFixture } = waffle;

/**
 * Test suite for the ImmutableVestingVault contract.
 */
describe("Immutable vesting vault", function () {
    let ctxToken: TestContextToken;
    let ctxGovernance: TestContextGovernance;
    let fixtureToken: () => Promise<TestContextToken>;
    let fixtureGov: () => Promise<TestContextGovernance>;

    let immutableVestingVault: ImmutableVestingVault;

    beforeEach(async function () {
        // load the governance and token fixtures
        fixtureToken = await tokenFixture();
        ctxToken = await loadFixture(fixtureToken);

        fixtureGov = await governanceFixture(ctxToken.arcdToken);
        ctxGovernance = await loadFixture(fixtureGov);

        // deploy the immutable vesting vault
        const ImmutableVestingVault = await ethers.getContractFactory("ImmutableVestingVault");
        immutableVestingVault = await ImmutableVestingVault.deploy(
            ctxToken.arcdToken.address,
            ctxToken.staleBlockNum,
            ctxGovernance.signers[1].address,
            ctxGovernance.signers[2].address,
        );
    });

    it("should block the manager from revoking a grant", async function () {
        const { signers } = ctxGovernance;
        const { arcdToken, bootstrapVestingManager } = ctxToken;
        const MANAGER = signers[1];
        const MANAGER_ADDRESS = signers[1].address;
        const OTHER_ADDRESS = signers[0].address;

        // get manager some tokens
        await bootstrapVestingManager();

        // manager deposits tokens
        await arcdToken.connect(MANAGER).approve(immutableVestingVault.address, ethers.utils.parseEther("100"));
        await immutableVestingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
        expect(await arcdToken.balanceOf(immutableVestingVault.address)).to.equal(ethers.utils.parseEther("100"));

        // add grant with delegate as grant recipient
        const currentTime = await ethers.provider.getBlock("latest");
        const currentBlock = currentTime.number;
        const grantCreatedBlock = currentBlock + 1; // 1 block in the future
        const cliff = grantCreatedBlock + 100; // 100 blocks in the future
        const expiration = grantCreatedBlock + 200; // 200 blocks in the future
        await immutableVestingVault.connect(MANAGER).addGrantAndDelegate(
            OTHER_ADDRESS, // recipient
            ethers.utils.parseEther("100"), // grant amount
            ethers.utils.parseEther("50"), // cliff unlock amount
            0, // start time is after or equal to expiration
            expiration,
            cliff,
            ethers.constants.AddressZero, // pass in zero to delegate to grant recipient
        );

        // get grant
        const grant = await immutableVestingVault.getGrant(OTHER_ADDRESS);
        expect(grant.delegatee).to.equal(OTHER_ADDRESS);

        // manager attempts to revoke grant
        await expect(immutableVestingVault.connect(MANAGER).revokeGrant(OTHER_ADDRESS)).to.be.revertedWith(
            "IVV_ImmutableGrants()",
        );
    });
});
