**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results. Summary

-   [arbitrary-send-eth](#arbitrary-send-eth) (2 results) (High)
-   [unchecked-transfer](#unchecked-transfer) (5 results) (High)
-   [incorrect-equality](#incorrect-equality) (2 results) (Medium)
-   [reentrancy-no-eth](#reentrancy-no-eth) (5 results) (Medium)
-   [uninitialized-local](#uninitialized-local) (1 results) (Medium)
-   [unused-return](#unused-return) (3 results) (Medium)
-   [shadowing-local](#shadowing-local) (9 results) (Low)
-   [events-access](#events-access) (1 results) (Low)
-   [events-maths](#events-maths) (1 results) (Low)
-   [missing-zero-check](#missing-zero-check) (1 results) (Low)
-   [calls-loop](#calls-loop) (8 results) (Low)
-   [reentrancy-benign](#reentrancy-benign) (3 results) (Low)
-   [reentrancy-events](#reentrancy-events) (12 results) (Low)
-   [timestamp](#timestamp) (14 results) (Low)
-   [assembly](#assembly) (16 results) (Informational)
-   [boolean-equal](#boolean-equal) (2 results) (Informational)
-   [dead-code](#dead-code) (3 results) (Informational)
-   [solc-version](#solc-version) (13 results) (Informational)
-   [low-level-calls](#low-level-calls) (3 results) (Informational)
-   [naming-convention](#naming-convention) (20 results) (Informational)
-   [reentrancy-unlimited-gas](#reentrancy-unlimited-gas) (2 results) (Informational)
-   [too-many-digits](#too-many-digits) (5 results) (Informational)
-   [immutable-states](#immutable-states) (3 results) (Optimization)

## arbitrary-send-eth

Impact: High Confidence: Medium

- [ ] ID-0 [ArcadeTreasury.\_spend(address,uint256,address,uint256)](contracts/ArcadeTreasury.sol#L358-L373) sends eth
        to arbitrary user Dangerous calls: - [address(destination).transfer(amount)](contracts/ArcadeTreasury.sol#L367)

contracts/ArcadeTreasury.sol#L358-L373

- [ ] ID-1 [ReputationBadge.withdrawFees(address)](contracts/nft/ReputationBadge.sol#L163-L174) sends eth to arbitrary
        user Dangerous calls: - [address(recipient).transfer(balance)](contracts/nft/ReputationBadge.sol#L171)

contracts/nft/ReputationBadge.sol#L163-L174

## unchecked-transfer

Impact: High Confidence: Medium

- [ ] ID-2 [ARCDVestingVault.deposit(uint256)](contracts/ARCDVestingVault.sol#L197-L202) ignores return value by
        [token.transferFrom(msg.sender,address(this),amount)](contracts/ARCDVestingVault.sol#L201)

contracts/ARCDVestingVault.sol#L197-L202

- [ ] ID-3 [AbstractLockingVault.withdraw(uint256)](contracts/external/council/vaults/LockingVault.sol#L153-L171)
        ignores return value by
        [token.transfer(msg.sender,amount)](contracts/external/council/vaults/LockingVault.sol#L170)

contracts/external/council/vaults/LockingVault.sol#L153-L171

- [ ] ID-4
        [AbstractLockingVault.deposit(address,uint256,address)](contracts/external/council/vaults/LockingVault.sol#L113-L149)
        ignores return value by
        [token.transferFrom(msg.sender,address(this),amount)](contracts/external/council/vaults/LockingVault.sol#L122)

contracts/external/council/vaults/LockingVault.sol#L113-L149

- [ ] ID-5
        [NFTBoostVault.\_lockTokens(address,uint256,address,uint128,uint128)](contracts/NFTBoostVault.sol#L650-L662)
        ignores return value by [token.transferFrom(from,address(this),amount)](contracts/NFTBoostVault.sol#L657)

contracts/NFTBoostVault.sol#L650-L662

- [ ] ID-6
        [AbstractMerkleRewards.claim(uint256,uint256,bytes32[],address)](contracts/external/council/libraries/MerkleRewards.sol#L62-L72)
        ignores return value by
        [token.transfer(destination,amount)](contracts/external/council/libraries/MerkleRewards.sol#L71)

contracts/external/council/libraries/MerkleRewards.sol#L62-L72

## incorrect-equality

Impact: Medium Confidence: High

- [ ] ID-7
        [History.push(History.HistoricalBalances,address,uint256)](contracts/external/council/libraries/History.sol#L71-L120)
        uses a dangerous strict equality: -
        [loadedBlockNumber == block.number](contracts/external/council/libraries/History.sol#L100)

contracts/external/council/libraries/History.sol#L71-L120

- [ ] ID-8 [ARCDVestingVault.claim(uint256)](contracts/ARCDVestingVault.sol#L228-L253) uses a dangerous strict
        equality: - [amount == withdrawable](contracts/ARCDVestingVault.sol#L241)

contracts/ARCDVestingVault.sol#L228-L253

## reentrancy-no-eth

Impact: Medium Confidence: Medium

- [ ] ID-9 Reentrancy in
        [Timelock.execute(address[],bytes[])](contracts/external/council/features/Timelock.sol#L56-L80): External
        calls: - [(success) = targets[i].call(calldatas[i])](contracts/external/council/features/Timelock.sol#L73) State
        variables written after the call(s): -
        [delete callTimestamps[callHash]](contracts/external/council/features/Timelock.sol#L78)
        [Timelock.callTimestamps](contracts/external/council/features/Timelock.sol#L15) can be used in cross function
        reentrancies: - [Timelock.callTimestamps](contracts/external/council/features/Timelock.sol#L15) -
        [Timelock.increaseTime(uint256,bytes32)](contracts/external/council/features/Timelock.sol#L93-L109) -
        [Timelock.registerCall(bytes32)](contracts/external/council/features/Timelock.sol#L35-L40) -
        [Timelock.stopCall(bytes32)](contracts/external/council/features/Timelock.sol#L44-L51)

contracts/external/council/features/Timelock.sol#L56-L80

- [ ] ID-10 Reentrancy in
        [CoreVoting.proposal(address[],bytes[],address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L132-L205):
        External calls: -
        [votingPower = vote(votingVaults,extraVaultData,proposalCount,ballot)](contracts/external/council/CoreVoting.sol#L183-L184) -
        [votingPower += uint128(IVotingVault(votingVaults[i]).queryVotePower(msg.sender,proposals[proposalId].created,extraVaultData[i]))](contracts/external/council/CoreVoting.sol#L233-L239)
        State variables written after the call(s): -
        [proposalCount += 1](contracts/external/council/CoreVoting.sol#L204)
        [CoreVoting.proposalCount](contracts/external/council/CoreVoting.sol#L30) can be used in cross function
        reentrancies: -
        [CoreVoting.proposal(address[],bytes[],address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L132-L205) -
        [CoreVoting.proposalCount](contracts/external/council/CoreVoting.sol#L30)

contracts/external/council/CoreVoting.sol#L132-L205

- [ ] ID-11 Reentrancy in
        [CoreVoting.vote(address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L215-L257):
        External calls: -
        [votingPower += uint128(IVotingVault(votingVaults[i]).queryVotePower(msg.sender,proposals[proposalId].created,extraVaultData[i]))](contracts/external/council/CoreVoting.sol#L233-L239)
        State variables written after the call(s): -
        [proposals[proposalId].votingPower[uint256(votes[msg.sender][proposalId].castBallot)] -= votes[msg.sender][proposalId].votingPower](contracts/external/council/CoreVoting.sol#L245-L247)
        [CoreVoting.proposals](contracts/external/council/CoreVoting.sol#L58) can be used in cross function
        reentrancies: -
        [CoreVoting.getProposalVotingPower(uint256)](contracts/external/council/CoreVoting.sol#L313-L319) -
        [CoreVoting.proposal(address[],bytes[],address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L132-L205) -
        [CoreVoting.proposals](contracts/external/council/CoreVoting.sol#L58) -
        [CoreVoting.vote(address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L215-L257) -
        [proposals[proposalId].votingPower[uint256(ballot)] += votingPower](contracts/external/council/CoreVoting.sol#L251)
        [CoreVoting.proposals](contracts/external/council/CoreVoting.sol#L58) can be used in cross function
        reentrancies: -
        [CoreVoting.getProposalVotingPower(uint256)](contracts/external/council/CoreVoting.sol#L313-L319) -
        [CoreVoting.proposal(address[],bytes[],address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L132-L205) -
        [CoreVoting.proposals](contracts/external/council/CoreVoting.sol#L58) -
        [CoreVoting.vote(address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L215-L257)

contracts/external/council/CoreVoting.sol#L215-L257

- [ ] ID-12 Reentrancy in
        [CoreVoting.execute(uint256,address[],bytes[])](contracts/external/council/CoreVoting.sol#L263-L309): External
        calls: - [(success) = targets[i].call(calldatas[i])](contracts/external/council/CoreVoting.sol#L298) State
        variables written after the call(s): -
        [delete proposals[proposalId]](contracts/external/council/CoreVoting.sol#L308)
        [CoreVoting.proposals](contracts/external/council/CoreVoting.sol#L58) can be used in cross function
        reentrancies: -
        [CoreVoting.getProposalVotingPower(uint256)](contracts/external/council/CoreVoting.sol#L313-L319) -
        [CoreVoting.proposal(address[],bytes[],address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L132-L205) -
        [CoreVoting.proposals](contracts/external/council/CoreVoting.sol#L58) -
        [CoreVoting.vote(address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L215-L257)

contracts/external/council/CoreVoting.sol#L263-L309

- [ ] ID-13 Reentrancy in [GSCVault.kick(address,bytes[])](contracts/external/council/vaults/GSCVault.sol#L110-L138):
        External calls: -
        [votes = IVotingVault(votingVaults[i]).queryVotePower(who,block.number - 1,extraData[i])](contracts/external/council/vaults/GSCVault.sol#L122-L127)
        State variables written after the call(s): -
        [delete members[who]](contracts/external/council/vaults/GSCVault.sol#L135)
        [GSCVault.members](contracts/external/council/vaults/GSCVault.sol#L17) can be used in cross function
        reentrancies: - [GSCVault.getUserVaults(address)](contracts/external/council/vaults/GSCVault.sol#L171-L173) -
        [GSCVault.kick(address,bytes[])](contracts/external/council/vaults/GSCVault.sol#L110-L138) -
        [GSCVault.members](contracts/external/council/vaults/GSCVault.sol#L17) -
        [GSCVault.proveMembership(address[],bytes[])](contracts/external/council/vaults/GSCVault.sol#L56-L102) -
        [GSCVault.queryVotePower(address,uint256,bytes)](contracts/external/council/vaults/GSCVault.sol#L145-L167)

contracts/external/council/vaults/GSCVault.sol#L110-L138

## uninitialized-local

Impact: Medium Confidence: Medium

- [ ] ID-14
        [CoreVoting.proposal(address[],bytes[],address[],bytes[],uint256,CoreVoting.Ballot).quorum](contracts/external/council/CoreVoting.sol#L149)
        is a local variable never initialized

contracts/external/council/CoreVoting.sol#L149

## unused-return

Impact: Medium Confidence: Medium

- [ ] ID-15 [ArcadeTreasury.\_approve(address,address,uint256,uint256)](contracts/ArcadeTreasury.sol#L384-L394)
        ignores return value by [IERC20(token).approve(spender,amount)](contracts/ArcadeTreasury.sol#L391)

contracts/ArcadeTreasury.sol#L384-L394

- [ ] ID-16
        [ArcadeMerkleRewards.claimAndDelegate(address,uint128,bytes32[])](contracts/libraries/ArcadeMerkleRewards.sol#L77-L89)
        ignores return value by
        [token.approve(address(votingVault),uint256(totalGrant))](contracts/libraries/ArcadeMerkleRewards.sol#L86)

contracts/libraries/ArcadeMerkleRewards.sol#L77-L89

- [ ] ID-17
        [AbstractMerkleRewards.constructor(bytes32,IERC20,ILockingVault)](contracts/external/council/libraries/MerkleRewards.sol#L23-L33)
        ignores return value by
        [\_token.approve(address(lockingVault),type()(uint256).max)](contracts/external/council/libraries/MerkleRewards.sol#L32)

contracts/external/council/libraries/MerkleRewards.sol#L23-L33

## shadowing-local

Impact: Low Confidence: High

- [ ] ID-18
        [ArcadeGSCCoreVoting.constructor(address,uint256,uint256,address,address[]).baseQuorum](contracts/ArcadeGSCCoreVoting.sol#L28)
        shadows: - [CoreVoting.baseQuorum](contracts/external/council/CoreVoting.sol#L11) (state variable)

contracts/ArcadeGSCCoreVoting.sol#L28

- [ ] ID-19 [NFTBoostVault.constructor(IERC20,uint256,address,address).manager](contracts/NFTBoostVault.sol#L86)
        shadows: - [BaseVotingVault.manager()](contracts/BaseVotingVault.sol#L137-L139) (function) -
        [IBaseVotingVault.manager()](contracts/interfaces/IBaseVotingVault.sol#L16) (function)

contracts/NFTBoostVault.sol#L86

- [ ] ID-20 [ArcadeGSCVault.constructor(ICoreVoting,uint256,address).owner](contracts/ArcadeGSCVault.sol#L38)
        shadows: - [Authorizable.owner](contracts/external/council/libraries/Authorizable.sol#L8) (state variable)

contracts/ArcadeGSCVault.sol#L38

- [ ] ID-21 [ArcadeGSCVault.constructor(ICoreVoting,uint256,address).coreVoting](contracts/ArcadeGSCVault.sol#L36)
        shadows: - [GSCVault.coreVoting](contracts/external/council/vaults/GSCVault.sol#L19) (state variable)

contracts/ArcadeGSCVault.sol#L36

- [ ] ID-22 [NFTBoostVault.constructor(IERC20,uint256,address,address).staleBlockLag](contracts/NFTBoostVault.sol#L84)
        shadows: - [BaseVotingVault.staleBlockLag](contracts/BaseVotingVault.sol#L36) (state variable)

contracts/NFTBoostVault.sol#L84

- [ ] ID-23
        [ArcadeGSCVault.constructor(ICoreVoting,uint256,address).votingPowerBound](contracts/ArcadeGSCVault.sol#L37)
        shadows: - [GSCVault.votingPowerBound](contracts/external/council/vaults/GSCVault.sol#L21) (state variable)

contracts/ArcadeGSCVault.sol#L37

- [ ] ID-24 [NFTBoostVault.constructor(IERC20,uint256,address,address).timelock](contracts/NFTBoostVault.sol#L85)
        shadows: - [BaseVotingVault.timelock()](contracts/BaseVotingVault.sol#L126-L128) (function) -
        [IBaseVotingVault.timelock()](contracts/interfaces/IBaseVotingVault.sol#L14) (function)

contracts/NFTBoostVault.sol#L85

- [ ] ID-25
        [ArcadeGSCCoreVoting.constructor(address,uint256,uint256,address,address[]).minProposalPower](contracts/ArcadeGSCCoreVoting.sol#L29)
        shadows: - [CoreVoting.minProposalPower](contracts/external/council/CoreVoting.sol#L27) (state variable)

contracts/ArcadeGSCCoreVoting.sol#L29

- [ ] ID-26 [NFTBoostVault.constructor(IERC20,uint256,address,address).token](contracts/NFTBoostVault.sol#L83)
        shadows: - [BaseVotingVault.token](contracts/BaseVotingVault.sol#L33) (state variable)

contracts/NFTBoostVault.sol#L83

## events-access

Impact: Low Confidence: Medium

- [ ] ID-27 [Authorizable.setOwner(address)](contracts/external/council/libraries/Authorizable.sol#L52-L54) should
        emit an event for: - [owner = who](contracts/external/council/libraries/Authorizable.sol#L53)

contracts/external/council/libraries/Authorizable.sol#L52-L54

## events-maths

Impact: Low Confidence: Medium

- [ ] ID-28 [Timelock.setWaitTime(uint256)](contracts/external/council/features/Timelock.sol#L84-L87) should emit an
        event for: - [waitTime = \_waitTime](contracts/external/council/features/Timelock.sol#L86)

contracts/external/council/features/Timelock.sol#L84-L87

## missing-zero-check

Impact: Low Confidence: Medium

- [ ] ID-29 [Authorizable.setOwner(address).who](contracts/external/council/libraries/Authorizable.sol#L52) lacks a
        zero-check on : - [owner = who](contracts/external/council/libraries/Authorizable.sol#L53)

contracts/external/council/libraries/Authorizable.sol#L52

## calls-loop

Impact: Low Confidence: Medium

- [ ] ID-30 [GSCVault.proveMembership(address[],bytes[])](contracts/external/council/vaults/GSCVault.sol#L56-L102) has
        external calls inside a loop:
        [vaultStatus = coreVoting.approvedVaults(votingVaults[i])](contracts/external/council/vaults/GSCVault.sol#L72)

contracts/external/council/vaults/GSCVault.sol#L56-L102

- [ ] ID-31 [ArcadeTreasury.batchCalls(address[],bytes[])](contracts/ArcadeTreasury.sol#L333-L345) has external calls
        inside a loop: [(success) = targets[i].call(calldatas[i])](contracts/ArcadeTreasury.sol#L341)

contracts/ArcadeTreasury.sol#L333-L345

- [ ] ID-32 [GSCVault.kick(address,bytes[])](contracts/external/council/vaults/GSCVault.sol#L110-L138) has external
        calls inside a loop:
        [votes = IVotingVault(votingVaults[i]).queryVotePower(who,block.number - 1,extraData[i])](contracts/external/council/vaults/GSCVault.sol#L122-L127)

contracts/external/council/vaults/GSCVault.sol#L110-L138

- [ ] ID-33 [CoreVoting.execute(uint256,address[],bytes[])](contracts/external/council/CoreVoting.sol#L263-L309) has
        external calls inside a loop:
        [(success) = targets[i].call(calldatas[i])](contracts/external/council/CoreVoting.sol#L298)

contracts/external/council/CoreVoting.sol#L263-L309

- [ ] ID-34
        [CoreVoting.vote(address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L215-L257)
        has external calls inside a loop:
        [votingPower += uint128(IVotingVault(votingVaults[i]).queryVotePower(msg.sender,proposals[proposalId].created,extraVaultData[i]))](contracts/external/council/CoreVoting.sol#L233-L239)

contracts/external/council/CoreVoting.sol#L215-L257

- [ ] ID-35 [GSCVault.kick(address,bytes[])](contracts/external/council/vaults/GSCVault.sol#L110-L138) has external
        calls inside a loop:
        [coreVoting.approvedVaults(votingVaults[i])](contracts/external/council/vaults/GSCVault.sol#L118)

contracts/external/council/vaults/GSCVault.sol#L110-L138

- [ ] ID-36 [GSCVault.proveMembership(address[],bytes[])](contracts/external/council/vaults/GSCVault.sol#L56-L102) has
        external calls inside a loop:
        [votes = IVotingVault(votingVaults[i_scope_0]).queryVotePower(msg.sender,block.number - 1,extraData[i_scope_0])](contracts/external/council/vaults/GSCVault.sol#L82-L87)

contracts/external/council/vaults/GSCVault.sol#L56-L102

- [ ] ID-37 [Timelock.execute(address[],bytes[])](contracts/external/council/features/Timelock.sol#L56-L80) has
        external calls inside a loop:
        [(success) = targets[i].call(calldatas[i])](contracts/external/council/features/Timelock.sol#L73)

contracts/external/council/features/Timelock.sol#L56-L80

## reentrancy-benign

Impact: Low Confidence: Medium

- [ ] ID-38 Reentrancy in
        [Timelock.execute(address[],bytes[])](contracts/external/council/features/Timelock.sol#L56-L80): External
        calls: - [(success) = targets[i].call(calldatas[i])](contracts/external/council/features/Timelock.sol#L73) State
        variables written after the call(s): -
        [delete timeIncreases[callHash]](contracts/external/council/features/Timelock.sol#L79)

contracts/external/council/features/Timelock.sol#L56-L80

- [ ] ID-39 Reentrancy in
        [CoreVoting.vote(address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L215-L257):
        External calls: -
        [votingPower += uint128(IVotingVault(votingVaults[i]).queryVotePower(msg.sender,proposals[proposalId].created,extraVaultData[i]))](contracts/external/council/CoreVoting.sol#L233-L239)
        State variables written after the call(s): -
        [votes[msg.sender][proposalId] = Vote(votingPower,ballot)](contracts/external/council/CoreVoting.sol#L249)

contracts/external/council/CoreVoting.sol#L215-L257

- [ ] ID-40 Reentrancy in
        [GSCVault.proveMembership(address[],bytes[])](contracts/external/council/vaults/GSCVault.sol#L56-L102): External
        calls: -
        [votes = IVotingVault(votingVaults[i_scope_0]).queryVotePower(msg.sender,block.number - 1,extraData[i_scope_0])](contracts/external/council/vaults/GSCVault.sol#L82-L87)
        State variables written after the call(s): -
        [members[msg.sender].vaults = votingVaults](contracts/external/council/vaults/GSCVault.sol#L96) -
        [members[msg.sender] = Member(votingVaults,block.timestamp)](contracts/external/council/vaults/GSCVault.sol#L98)

contracts/external/council/vaults/GSCVault.sol#L56-L102

## reentrancy-events

Impact: Low Confidence: Medium

- [ ] ID-41 Reentrancy in
        [ArcadeTokenDistributor.toCommunityRewards(address)](contracts/token/ArcadeTokenDistributor.sol#L105-L114):
        External calls: -
        [arcadeToken.safeTransfer(\_communityRewards,communityRewardsAmount)](contracts/token/ArcadeTokenDistributor.sol#L111)
        Event emitted after the call(s): -
        [Distribute(address(arcadeToken),\_communityRewards,communityRewardsAmount)](contracts/token/ArcadeTokenDistributor.sol#L113)

contracts/token/ArcadeTokenDistributor.sol#L105-L114

- [ ] ID-42 Reentrancy in
        [ArcadeTokenDistributor.toCommunityAirdrop(address)](contracts/token/ArcadeTokenDistributor.sol#L121-L130):
        External calls: -
        [arcadeToken.safeTransfer(\_communityAirdrop,communityAirdropAmount)](contracts/token/ArcadeTokenDistributor.sol#L127)
        Event emitted after the call(s): -
        [Distribute(address(arcadeToken),\_communityAirdrop,communityAirdropAmount)](contracts/token/ArcadeTokenDistributor.sol#L129)

contracts/token/ArcadeTokenDistributor.sol#L121-L130

- [ ] ID-43 Reentrancy in
        [ArcadeTokenDistributor.toTreasury(address)](contracts/token/ArcadeTokenDistributor.sol#L73-L82): External
        calls: - [arcadeToken.safeTransfer(\_treasury,treasuryAmount)](contracts/token/ArcadeTokenDistributor.sol#L79)
        Event emitted after the call(s): -
        [Distribute(address(arcadeToken),\_treasury,treasuryAmount)](contracts/token/ArcadeTokenDistributor.sol#L81)

contracts/token/ArcadeTokenDistributor.sol#L73-L82

- [ ] ID-44 Reentrancy in
        [ArcadeTokenDistributor.toTeamVesting(address)](contracts/token/ArcadeTokenDistributor.sol#L138-L147): External
        calls: -
        [arcadeToken.safeTransfer(\_vestingTeam,vestingTeamAmount)](contracts/token/ArcadeTokenDistributor.sol#L144)
        Event emitted after the call(s): -
        [Distribute(address(arcadeToken),\_vestingTeam,vestingTeamAmount)](contracts/token/ArcadeTokenDistributor.sol#L146)

contracts/token/ArcadeTokenDistributor.sol#L138-L147

- [ ] ID-45 Reentrancy in
        [CoreVoting.vote(address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L215-L257):
        External calls: -
        [votingPower += uint128(IVotingVault(votingVaults[i]).queryVotePower(msg.sender,proposals[proposalId].created,extraVaultData[i]))](contracts/external/council/CoreVoting.sol#L233-L239)
        Event emitted after the call(s): -
        [Voted(msg.sender,proposalId,votes[msg.sender][proposalId])](contracts/external/council/CoreVoting.sol#L254)

contracts/external/council/CoreVoting.sol#L215-L257

- [ ] ID-46 Reentrancy in
        [CoreVoting.proposal(address[],bytes[],address[],bytes[],uint256,CoreVoting.Ballot)](contracts/external/council/CoreVoting.sol#L132-L205):
        External calls: -
        [votingPower = vote(votingVaults,extraVaultData,proposalCount,ballot)](contracts/external/council/CoreVoting.sol#L183-L184) -
        [votingPower += uint128(IVotingVault(votingVaults[i]).queryVotePower(msg.sender,proposals[proposalId].created,extraVaultData[i]))](contracts/external/council/CoreVoting.sol#L233-L239)
        Event emitted after the call(s): -
        [ProposalCreated(proposalCount,block.number,block.number + lockDuration,block.number + lockDuration + extraVoteTime)](contracts/external/council/CoreVoting.sol#L197-L202)

contracts/external/council/CoreVoting.sol#L132-L205

- [ ] ID-47 Reentrancy in [ARCDVestingVault.revokeGrant(address)](contracts/ARCDVestingVault.sol#L157-L186): External
        calls: - [token.safeTransfer(who,withdrawable)](contracts/ARCDVestingVault.sol#L167) -
        [token.safeTransfer(msg.sender,remaining)](contracts/ARCDVestingVault.sol#L172) Event emitted after the
        call(s): - [VoteChange(grant.delegatee,who,change)](contracts/ARCDVestingVault.sol#L356) -
        [\_syncVotingPower(who,grant)](contracts/ARCDVestingVault.sol#L175)

contracts/ARCDVestingVault.sol#L157-L186

- [ ] ID-48 Reentrancy in
        [GSCVault.proveMembership(address[],bytes[])](contracts/external/council/vaults/GSCVault.sol#L56-L102): External
        calls: -
        [votes = IVotingVault(votingVaults[i_scope_0]).queryVotePower(msg.sender,block.number - 1,extraData[i_scope_0])](contracts/external/council/vaults/GSCVault.sol#L82-L87)
        Event emitted after the call(s): -
        [MembershipProved(msg.sender,block.timestamp)](contracts/external/council/vaults/GSCVault.sol#L101)

contracts/external/council/vaults/GSCVault.sol#L56-L102

- [ ] ID-49 Reentrancy in [GSCVault.kick(address,bytes[])](contracts/external/council/vaults/GSCVault.sol#L110-L138):
        External calls: -
        [votes = IVotingVault(votingVaults[i]).queryVotePower(who,block.number - 1,extraData[i])](contracts/external/council/vaults/GSCVault.sol#L122-L127)
        Event emitted after the call(s): -
        [Kicked(who,block.number)](contracts/external/council/vaults/GSCVault.sol#L137)

contracts/external/council/vaults/GSCVault.sol#L110-L138

- [ ] ID-50 Reentrancy in
        [ArcadeTokenDistributor.toPartnerVesting(address)](contracts/token/ArcadeTokenDistributor.sol#L155-L164):
        External calls: -
        [arcadeToken.safeTransfer(\_vestingPartner,vestingPartnerAmount)](contracts/token/ArcadeTokenDistributor.sol#L161)
        Event emitted after the call(s): -
        [Distribute(address(arcadeToken),\_vestingPartner,vestingPartnerAmount)](contracts/token/ArcadeTokenDistributor.sol#L163)

contracts/token/ArcadeTokenDistributor.sol#L155-L164

- [ ] ID-51 Reentrancy in
        [ArcadeTokenDistributor.toDevPartner(address)](contracts/token/ArcadeTokenDistributor.sol#L89-L98): External
        calls: -
        [arcadeToken.safeTransfer(\_devPartner,devPartnerAmount)](contracts/token/ArcadeTokenDistributor.sol#L95) Event
        emitted after the call(s): -
        [Distribute(address(arcadeToken),\_devPartner,devPartnerAmount)](contracts/token/ArcadeTokenDistributor.sol#L97)

contracts/token/ArcadeTokenDistributor.sol#L89-L98

- [ ] ID-52 Reentrancy in
        [AbstractLockingVault.deposit(address,uint256,address)](contracts/external/council/vaults/LockingVault.sol#L113-L149):
        External calls: -
        [token.transferFrom(msg.sender,address(this),amount)](contracts/external/council/vaults/LockingVault.sol#L122)
        Event emitted after the call(s): -
        [VoteChange(fundedAccount,delegate,int256(amount))](contracts/external/council/vaults/LockingVault.sol#L146)

contracts/external/council/vaults/LockingVault.sol#L113-L149

## timestamp

Impact: Low Confidence: Medium

- [ ] ID-53 [ReputationBadge.publishRoots(IReputationBadge.ClaimData[])](contracts/nft/ReputationBadge.sol#L140-L156)
        uses timestamp for comparisons Dangerous comparisons: -
        [\_claimData[i].claimExpiration <= block.timestamp](contracts/nft/ReputationBadge.sol#L146)

contracts/nft/ReputationBadge.sol#L140-L156

- [ ] ID-54
        [ArcadeMerkleRewards.constructor(bytes32,IERC20,uint256,INFTBoostVault)](contracts/libraries/ArcadeMerkleRewards.sol#L57-L66)
        uses timestamp for comparisons Dangerous comparisons: -
        [\_expiration <= block.timestamp](contracts/libraries/ArcadeMerkleRewards.sol#L58)

contracts/libraries/ArcadeMerkleRewards.sol#L57-L66

- [ ] ID-55 [GSCVault.kick(address,bytes[])](contracts/external/council/vaults/GSCVault.sol#L110-L138) uses timestamp
        for comparisons Dangerous comparisons: -
        [i < votingVaults.length](contracts/external/council/vaults/GSCVault.sol#L116) -
        [require(bool,string)(totalVotes < votingPowerBound,Not kick-able)](contracts/external/council/vaults/GSCVault.sol#L133)

contracts/external/council/vaults/GSCVault.sol#L110-L138

- [ ] ID-56 [ArcadeTreasury.setGSCAllowance(address,uint256)](contracts/ArcadeTreasury.sol#L303-L323) uses timestamp
        for comparisons Dangerous comparisons: -
        [uint48(block.timestamp) < lastAllowanceSet[token] + SET_ALLOWANCE_COOL_DOWN](contracts/ArcadeTreasury.sol#L308)

contracts/ArcadeTreasury.sol#L303-L323

- [ ] ID-57 [ArcadeToken.mint(address,uint256)](contracts/token/ArcadeToken.sol#L145-L160) uses timestamp for
        comparisons Dangerous comparisons: -
        [block.timestamp < mintingAllowedAfter](contracts/token/ArcadeToken.sol#L146)

contracts/token/ArcadeToken.sol#L145-L160

- [ ] ID-58
        [ArcadeMerkleRewards.claimAndDelegate(address,uint128,bytes32[])](contracts/libraries/ArcadeMerkleRewards.sol#L77-L89)
        uses timestamp for comparisons Dangerous comparisons: -
        [block.timestamp > expiration](contracts/libraries/ArcadeMerkleRewards.sol#L79)

contracts/libraries/ArcadeMerkleRewards.sol#L77-L89

- [ ] ID-59 [ArcadeAirdrop.reclaim(address)](contracts/token/ArcadeAirdrop.sol#L62-L68) uses timestamp for comparisons
        Dangerous comparisons: - [block.timestamp <= expiration](contracts/token/ArcadeAirdrop.sol#L63)

contracts/token/ArcadeAirdrop.sol#L62-L68

- [ ] ID-60 [Timelock.increaseTime(uint256,bytes32)](contracts/external/council/features/Timelock.sol#L93-L109) uses
        timestamp for comparisons Dangerous comparisons: -
        [require(bool,string)(callTimestamps[callHash] != 0,must have been previously registered)](contracts/external/council/features/Timelock.sol#L101-L104)

contracts/external/council/features/Timelock.sol#L93-L109

- [ ] ID-61 [GSCVault.proveMembership(address[],bytes[])](contracts/external/council/vaults/GSCVault.sol#L56-L102)
        uses timestamp for comparisons Dangerous comparisons: -
        [members[msg.sender].joined != 0](contracts/external/council/vaults/GSCVault.sol#L95)

contracts/external/council/vaults/GSCVault.sol#L56-L102

- [ ] ID-62 [Timelock.stopCall(bytes32)](contracts/external/council/features/Timelock.sol#L44-L51) uses timestamp for
        comparisons Dangerous comparisons: -
        [require(bool,string)(callTimestamps[callHash] != 0,No call to be removed)](contracts/external/council/features/Timelock.sol#L47)

contracts/external/council/features/Timelock.sol#L44-L51

- [ ] ID-63
        [ReputationBadge.mint(address,uint256,uint256,uint256,bytes32[])](contracts/nft/ReputationBadge.sol#L98-L120)
        uses timestamp for comparisons Dangerous comparisons: -
        [block.timestamp > claimExpiration](contracts/nft/ReputationBadge.sol#L108)

contracts/nft/ReputationBadge.sol#L98-L120

- [ ] ID-64 [Timelock.registerCall(bytes32)](contracts/external/council/features/Timelock.sol#L35-L40) uses timestamp
        for comparisons Dangerous comparisons: -
        [require(bool,string)(callTimestamps[callHash] == 0,already registered)](contracts/external/council/features/Timelock.sol#L37)

contracts/external/council/features/Timelock.sol#L35-L40

- [ ] ID-65 [GSCVault.queryVotePower(address,uint256,bytes)](contracts/external/council/vaults/GSCVault.sol#L145-L167)
        uses timestamp for comparisons Dangerous comparisons: -
        [members[who].joined > 0 && (members[who].joined + idleDuration) <= block.timestamp](contracts/external/council/vaults/GSCVault.sol#L160-L161)

contracts/external/council/vaults/GSCVault.sol#L145-L167

- [ ] ID-66 [Timelock.execute(address[],bytes[])](contracts/external/council/features/Timelock.sol#L56-L80) uses
        timestamp for comparisons Dangerous comparisons: -
        [require(bool,string)(callTimestamps[callHash] != 0,call has not been initialized)](contracts/external/council/features/Timelock.sol#L63) -
        [require(bool,string)(callTimestamps[callHash] + waitTime < block.timestamp,not enough time has passed)](contracts/external/council/features/Timelock.sol#L65-L68)

contracts/external/council/features/Timelock.sol#L56-L80

## assembly

Impact: Informational Confidence: High

- [ ] ID-67
        [NFTBoostVaultStorage.mappingAddressToPackedUintUint(string)](contracts/libraries/NFTBoostVaultStorage.sol#L72-L79)
        uses assembly - [INLINE ASM](contracts/libraries/NFTBoostVaultStorage.sol#L76-L78)

contracts/libraries/NFTBoostVaultStorage.sol#L72-L79

- [ ] ID-68
        [Storage.mappingAddressToPackedAddressUint(string)](contracts/external/council/libraries/Storage.sol#L143-L153)
        uses assembly - [INLINE ASM](contracts/external/council/libraries/Storage.sol#L150-L152)

contracts/external/council/libraries/Storage.sol#L143-L153

- [ ] ID-69 [History.load(string)](contracts/external/council/libraries/History.sol#L36-L48) uses assembly -
        [INLINE ASM](contracts/external/council/libraries/History.sol#L44-L46)

contracts/external/council/libraries/History.sol#L36-L48

- [ ] ID-70
        [Storage.mappingAddressToUnit256ArrayPtr(string)](contracts/external/council/libraries/Storage.sol#L107-L117)
        uses assembly - [INLINE ASM](contracts/external/council/libraries/Storage.sol#L114-L116)

contracts/external/council/libraries/Storage.sol#L107-L117

- [ ] ID-71 [History.\_getMapping(bytes32)](contracts/external/council/libraries/History.sol#L55-L63) uses assembly -
        [INLINE ASM](contracts/external/council/libraries/History.sol#L60-L62)

contracts/external/council/libraries/History.sol#L55-L63

- [ ] ID-72
        [NFTBoostVaultStorage.mappingAddressToRegistrationPtr(string)](contracts/libraries/NFTBoostVaultStorage.sol#L56-L63)
        uses assembly - [INLINE ASM](contracts/libraries/NFTBoostVaultStorage.sol#L60-L62)

contracts/libraries/NFTBoostVaultStorage.sol#L56-L63

- [ ] ID-73 [CoreVoting.\_getSelector(bytes)](contracts/external/council/CoreVoting.sol#L365-L376) uses assembly -
        [INLINE ASM](contracts/external/council/CoreVoting.sol#L370-L375)

contracts/external/council/CoreVoting.sol#L365-L376

- [ ] ID-74 [History.\_loadAndUnpack(uint256[],uint256)](contracts/external/council/libraries/History.sol#L308-L325)
        uses assembly - [INLINE ASM](contracts/external/council/libraries/History.sol#L316-L318)

contracts/external/council/libraries/History.sol#L308-L325

- [ ] ID-75
        [History.\_setBounds(uint256[],uint256,uint256)](contracts/external/council/libraries/History.sol#L332-L353)
        uses assembly - [INLINE ASM](contracts/external/council/libraries/History.sol#L340-L352)

contracts/external/council/libraries/History.sol#L332-L353

- [ ] ID-76 [History.\_clear(uint256,uint256,uint256[])](contracts/external/council/libraries/History.sol#L278-L302)
        uses assembly - [INLINE ASM](contracts/external/council/libraries/History.sol#L287-L301)

contracts/external/council/libraries/History.sol#L278-L302

- [ ] ID-77 [Storage.mappingAddressToUnit256Ptr(string)](contracts/external/council/libraries/Storage.sol#L92-L102)
        uses assembly - [INLINE ASM](contracts/external/council/libraries/Storage.sol#L99-L101)

contracts/external/council/libraries/Storage.sol#L92-L102

- [ ] ID-78
        [ARCDVestingVaultStorage.mappingAddressToGrantPtr(string)](contracts/libraries/ARCDVestingVaultStorage.sol#L47-L55)
        uses assembly - [INLINE ASM](contracts/libraries/ARCDVestingVaultStorage.sol#L52-L54)

contracts/libraries/ARCDVestingVaultStorage.sol#L47-L55

- [ ] ID-79 [Storage.addressPtr(string)](contracts/external/council/libraries/Storage.sol#L28-L38) uses assembly -
        [INLINE ASM](contracts/external/council/libraries/Storage.sol#L35-L37)

contracts/external/council/libraries/Storage.sol#L28-L38

- [ ] ID-80 [History.\_loadBounds(uint256[])](contracts/external/council/libraries/History.sol#L359-L375) uses
        assembly - [INLINE ASM](contracts/external/council/libraries/History.sol#L366-L368)

contracts/external/council/libraries/History.sol#L359-L375

- [ ] ID-81 [Storage.uint256Ptr(string)](contracts/external/council/libraries/Storage.sol#L63-L73) uses assembly -
        [INLINE ASM](contracts/external/council/libraries/Storage.sol#L70-L72)

contracts/external/council/libraries/Storage.sol#L63-L73

- [ ] ID-82
        [History.push(History.HistoricalBalances,address,uint256)](contracts/external/council/libraries/History.sol#L71-L120)
        uses assembly - [INLINE ASM](contracts/external/council/libraries/History.sol#L104-L115)

contracts/external/council/libraries/History.sol#L71-L120

## boolean-equal

Impact: Informational Confidence: High

- [ ] ID-83 [Timelock.increaseTime(uint256,bytes32)](contracts/external/council/features/Timelock.sol#L93-L109)
        compares to a boolean
        constant: -[require(bool,string)(timeIncreases[callHash] == false,value can only be changed once)](contracts/external/council/features/Timelock.sol#L97-L100)

contracts/external/council/features/Timelock.sol#L93-L109

- [ ] ID-84 [Timelock.execute(address[],bytes[])](contracts/external/council/features/Timelock.sol#L56-L80) compares
        to a boolean
        constant: -[require(bool,string)(success == true,call reverted)](contracts/external/council/features/Timelock.sol#L75)

contracts/external/council/features/Timelock.sol#L56-L80

## dead-code

Impact: Informational Confidence: Medium

- [ ] ID-85 [Storage.load(Storage.Address)](contracts/external/council/libraries/Storage.sol#L43-L45) is never used
        and should be removed

contracts/external/council/libraries/Storage.sol#L43-L45

- [ ] ID-86 [Storage.mappingAddressToUnit256Ptr(string)](contracts/external/council/libraries/Storage.sol#L92-L102) is
        never used and should be removed

contracts/external/council/libraries/Storage.sol#L92-L102

- [ ] ID-87 [Storage.load(Storage.Uint256)](contracts/external/council/libraries/Storage.sol#L78-L80) is never used
        and should be removed

contracts/external/council/libraries/Storage.sol#L78-L80

## solc-version

Impact: Informational Confidence: High

- [ ] ID-88 Pragma version[^0.8.3](contracts/external/council/libraries/Storage.sol#L2) allows old versions

contracts/external/council/libraries/Storage.sol#L2

- [ ] ID-89 Pragma version[^0.8.3](contracts/external/council/libraries/ReentrancyBlock.sol#L2) allows old versions

contracts/external/council/libraries/ReentrancyBlock.sol#L2

- [ ] ID-90 Pragma version[^0.8.3](contracts/external/council/interfaces/IVotingVault.sol#L2) allows old versions

contracts/external/council/interfaces/IVotingVault.sol#L2

- [ ] ID-91 Pragma version[^0.8.3](contracts/external/council/CoreVoting.sol#L2) allows old versions

contracts/external/council/CoreVoting.sol#L2

- [ ] ID-92 Pragma version[^0.8.3](contracts/external/council/vaults/GSCVault.sol#L2) allows old versions

contracts/external/council/vaults/GSCVault.sol#L2

- [ ] ID-93 Pragma version[>=0.7.0](contracts/external/council/libraries/Authorizable.sol#L2) allows old versions

contracts/external/council/libraries/Authorizable.sol#L2

- [ ] ID-94 Pragma version[^0.8.3](contracts/external/council/interfaces/ICoreVoting.sol#L2) allows old versions

contracts/external/council/interfaces/ICoreVoting.sol#L2

- [ ] ID-95 Pragma version[^0.8.3](contracts/external/council/interfaces/ILockingVault.sol#L2) allows old versions

contracts/external/council/interfaces/ILockingVault.sol#L2

- [ ] ID-96 Pragma version[^0.8.3](contracts/external/council/libraries/MerkleRewards.sol#L2) allows old versions

contracts/external/council/libraries/MerkleRewards.sol#L2

- [ ] ID-97 Pragma version[^0.8.3](contracts/external/council/interfaces/IERC20.sol#L2) allows old versions

contracts/external/council/interfaces/IERC20.sol#L2

- [ ] ID-98 Pragma version[^0.8.3](contracts/external/council/libraries/History.sol#L2) allows old versions

contracts/external/council/libraries/History.sol#L2

- [ ] ID-99 Pragma version[^0.8.3](contracts/external/council/vaults/LockingVault.sol#L2) allows old versions

contracts/external/council/vaults/LockingVault.sol#L2

- [ ] ID-100 Pragma version[^0.8.3](contracts/external/council/features/Timelock.sol#L2) allows old versions

contracts/external/council/features/Timelock.sol#L2

## low-level-calls

Impact: Informational Confidence: High

- [ ] ID-101 Low level call in
        [ArcadeTreasury.batchCalls(address[],bytes[])](contracts/ArcadeTreasury.sol#L333-L345): -
        [(success) = targets[i].call(calldatas[i])](contracts/ArcadeTreasury.sol#L341)

contracts/ArcadeTreasury.sol#L333-L345

- [ ] ID-102 Low level call in
        [CoreVoting.execute(uint256,address[],bytes[])](contracts/external/council/CoreVoting.sol#L263-L309): -
        [(success) = targets[i].call(calldatas[i])](contracts/external/council/CoreVoting.sol#L298)

contracts/external/council/CoreVoting.sol#L263-L309

- [ ] ID-103 Low level call in
        [Timelock.execute(address[],bytes[])](contracts/external/council/features/Timelock.sol#L56-L80): -
        [(success) = targets[i].call(calldatas[i])](contracts/external/council/features/Timelock.sol#L73)

contracts/external/council/features/Timelock.sol#L56-L80

## naming-convention

Impact: Informational Confidence: High

- [ ] ID-104 Parameter
        [CoreVoting.changeExtraVotingTime(uint256).\_extraVoteTime](contracts/external/council/CoreVoting.sol#L360) is
        not in mixedCase

contracts/external/council/CoreVoting.sol#L360

- [ ] ID-105 Parameter
        [GSCVault.setVotePowerBound(uint256).\_newBound](contracts/external/council/vaults/GSCVault.sol#L185) is not in
        mixedCase

contracts/external/council/vaults/GSCVault.sol#L185

- [ ] ID-106 Parameter
        [ArcadeTokenDistributor.toPartnerVesting(address).\_vestingPartner](contracts/token/ArcadeTokenDistributor.sol#L155)
        is not in mixedCase

contracts/token/ArcadeTokenDistributor.sol#L155

- [ ] ID-107 Parameter
        [GSCVault.setIdleDuration(uint256).\_idleDuration](contracts/external/council/vaults/GSCVault.sol#L191) is not
        in mixedCase

contracts/external/council/vaults/GSCVault.sol#L191

- [ ] ID-108 Parameter
        [ArcadeTokenDistributor.toCommunityAirdrop(address).\_communityAirdrop](contracts/token/ArcadeTokenDistributor.sol#L121)
        is not in mixedCase

contracts/token/ArcadeTokenDistributor.sol#L121

- [ ] ID-109 Parameter [ArcadeToken.setMinter(address).\_newMinter](contracts/token/ArcadeToken.sol#L132) is not in
        mixedCase

contracts/token/ArcadeToken.sol#L132

- [ ] ID-110 Parameter
        [CoreVoting.setLockDuration(uint256).\_lockDuration](contracts/external/council/CoreVoting.sol#L354) is not in
        mixedCase

contracts/external/council/CoreVoting.sol#L354

- [ ] ID-111 Parameter
        [ArcadeTokenDistributor.toTreasury(address).\_treasury](contracts/token/ArcadeTokenDistributor.sol#L73) is not
        in mixedCase

contracts/token/ArcadeTokenDistributor.sol#L73

- [ ] ID-112 Parameter
        [Timelock.setWaitTime(uint256).\_waitTime](contracts/external/council/features/Timelock.sol#L84) is not in
        mixedCase

contracts/external/council/features/Timelock.sol#L84

- [ ] ID-113 Parameter [ArcadeAirdrop.setMerkleRoot(bytes32).\_merkleRoot](contracts/token/ArcadeAirdrop.sol#L75) is
        not in mixedCase

contracts/token/ArcadeAirdrop.sol#L75

- [ ] ID-114 Parameter
        [ReputationBadge.publishRoots(IReputationBadge.ClaimData[]).\_claimData](contracts/nft/ReputationBadge.sol#L140)
        is not in mixedCase

contracts/nft/ReputationBadge.sol#L140

- [ ] ID-115 Parameter
        [CoreVoting.setMinProposalPower(uint256).\_minProposalPower](contracts/external/council/CoreVoting.sol#L348) is
        not in mixedCase

contracts/external/council/CoreVoting.sol#L348

- [ ] ID-116 Parameter
        [ArcadeTokenDistributor.toDevPartner(address).\_devPartner](contracts/token/ArcadeTokenDistributor.sol#L89) is
        not in mixedCase

contracts/token/ArcadeTokenDistributor.sol#L89

- [ ] ID-117 Parameter
        [ArcadeTokenDistributor.toCommunityRewards(address).\_communityRewards](contracts/token/ArcadeTokenDistributor.sol#L105)
        is not in mixedCase

contracts/token/ArcadeTokenDistributor.sol#L105

- [ ] ID-118 Parameter
        [GSCVault.setCoreVoting(ICoreVoting).\_newVoting](contracts/external/council/vaults/GSCVault.sol#L179) is not in
        mixedCase

contracts/external/council/vaults/GSCVault.sol#L179

- [ ] ID-119 Parameter
        [ArcadeTokenDistributor.setToken(IArcadeToken).\_arcadeToken](contracts/token/ArcadeTokenDistributor.sol#L174)
        is not in mixedCase

contracts/token/ArcadeTokenDistributor.sol#L174

- [ ] ID-120 Parameter [ArcadeToken.mint(address,uint256).\_amount](contracts/token/ArcadeToken.sol#L145) is not in
        mixedCase

contracts/token/ArcadeToken.sol#L145

- [ ] ID-121 Parameter [ArcadeToken.mint(address,uint256).\_to](contracts/token/ArcadeToken.sol#L145) is not in
        mixedCase

contracts/token/ArcadeToken.sol#L145

- [ ] ID-122 Parameter [ReputationBadge.setDescriptor(address).\_descriptor](contracts/nft/ReputationBadge.sol#L184)
        is not in mixedCase

contracts/nft/ReputationBadge.sol#L184

- [ ] ID-123 Parameter
        [ArcadeTokenDistributor.toTeamVesting(address).\_vestingTeam](contracts/token/ArcadeTokenDistributor.sol#L138)
        is not in mixedCase

contracts/token/ArcadeTokenDistributor.sol#L138

## reentrancy-unlimited-gas

Impact: Informational Confidence: Medium

- [ ] ID-124 Reentrancy in [ReputationBadge.withdrawFees(address)](contracts/nft/ReputationBadge.sol#L163-L174):
        External calls: - [address(recipient).transfer(balance)](contracts/nft/ReputationBadge.sol#L171) Event emitted
        after the call(s): - [FeesWithdrawn(recipient,balance)](contracts/nft/ReputationBadge.sol#L173)

contracts/nft/ReputationBadge.sol#L163-L174

- [ ] ID-125 Reentrancy in
        [ArcadeTreasury.\_spend(address,uint256,address,uint256)](contracts/ArcadeTreasury.sol#L358-L373): External
        calls: - [address(destination).transfer(amount)](contracts/ArcadeTreasury.sol#L367) Event emitted after the
        call(s): - [TreasuryTransfer(token,destination,amount)](contracts/ArcadeTreasury.sol#L372)

contracts/ArcadeTreasury.sol#L358-L373

## too-many-digits

Impact: Informational Confidence: Medium

- [ ] ID-126 [History.\_loadBounds(uint256[])](contracts/external/council/libraries/History.sol#L359-L375) uses
        literals with too many digits: -
        [length = packedData & 0x00000000000000000000000000000000ffffffffffffffffffffffffffffffff](contracts/external/council/libraries/History.sol#L372-L374)

contracts/external/council/libraries/History.sol#L359-L375

- [ ] ID-127
        [GSCVault.queryVotePower(address,uint256,bytes)](contracts/external/council/vaults/GSCVault.sol#L145-L167) uses
        literals with too many digits: - [100000](contracts/external/council/vaults/GSCVault.sol#L155)

contracts/external/council/vaults/GSCVault.sol#L145-L167

- [ ] ID-128 [History.\_loadAndUnpack(uint256[],uint256)](contracts/external/council/libraries/History.sol#L308-L325)
        uses literals with too many digits: -
        [(loaded >> 192,loaded & 0x0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff)](contracts/external/council/libraries/History.sol#L320-L324)

contracts/external/council/libraries/History.sol#L308-L325

- [ ] ID-129 [CoreVoting.\_getSelector(bytes)](contracts/external/council/CoreVoting.sol#L365-L376) uses literals with
        too many digits: -
        [out = mload(uint256)(\_calldata + 32) & 0xFFFFFFFFF0000000000000000000000000000000000000000000000000000000](contracts/external/council/CoreVoting.sol#L371-L374)

contracts/external/council/CoreVoting.sol#L365-L376

- [ ] ID-130
        [History.\_setBounds(uint256[],uint256,uint256)](contracts/external/council/libraries/History.sol#L332-L353)
        uses literals with too many digits: -
        [clearedLength\_\_setBounds_asm_0 = length & 0x00000000000000000000000000000000ffffffffffffffffffffffffffffffff](contracts/external/council/libraries/History.sol#L342-L345)

contracts/external/council/libraries/History.sol#L332-L353

## immutable-states

Impact: Optimization Confidence: High

- [ ] ID-131 [AbstractMerkleRewards.lockingVault](contracts/external/council/libraries/MerkleRewards.sol#L17) should
        be immutable

contracts/external/council/libraries/MerkleRewards.sol#L17

- [ ] ID-132 [ArcadeMerkleRewards.votingVault](contracts/libraries/ArcadeMerkleRewards.sol#L43) should be immutable

contracts/libraries/ArcadeMerkleRewards.sol#L43

- [ ] ID-133 [AbstractMerkleRewards.rewardsRoot](contracts/external/council/libraries/MerkleRewards.sol#L11) should be
        immutable

contracts/external/council/libraries/MerkleRewards.sol#L11
