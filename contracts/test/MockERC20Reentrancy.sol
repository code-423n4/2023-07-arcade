// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IARCDVestingVault.sol";

contract MockERC20Reentrancy is ERC20 {
    address private _owner;
    IARCDVestingVault public vesting;

    constructor() ERC20("MockERC20R", "MERC20R") {
        _owner = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setVesting(IARCDVestingVault _vesting) external {
        require(msg.sender == _owner, "only owner");
        vesting = _vesting;
    }

    function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._afterTokenTransfer(from, to, amount);
        // reenter if the transfer is coming from the vesting contract
        if (from == address(vesting)) {
            vesting.claim(1);
        }
    }
}
