// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../interfaces/IReputationBadge.sol";
import "../interfaces/IBadgeDescriptor.sol";

import {
    RB_InvalidMerkleProof,
    RB_InvalidMintFee,
    RB_InvalidClaimAmount,
    RB_ZeroAddress,
    RB_ClaimingExpired,
    RB_NoClaimData,
    RB_ArrayTooLarge,
    RB_InvalidExpiration
} from "../errors/Badge.sol";

/**
 * @title ReputationBadge
 * @author Non-Fungible Technologies, Inc.
 *
 * Reputation badges are ERC1155 tokens that can be minted by users who meets certain criteria.
 * For example, a user who has completed a certain number of tasks can be awarded a badge.
 * The badge can be used in governance to give a multiplier to a user's voting power. Voting
 * power multipliers associated with each tokenId are stored in the governance vault contracts
 * not the badge contract.
 *
 * This contract uses a merkle trie to determine which users are eligible to mint a badge.
 * Only the manager of the contract can update the merkle roots and claim expirations. Additionally,
 * there is an optional mint price which can be set and claimed by the manager.
 */
contract ReputationBadge is ERC1155, AccessControl, ERC1155Burnable, IReputationBadge {
    /// @dev Contract for returning tokenURI resources.
    IBadgeDescriptor public descriptor;

    /// @notice access control roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant BADGE_MANAGER_ROLE = keccak256("BADGE_MANAGER");
    bytes32 public constant RESOURCE_MANAGER_ROLE = keccak256("RESOURCE_MANAGER");

    /// @notice recipient address to tokenId to amount claimed mapping
    mapping(address => mapping(uint256 => uint256)) public amountClaimed;

    /// @notice Claim tree for each tokenId, with the leaf encoding [address, tokenId, totalClaimableAmount]
    mapping(uint256 => bytes32) public claimRoots;

    /// @notice Expiry date for each tokenId claim
    mapping(uint256 => uint48) public claimExpirations;

    /// @notice Mint price for each tokenId
    mapping(uint256 => uint256) public mintPrices;

    /// @notice Event emitted when a new URI descriptor is set.
    event SetDescriptor(address indexed caller, address indexed descriptor);

    /// @notice Event emitted when a claim data is set for specific tokenId.
    event RootsPublished(ClaimData[] claimData);

    /// @notice Event emitted when ETH fees are withdrawn from this contract.
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    /**
     * @notice Constructor for the contract. Sets owner and manager addresses.
     *
     * @param _owner         The owner of the contract.
     * @param _descriptor    The address of the descriptor contract.
     */
    constructor(address _owner, address _descriptor) ERC1155("") {
        if (_owner == address(0)) revert RB_ZeroAddress("owner");
        if (_descriptor == address(0)) revert RB_ZeroAddress("descriptor");

        _setupRole(ADMIN_ROLE, _owner);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BADGE_MANAGER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(RESOURCE_MANAGER_ROLE, ADMIN_ROLE);

        descriptor = IBadgeDescriptor(_descriptor);
    }

    // =============================== BADGE FUNCTIONS ==============================

    /**
     * @notice Mint a specified number of badges to a user who has a valid claim.
     *
     * @param recipient         The address of the user to mint the badge to.
     * @param tokenId           The ID of the badge to mint.
     * @param amount            The amount of a specific badge to claim.
     * @param totalClaimable    The total amount of a specific badge that can be claimed.
     * @param merkleProof       The merkle proof to verify the claim.
     */
    function mint(
        address recipient,
        uint256 tokenId,
        uint256 amount,
        uint256 totalClaimable,
        bytes32[] calldata merkleProof
    ) external payable {
        uint256 mintPrice = mintPrices[tokenId] * amount;
        uint48 claimExpiration = claimExpirations[tokenId];

        if (block.timestamp > claimExpiration) revert RB_ClaimingExpired(claimExpiration, uint48(block.timestamp));
        if (msg.value < mintPrice) revert RB_InvalidMintFee(mintPrice, msg.value);
        if (!_verifyClaim(recipient, tokenId, totalClaimable, merkleProof)) revert RB_InvalidMerkleProof();
        if (amountClaimed[recipient][tokenId] + amount > totalClaimable) {
            revert RB_InvalidClaimAmount(amount, totalClaimable);
        }

        // increment amount claimed
        amountClaimed[recipient][tokenId] += amount;

        // mint to recipient
        _mint(recipient, tokenId, amount, "");
    }

    /**
     * @notice Get the URI for a specific ERC1155 token ID.
     *
     * @param tokenId               The ID of the token to get the URI for.
     *
     * @return uri                  The token ID's URI.
     */
    function uri(uint256 tokenId) public view override(ERC1155, IReputationBadge) returns (string memory) {
        return descriptor.tokenURI(tokenId);
    }

    // =========================== MANAGER FUNCTIONS ===========================

    /**
     * @notice Update the claim data that is used to validate user claims.
     *
     * @param _claimData        The claim data to update.
     */
    function publishRoots(ClaimData[] calldata _claimData) external onlyRole(BADGE_MANAGER_ROLE) {
        if (_claimData.length == 0) revert RB_NoClaimData();
        if (_claimData.length > 50) revert RB_ArrayTooLarge();

        for (uint256 i = 0; i < _claimData.length; i++) {
            // expiration check
            if (_claimData[i].claimExpiration <= block.timestamp) {
                revert RB_InvalidExpiration(_claimData[i].claimRoot, _claimData[i].tokenId);
            }

            claimRoots[_claimData[i].tokenId] = _claimData[i].claimRoot;
            claimExpirations[_claimData[i].tokenId] = _claimData[i].claimExpiration;
            mintPrices[_claimData[i].tokenId] = _claimData[i].mintPrice;
        }

        emit RootsPublished(_claimData);
    }

    /**
     * @notice Withdraw all ETH fees from the contract.
     *
     * @param recipient        The address to withdraw the fees to.
     */
    function withdrawFees(address recipient) external onlyRole(BADGE_MANAGER_ROLE) {
        if (recipient == address(0)) revert RB_ZeroAddress("recipient");

        // get contract balance
        uint256 balance = address(this).balance;

        // transfer balance to recipient
        // will out-of-gas revert if recipient is a contract with logic inside receive()
        payable(recipient).transfer(balance);

        emit FeesWithdrawn(recipient, balance);
    }

    // ===================== RESOURCE MANAGER FUNCTIONS ========================

    /**
     * @notice Changes the descriptor contract for reporting tokenURI resources.
     *         Can only be called by a resource manager.
     *
     * @param _descriptor           The new descriptor contract address.
     */
    function setDescriptor(address _descriptor) external onlyRole(RESOURCE_MANAGER_ROLE) {
        if (_descriptor == address(0)) revert RB_ZeroAddress("descriptor");

        descriptor = IBadgeDescriptor(_descriptor);

        emit SetDescriptor(msg.sender, _descriptor);
    }

    // ================================ HELPERS ================================

    /**
     * @notice Verify a claim for a user using merkle proof.
     *
     * @param recipient         The address of the user to verify the claim for.
     * @param tokenId           The ID of the badge to verify.
     * @param totalClaimable    Total amount of badges a recipient can claim.
     * @param merkleProof       The merkle proof to verify the claim.
     *
     * @return bool             Whether or not the claim is valid.
     */
    function _verifyClaim(
        address recipient,
        uint256 tokenId,
        uint256 totalClaimable,
        bytes32[] calldata merkleProof
    ) internal view returns (bool) {
        bytes32 rewardsRoot = claimRoots[tokenId];
        bytes32 leafHash = keccak256(abi.encodePacked(recipient, tokenId, totalClaimable));

        return MerkleProof.verify(merkleProof, rewardsRoot, leafHash);
    }

    /// @notice function override
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, AccessControl, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
