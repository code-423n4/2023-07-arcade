// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MockERC721 is ERC721Enumerable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;

    /**
     * @dev Initializes ERC721 token
     */
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    /**
     * @dev Creates a new token for `to`. Public for any test to call.
     *
     * See {ERC721-_mint}.
     */
    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _tokenIdTracker.current();
        _mint(to, uint256(uint160(address(this))) + tokenId);
        _tokenIdTracker.increment();
    }

    /**
     * @dev Creates a new token for `to`. Public for any test to call.
     *
     * See {ERC721-_mint}.
     */
    function mintId(uint256 id, address to) external returns (uint256 tokenId) {
        _mint(to, id);
        _tokenIdTracker.increment();

        return id;
    }

    /**
     * @dev Burn the given token, can be called by anyone
     */
    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }
}
