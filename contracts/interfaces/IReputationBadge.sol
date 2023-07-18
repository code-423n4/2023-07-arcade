// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IReputationBadge is IERC1155 {
    // ========= Structs =========

    struct ClaimData {
        uint256 tokenId;
        bytes32 claimRoot;
        uint48 claimExpiration;
        uint256 mintPrice;
    }

    // ========= Badge Operations =========

    function mint(
        address recipient,
        uint256 tokenId,
        uint256 amount,
        uint256 totalClaimable,
        bytes32[] calldata merkleProof
    ) external payable;

    function uri(uint256 tokenId) external view returns (string memory);

    function publishRoots(ClaimData[] calldata _claimData) external;

    function withdrawFees(address recipient) external;

    function setDescriptor(address _descriptor) external;

    function amountClaimed(address, uint256) external view returns (uint256);

    function claimRoots(uint256) external view returns (bytes32);

    function claimExpirations(uint256) external view returns (uint48);

    function mintPrices(uint256) external view returns (uint256);
}
