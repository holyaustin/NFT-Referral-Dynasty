// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title UserRegistry
 * @dev Simple registry that emits events when users register with a referrer.
 * This contract is the EVENT EMITTER that our reactive handler will subscribe to.
 */
contract UserRegistry {
    // ============ Events ============
    
    /**
     * @dev Emitted when a new user registers with a referrer
     * @param newUser The address of the newly registered user
     * @param referrer The address who referred them (can be zero address for direct signups)
     */
    event UserRegistered(address indexed newUser, address indexed referrer);
    
    // ============ State ============
    
    /// @dev Tracks if an address has already registered
    mapping(address => bool) public registered;
    
    /// @dev Stores the referrer for each user (optional - you might not need this)
    mapping(address => address) public referrers;
    
    // ============ Functions ============
    
    /**
     * @dev Register a new user with a referrer
     * @param referrer The address of the person who referred this user
     */
    function register(address referrer) external {
        // Security: Prevent double registration
        require(!registered[msg.sender], "Already registered");
        
        // Security: Cannot self-refer
        require(referrer != msg.sender, "Cannot self-refer");
        
        // Mark as registered
        registered[msg.sender] = true;
        
        // Store referrer relationship (optional - remove if not needed)
        referrers[msg.sender] = referrer;
        
        // EMIT THE EVENT - this is what our handler will react to
        emit UserRegistered(msg.sender, referrer);
    }
    
    /**
     * @dev Register without a referrer (direct signup)
     */
    function registerDirect() external {
        require(!registered[msg.sender], "Already registered");
        
        registered[msg.sender] = true;
        
        // Emit with zero address as referrer
        emit UserRegistered(msg.sender, address(0));
    }
    
    /**
     * @dev Check if an address is registered
     * @param user The address to check
     * @return bool True if registered
     */
    function isRegistered(address user) external view returns (bool) {
        return registered[user];
    }
}