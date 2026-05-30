// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DIDRegistry
 * @dev Decentralized Identifier Registry for IdentityChain
 * @notice Manages DID registration, updates, and resolution on Polygon
 */
contract DIDRegistry {
    // DID Document structure
    struct DIDDocument {
        string did;
        address owner;
        bytes32 publicKeyHash;
        uint256 createdAt;
        uint256 updatedAt;
        bool isActive;
        mapping(string => string) services;
        mapping(string => bytes) verificationMethods;
    }

    // Mapping from DID to DID Document
    mapping(string => DIDDocument) private didRegistry;

    // Mapping from address to DIDs
    mapping(address => string[]) private addressDIDs;

    // All registered DIDs
    string[] public allDIDs;

    // Events
    event DIDRegistered(string indexed did, address owner, bytes32 publicKeyHash);
    event DIDUpdated(string indexed did, bytes32 newPublicKeyHash);
    event DIDDeactivated(string indexed did, address owner);
    event ServiceAdded(string indexed did, string serviceId, string serviceEndpoint);

    /**
     * @dev Register a new DID
     * @param _did The DID string (e.g., did:ethr:0x...)
     * @param _publicKeyHash Hash of the public key
     */
    function registerDID(string calldata _did, bytes32 _publicKeyHash) external {
        require(!_exists(_did), "DID already exists");
        require(bytes(_did).length > 0, "Invalid DID");

        DIDDocument storage doc = didRegistry[_did];
        doc.did = _did;
        doc.owner = msg.sender;
        doc.publicKeyHash = _publicKeyHash;
        doc.createdAt = block.timestamp;
        doc.updatedAt = block.timestamp;
        doc.isActive = true;

        addressDIDs[msg.sender].push(_did);
        allDIDs.push(_did);

        emit DIDRegistered(_did, msg.sender, _publicKeyHash);
    }

    /**
     * @dev Update DID public key
     * @param _did The DID to update
     * @param _newPublicKeyHash New public key hash
     */
    function updateDID(string calldata _did, bytes32 _newPublicKeyHash) external {
        require(_exists(_did), "DID does not exist");
        require(didRegistry[_did].owner == msg.sender, "Not authorized");
        require(didRegistry[_did].isActive, "DID is deactivated");

        didRegistry[_did].publicKeyHash = _newPublicKeyHash;
        didRegistry[_did].updatedAt = block.timestamp;

        emit DIDUpdated(_did, _newPublicKeyHash);
    }

    /**
     * @dev Deactivate a DID
     * @param _did The DID to deactivate
     */
    function deactivateDID(string calldata _did) external {
        require(_exists(_did), "DID does not exist");
        require(didRegistry[_did].owner == msg.sender, "Not authorized");
        require(didRegistry[_did].isActive, "DID already deactivated");

        didRegistry[_did].isActive = false;
        didRegistry[_did].updatedAt = block.timestamp;

        emit DIDDeactivated(_did, msg.sender);
    }

    /**
     * @dev Add a service to DID document
     * @param _did The DID
     * @param _serviceId Service identifier
     * @param _serviceEndpoint Service endpoint URL
     */
    function addService(
        string calldata _did,
        string calldata _serviceId,
        string calldata _serviceEndpoint
    ) external {
        require(_exists(_did), "DID does not exist");
        require(didRegistry[_did].owner == msg.sender, "Not authorized");
        require(didRegistry[_did].isActive, "DID is deactivated");

        didRegistry[_did].services[_serviceId] = _serviceEndpoint;
        didRegistry[_did].updatedAt = block.timestamp;

        emit ServiceAdded(_did, _serviceId, _serviceEndpoint);
    }

    /**
     * @dev Resolve a DID
     * @param _did The DID to resolve
     * @return owner DID owner address
     * @return publicKeyHash Public key hash
     * @return isActive Whether DID is active
     * @return createdAt Creation timestamp
     */
    function resolveDID(string calldata _did)
        external
        view
        returns (
            address owner,
            bytes32 publicKeyHash,
            bool isActive,
            uint256 createdAt
        )
    {
        require(_exists(_did), "DID does not exist");

        DIDDocument storage doc = didRegistry[_did];
        return (doc.owner, doc.publicKeyHash, doc.isActive, doc.createdAt);
    }

    /**
     * @dev Get all DIDs for an address
     * @param _owner Owner address
     * @return Array of DIDs
     */
    function getDIDsByOwner(address _owner) external view returns (string[] memory) {
        return addressDIDs[_owner];
    }

    /**
     * @dev Get total number of registered DIDs
     * @return Total DID count
     */
    function getTotalDIDs() external view returns (uint256) {
        return allDIDs.length;
    }

    /**
     * @dev Check if DID exists
     * @param _did The DID to check
     * @return Whether DID exists
     */
    function _exists(string memory _did) internal view returns (bool) {
        return didRegistry[_did].createdAt > 0;
    }
}
