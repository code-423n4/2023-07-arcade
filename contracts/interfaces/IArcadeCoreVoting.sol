// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

interface IArcadeCoreVoting {
    /**
     * @notice Data types
     */
    enum Ballot {
        YES,
        NO,
        MAYBE
    }

    struct Vote {
        // voting power of the vote
        uint128 votingPower;
        // direction of the vote
        Ballot castBallot;
    }

    /**
     * @notice Events
     */
    event ProposalCreated(uint256 proposalId, uint256 created, uint256 execution, uint256 expiration);

    event ProposalExecuted(uint256 proposalId);

    event Voted(address indexed voter, uint256 indexed proposalId, Vote vote);

    /**
     * @notice View functions
     */
    function quorums(address target, bytes4 functionSelector) external view returns (uint256);

    function getProposalVotingPower(uint256 proposalId) external view returns (uint128[3] memory);

    function approvedVaults(address vault) external view returns (bool);

    /**
     * @notice Core voting functions
     */
    function proposal(
        address[] calldata votingVaults,
        bytes[] calldata extraVaultData,
        address[] calldata targets,
        bytes[] calldata calldatas,
        uint256 lastCall,
        Ballot ballot
    ) external;

    function vote(
        address[] memory votingVaults,
        bytes[] memory extraVaultData,
        uint256 proposalId,
        Ballot ballot
    ) external returns (uint256);

    function execute(uint256 proposalId, address[] memory targets, bytes[] memory calldatas) external;

    /**
     * @notice Only Owner functions
     */
    function setCustomQuorum(address target, bytes4 selector, uint256 quorum) external;

    function changeVaultStatus(address vault, bool isValid) external;

    function setDefaultQuorum(uint256 quorum) external;

    function setMinProposalPower(uint256 _minProposalPower) external;

    function setLockDuration(uint256 _lockDuration) external;

    function changeExtraVotingTime(uint256 _extraVoteTime) external;
}
