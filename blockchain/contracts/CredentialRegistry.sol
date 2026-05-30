// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CredentialRegistry
 * @dev Verifiable Credential Registry for IdentityChain
 * @notice Manages credential issuance, revocation, and verification
 */
contract CredentialRegistry {
    // Credential structure
    struct Credential {
        bytes32 credentialId;
        string issuerDID;
        string holderDID;
        bytes32 credentialHash;
        bytes32 schemaHash;
        uint256 issuedAt;
        uint256 expiresAt;
        bool isActive;
        bool isRevoked;
        string revocationReason;
    }

    // Mapping from credential ID to Credential
    mapping(bytes32 => Credential) public credentials;

    // Mapping from issuer DID to credential IDs
    mapping(string => bytes32[]) private issuerCredentials;

    // Mapping from holder DID to credential IDs
    mapping(string => bytes32[]) private holderCredentials;

    // Verified issuers
    mapping(string => bool) public verifiedIssuers;
    mapping(string => IssuerInfo) public issuerInfo;

    // Issuer information
    struct IssuerInfo {
        string name;
        address wallet;
        uint256 verificationLevel;
        uint256 registeredAt;
        bool isVerified;
    }

    // Admin
    address public admin;

    // Events
    event CredentialIssued(
        bytes32 indexed credentialId,
        string issuerDID,
        string holderDID,
        bytes32 credentialHash,
        uint256 expiresAt
    );
    event CredentialRevoked(
        bytes32 indexed credentialId,
        string issuerDID,
        string reason
    );
    event IssuerVerified(string indexed issuerDID, address wallet, uint256 level);
    event IssuerRevoked(string indexed issuerDID);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyVerifiedIssuer(string calldata _issuerDID) {
        require(verifiedIssuers[_issuerDID], "Issuer not verified");
        require(issuerInfo[_issuerDID].wallet == msg.sender, "Not authorized issuer");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Register a verified issuer
     * @param _issuerDID Issuer DID
     * @param _name Issuer name
     * @param _wallet Issuer wallet address
     * @param _level Verification level (1-5)
     */
    function registerIssuer(
        string calldata _issuerDID,
        string calldata _name,
        address _wallet,
        uint256 _level
    ) external onlyAdmin {
        require(_level >= 1 && _level <= 5, "Invalid level");

        issuerInfo[_issuerDID] = IssuerInfo({
            name: _name,
            wallet: _wallet,
            verificationLevel: _level,
            registeredAt: block.timestamp,
            isVerified: true
        });

        verifiedIssuers[_issuerDID] = true;

        emit IssuerVerified(_issuerDID, _wallet, _level);
    }

    /**
     * @dev Revoke an issuer
     * @param _issuerDID Issuer DID to revoke
     */
    function revokeIssuer(string calldata _issuerDID) external onlyAdmin {
        verifiedIssuers[_issuerDID] = false;
        issuerInfo[_issuerDID].isVerified = false;

        emit IssuerRevoked(_issuerDID);
    }

    /**
     * @dev Issue a new credential
     * @param _credentialId Unique credential ID
     * @param _issuerDID Issuer DID
     * @param _holderDID Holder DID
     * @param _credentialHash Hash of credential data
     * @param _schemaHash Hash of credential schema
     * @param _expiresAt Expiration timestamp
     */
    function issueCredential(
        bytes32 _credentialId,
        string calldata _issuerDID,
        string calldata _holderDID,
        bytes32 _credentialHash,
        bytes32 _schemaHash,
        uint256 _expiresAt
    ) external onlyVerifiedIssuer(_issuerDID) {
        require(credentials[_credentialId].issuedAt == 0, "Credential exists");

        Credential memory newCred = Credential({
            credentialId: _credentialId,
            issuerDID: _issuerDID,
            holderDID: _holderDID,
            credentialHash: _credentialHash,
            schemaHash: _schemaHash,
            issuedAt: block.timestamp,
            expiresAt: _expiresAt,
            isActive: true,
            isRevoked: false,
            revocationReason: ""
        });

        credentials[_credentialId] = newCred;
        issuerCredentials[_issuerDID].push(_credentialId);
        holderCredentials[_holderDID].push(_credentialId);

        emit CredentialIssued(_credentialId, _issuerDID, _holderDID, _credentialHash, _expiresAt);
    }

    /**
     * @dev Revoke a credential
     * @param _credentialId Credential to revoke
     * @param _reason Revocation reason
     */
    function revokeCredential(
        bytes32 _credentialId,
        string calldata _reason
    ) external {
        Credential storage cred = credentials[_credentialId];
        require(cred.issuedAt > 0, "Credential not found");
        require(!cred.isRevoked, "Already revoked");
        require(
            keccak256(bytes(cred.issuerDID)) == keccak256(bytes(issuerInfo[cred.issuerDID].issuerDID)) &&
            msg.sender == issuerInfo[cred.issuerDID].wallet,
            "Not authorized"
        );

        cred.isRevoked = true;
        cred.isActive = false;
        cred.revocationReason = _reason;

        emit CredentialRevoked(_credentialId, cred.issuerDID, _reason);
    }

    /**
     * @dev Verify a credential
     * @param _credentialId Credential ID to verify
     * @return isValid Whether credential is valid
     * @return issuerDID Issuer DID
     * @return holderDID Holder DID
     */
    function verifyCredential(bytes32 _credentialId)
        external
        view
        returns (
            bool isValid,
            string memory issuerDID,
            string memory holderDID
        )
    {
        Credential storage cred = credentials[_credentialId];

        bool valid = cred.issuedAt > 0 &&
            !cred.isRevoked &&
            cred.isActive &&
            (cred.expiresAt == 0 || cred.expiresAt > block.timestamp) &&
            verifiedIssuers[cred.issuerDID];

        return (valid, cred.issuerDID, cred.holderDID);
    }

    /**
     * @dev Get credential details
     * @param _credentialId Credential ID
     */
    function getCredential(bytes32 _credentialId)
        external
        view
        returns (Credential memory)
    {
        return credentials[_credentialId];
    }

    /**
     * @dev Get credentials by issuer
     * @param _issuerDID Issuer DID
     */
    function getCredentialsByIssuer(string calldata _issuerDID)
        external
        view
        returns (bytes32[] memory)
    {
        return issuerCredentials[_issuerDID];
    }

    /**
     * @dev Get credentials by holder
     * @param _holderDID Holder DID
     */
    function getCredentialsByHolder(string calldata _holderDID)
        external
        view
        returns (bytes32[] memory)
    {
        return holderCredentials[_holderDID];
    }

    /**
     * @dev Get issuer info
     * @param _issuerDID Issuer DID
     */
    function getIssuerInfo(string calldata _issuerDID)
        external
        view
        returns (IssuerInfo memory)
    {
        return issuerInfo[_issuerDID];
    }

    /**
     * @dev Transfer admin role
     * @param _newAdmin New admin address
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
}
