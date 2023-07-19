// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

// Used for minting test ERC1155s in our tests
contract MockERC1155 is ERC1155 {
    /**
     * @dev Initializes ERC1155 token
     */
    constructor(string memory uri_) ERC1155(uri_) {}

    function mint(address to, uint256 tokenId, uint256 amount) public returns (bool) {
        _mint(to, tokenId, amount, "");
        return true;
    }

    function uri(uint256) public view virtual override returns (string memory) {
        return "uri";
    }
}
