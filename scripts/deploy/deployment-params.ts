import { ethers } from "hardhat";

export const ADMIN_ADDRESS = "0x6c6F915B21d43107d83c47541e5D29e872d82Da6"; // deployer wallet

export const DISTRIBUTION_MULTISIG = "0x0a606524006a48C4D93662aA935AEC203CaC98C1";
export const TEAM_VESTING_VAULT_MANAGER = "0x6c6F915B21d43107d83c47541e5D29e872d82Da6";
export const NFT_BOOST_VAULT_MANAGER = "0x6c6F915B21d43107d83c47541e5D29e872d82Da6";

export const TIMELOCK_WAIT_TIME = 19488; // ~3 days in blocks (3 days allows for a grace period that is longer than a weekend)
export const GSC_MIN_LOCK_DURATION = 2165; // ~8 hours in blocks

export const BASE_QUORUM = "1500000"; // default quorum for a vote to pass through standard core voting contract
export const MIN_PROPOSAL_POWER_CORE_VOTING = "20000"; // minimum proposal power

export const BASE_QUORUM_GSC = 3; // default GSC quorum for a vote to pass, each GSC member has 1 vote
export const MIN_PROPOSAL_POWER_GSC = 1; // minimum GSC proposal power, this is 1 so any GSC member can propose
export const GSC_THRESHOLD = "150000"; // GSC threshold, (minimum voting power needed to be a GSC member)

export const STALE_BLOCK_LAG = 200000; // number of blocks before voting power is pruned. 200000 blocks is ~1 month. Needs to be more than a standard voting period.

export const AIRDROP_EXPIRATION = 1697572386; // ~3 months, unix timestamp for airdrop expiration
export const AIRDROP_MERKLE_ROOT = ethers.constants.HashZero; // change to actual merkle root

export const BADGE_DESCRIPTOR_BASE_URI = "https://arcade.xyz/"; // base uri for badge descriptors

export const REPUTATION_BADGE_ADMIN = "0x6c6F915B21d43107d83c47541e5D29e872d82Da6"; // CANNOT BE SAME AS REP BADGE MANAGER!
export const REPUTATION_BADGE_MANAGER = "0x6c6F915B21d43107d83c47541e5D29e872d82Da6";
export const REPUTATION_BADGE_RESOURCE_MANAGER = "0x6c6F915B21d43107d83c47541e5D29e872d82Da6";
