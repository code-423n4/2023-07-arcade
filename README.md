# ✨ Arcade.xyz audit details
- Total Prize Pool: $90,500 USDC
  - HM awards: $61,875 USDC
  - Analysis awards: $3,750 USDC
  - QA awards: $1,875 USDC
  - Bot Race awards: $5,625 USDC
  - Gas awards: $1,875 USDC
  - Judge awards: $9,000 USDC
  - Lookout awards: $6,000 USDC
  - Scout awards: $500 USDC
- Join [C4 Discord](https://discord.gg/code4rena) to register
- Submit findings [using the C4 form](https://code4rena.com/contests/2023-07-arcade/submit)
- [Read our guidelines for more details](https://docs.code4rena.com/roles/wardens)
- Starts July 21, 2023 20:00 UTC
- Ends July 28, 2023 20:00 UTC

## Automated Findings / Publicly Known Issues

Automated findings output for the audit can be found [here](slither/FullReport.md).

Full audit report can be found [here](audits/).

*Note for C4 wardens: Anything included in the automated findings output is considered a publicly known issue and is ineligible for awards.*

# Overview

[Arcade.xyz](https://docs.arcade.xyz/docs/faq) is a platform for autonomous borrowing, lending, and escrow of NFT collateral on EVM blockchains. This repository contains the contracts for a token-based governance system, which can be granted ownership and management authority over the core lending protocol. This governance system is built on the [Council Framework](https://docs.element.fi/governance-council/council-protocol-overview).

### ___See natspec for technical detail.___

The Arcade governance system's smart contracts can be grouped into the following categories:

- __Voting Vaults__: Depositories for voting tokens in the governance system - see [Council's documentation](https://docs.element.fi/governance-council/council-protocol-overview/voting-vaults) for more general information. Each voting vault contract is a separate deployment, which handles its own deposits and vote-counting mechanisms for those deposits. As described below, the Arcade.xyz uses novel vote-counting mechanisms. Voting vaults also support vote delegation: a critical component of the Council governance system.
- __Core Voting Contracts__: These contracts can be used to submit and vote on proposed governance transactions. When governing a protocol, core voting contracts may either administrate the protocol directly, or may be intermediated by a Timelock contract.
- __Token__: The ERC20 governance token, along with contracts required for initial deployment and distribution of the token (airdrop contract, initial distributor contract).
- __NFT__: The ERC1155 token contract along with its tokenURI descriptor contract. The ERC1155 token used in governance to give a multiplier to a user's voting power.


### Contract Table of Contents:

* Voting Vaults:
    * BaseVotingVault
    * ArcadeGSCVotingVault
    * ARCDVestingVault
    * ImmutableVestingVault

* Core Voting Contracts
    * CoreVoting
    * ArcadeGSCCoreVoting
    * Timelock

*  Token Contracts
    * ArcadeToken
    * ArcadeTokenDistributor
    * ArcadeAirdrop
    * ArcadeTreasury

*  NFT
    * BadgeDescriptor
    * ReputationBadge


# Scope

| Contract | SLOC | Purpose | Libraries used |
| ----------- | ----------- | ----------- | ----------- |
| [ArcadeGSCCoreVoting.sol](contracts/ArcadeGSCCoreVoting.sol) | 11 | An instance of Council's `CoreVoting`, to be used by a GSC vault. | N/A |
| [ArcadeTreasury.sol](contracts/ArcadeTreasury.sol) | 170 | A contract which can receive tokens from the distributor, and transfers or approves them based on invocations from governance.<br><br>The GSC may be authorized to spend smaller amounts from their own voting contract: all other amounts must be authorized by full community votes. | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| [BaseVotingVault.sol](contracts/BaseVotingVault.sol) | 61 | A basic `VotingVault` implementation, with little extension from Council. Defines common query and management interfaces for all voting vaults. Unlike Council, Arcade governance voting vaults are not upgradeable. | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| [ARCDVestingVault.sol](contracts/ARCDVestingVault.sol) | 161 | A voting vault, designed for early Arcade team members, contributors, and dev partners, that holds tokens in escrow subject to a vesting timeline. Both locked and unlocked tokens held by the vault contribute governance voting power. Since locked tokens are held by the `ARCDVestingVault`, they are not eligible for NFT boosts. | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| [ImmutableVestingVault.sol](contracts/ImmutableVestingVault.sol) | 14 | An instance of the `ARCDVestingVault`, with functionality extended such that `revokeGrant` cannot be used. Tokens held in this vault otherwise have the same voting power and liquidity constraints as ones held by `ARCDVestingVault`. This voting vault is going to be used to hold investor and early launch partner token allocations. | N/A |
| [NFTBoostVault.sol](contracts/NFTBoostVault.sol) | 287 | The core community voting vault for governance: it enables token-weighted vote counting with delegation and an NFT "boost". Token holders can deposit or withdraw into the vault to register voting power, with no liquidity restrictions. Each token deposited represents a unit of voting power. In addition, the NFT boost allows certain ERC1155 assets to receive "multipliers": when users deposit those NFTs, the voting power of their deposited ERC20 tokens are boosted by multiplier. In addition to adding tokens and an NFT at deposit time, both components of the deposit can be managed separately: NFTs can be added, updated, or withdrawn separately, and a user can add or remove tokens from an NFT boosted position.<br><br>At any time, governance may update the multiplier value associated with a given NFT. Due to gas constraints, this will not immediately update the voting power of users who are using this NFT for a boost. However, any user's voting power can be updated by any other user via the `updateVotingPower` function - this value will look up the current multiplier of the user's registered NFT and recalculate the boosted voting power. This can be used in cases where obselete boosts may be influencing the outcome of a vote. | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| [ArcadeGSCVault.sol](contracts/ArcadeGSCVault.sol) | 9 | An instance of Council's `GSCVault`, a voting vault contract for a [Governance Steering Council](https://docs.element.fi/governance-council/council-protocol-overview/governance-steering-council). See Council documentation for more information. | N/A |
| [ArcadeAirdrop.sol](contracts/token/ArcadeAirdrop.sol) | 29 | A contract which can receive tokens and release them according to a merkle root stored in the contract. Governance may set a merkle root, and users can claim tokens by proving ownership in the associated merkle tree.<br><br>Unclaimed tokens after a set `expiration` time may be reclaimed by governance. | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| [ArcadeToken.sol](contracts/token/ArcadeToken.sol) | 49 | A standard OpenZeppelin based `ERC20` token, with minting capability. At deploy time, an initial amount of circulating tokens are minted to a distributor contract (see `ArcadeTokenDistributor`).<br><br>Governance is given ownership of the token on deployment, and every 365 days, governance may decide to call the `mint` function to mint new tokens. The ability to call `mint` is granted by governance to a single address. When calling `mint`, governance may mint up to 2% of the total supply. After calling, `mint`, it may not be called again for 365 days. | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| [ArcadeTokenDistributor.sol](contracts/token/ArcadeTokenDistributor.sol) | 69 | A contract which receives the initial circulating supply of token, and will send tokens to destinations representing distribution according to tokenomics. This may include airdrop contracts or vesting vaults. | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| [ReputationBadge.sol](contracts/nft/ReputationBadge.sol) | 100 |  Reputation badges are ERC1155 tokens that can be minted by users who meets certain criteria. For example, a user who has completed a certain number of tasks can be awarded a badge. The badge can be used in governance to give a multiplier to a user's voting power. Voting power multipliers associated with each tokenId are stored in the governance vault contracts not the badge contract.<br><br>This contract uses a merkle trie to determine which users are eligible to mint a badge. Only the manager of the contract can update the merkle roots and claim expirations. Additionally, there is an optional mint price which can be set and claimed by the manager. | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |
| [BadgeDescriptor.sol](contracts/nft/BadgeDescriptor.sol) | 19 | Basic descriptor contract for badge NFTs, that uses a baseURI, and returns a tokenURI for the requested token ID. | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) |


## Out of scope

* `contracts/external/` contain dependency contracts and should not be in scope - think of it as `lib/`. There are contracts - principally `CoreVoting.sol`, `Timelock.sol` and `GSCVault.sol` - that we integrate with. Having copies of their on-chain code in the repo was useful. However, if one of the contracts that is in-scope is not calling these external contracts properly or produce edge cases where these external contracts to produce bugs or unexpected behavior, these submissions will be reviewed for possible bounty.

* `contracts/test/` contains mock contracts for testing purposes and should not need to be looked at, except obviously within the context of reviewing the tests.

# Additional Context: Privileged Roles & Access

* Vaults derived from the `BaseVotingVault` have two roles:
    * A `manager` role can access operational functions,
        such as calling `setMultiplier` in the `NFTBoostVault`,
        and calling `addGrantAndDelegate` and `revokeGrant`
        in the `ARCDVestingVault`.
    * A `timelock` role can change the `manager`, as well as changing
        its own role to a new timelock. For the `NFTBoostVault`, the
        timelock can eventually choose to allow token withdrawals.
* Core voting contracts have an `owner`, which in a governance
    system should be a timelock that is owned by `CoreVoting` itself:
    such that all updates to `CoreVoting` require passing votes. This
    `owner` is able to change parameters around voting, such as the
    minimum voting power needed to submit a proposal. The same suggested
    ownership architecture applies to `ArcadeGSCCoreVoting`: it should
    have ownership power over a separate timelock, which itself owns
    the voting contract.
* The `ArcadeToken` contract sets a `minter` role, which can mint new tokens
    under certain constraints (see `ArcadeToken` above). The `minter`
    can also transfer the role to another address.
* The `ArcadeAirdrop` contract as an `owner` that can update the merkle root,
    as well as reclaim tokens after airdrop expiry. This should be operationally
    managed by a voting contract.
* The `ArcadeTokenDistributor` contract is owned by an address which can administer
    the distribution. This owner may decide which address receives their reserved
    amount of tokens.
* The `Treasury` contract grants permissions to addresses who are allowed
    to spend tokens. There are separate roles for full spends, which should be granted
    to a community voting contract, and GSC spends, which may be granted to a community
    voting contract. Ownership may also be granted to timelocks owned by the respective
    voting contracts.

## Scoping Details
```
- If you have a public code repo, please share it here: No public repo
- How many contracts are in scope?:   12
- Total SLoC for these contracts?:  2282
- How many external imports are there?: 3
- How many separate interfaces and struct definitions are there for the contracts within scope?: 8
- Does most of your code generally use composition or inheritance?:  Inheritance
- How many external calls?:   0
- What is the overall line coverage percentage provided by your tests?: 99%
- Is this an upgrade of an existing system?: False
- Check all that apply: Timelock function, NFT, ERC-20 Token
- Is there a need to understand a separate part of the codebase / get context in order to audit this part of the protocol?:   False
- Please describe required context:   n/a
- Does it use an oracle?:  No
- Describe any novel or unique curve logic or mathematical models your code uses: No unique logic
- Is this either a fork of or an alternate implementation of another project?: False
- Does it use a side-chain?: False
- Describe any specific areas you would like addressed: Custom storage system pointers are not overwritten. Re-entrancy is blocked w.r.t the custom storage system.
```

# Tests

#### Pre Requisites

Before running any command, make sure to install dependencies:

```sh
$ yarn install
```

#### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

#### Lint

Lint the code:

```sh
$ yarn lint
```

#### Test

Run the Mocha tests:

```sh
$ yarn test
```

#### Coverage

Generate the code coverage report:

```sh
$ yarn coverage
```

#### Report Gas

See the gas usage per unit test and average gas per method call:

```sh
$ REPORT_GAS=true yarn test
```

#### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
$ yarn clean
```

# Scripts

Deploy the contracts, set up roles and permissions, perform contract verification:

* Note before deploying verify the `deployment-params.ts` file has be updated with the appropriate addresses.

```sh
$ yarn clean && yarn compile && npx hardhat test scripts/deploy/test/e2e.ts --network <network>
```


