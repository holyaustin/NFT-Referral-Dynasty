// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Test } from "forge-std/Test.sol";
import { UserRegistry } from "../contracts/UserRegistry.sol";

contract UserRegistryTest is Test {
    UserRegistry public registry;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);
    
    event UserRegistered(address indexed newUser, address indexed referrer);
    
    function setUp() public {
        registry = new UserRegistry();
    }
    
    function test_RegisterWithReferrer() public {
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit UserRegistered(user1, user2);
        
        registry.register(user2);
        
        assertTrue(registry.registered(user1));
        assertEq(registry.referrers(user1), user2);
    }
    
    function test_RegisterDirect() public {
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit UserRegistered(user1, address(0));
        
        registry.registerDirect();
        
        assertTrue(registry.registered(user1));
        assertEq(registry.referrers(user1), address(0));
    }
    
    function test_CannotRegisterTwice() public {
        vm.startPrank(user1);
        registry.register(user2);
        
        vm.expectRevert("Already registered");
        registry.register(user2);
        vm.stopPrank();
    }
    
    function test_CannotSelfRefer() public {
        vm.prank(user1);
        vm.expectRevert("Cannot self-refer");
        registry.register(user1);
    }
    
    function test_IsRegistered() public {
        assertFalse(registry.isRegistered(user1));
        
        vm.prank(user1);
        registry.register(user2);
        
        assertTrue(registry.isRegistered(user1));
    }
}