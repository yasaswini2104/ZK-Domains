pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title DomainNFT
 * @notice ERC-721 NFT contract for ZK-Domains representing domain ownership
 * @dev Extends ERC721 with enumerable and URI storage capabilities
 * 
 * This contract mints NFTs that represent ownership of domain names.
 * Each domain is unique and mapped to a tokenId. The NFT can be transferred
 * but the domain name itself remains immutable.
 */
contract DomainNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    mapping(string => uint256) private _domainToTokenId;
    mapping(uint256 => string) private _tokenIdToDomain;
    mapping(string => bool) private _domainExists;

    /**
    @notice Emitted when a new domain is minted
    */
    event DomainMinted(
        address indexed to,
        uint256 indexed tokenId,
        string domainName
    );

    constructor() ERC721("ZK-Domain", "ZKDOMAIN") Ownable(msg.sender) {
        // Start token IDs from 1 (0 is reserved for null/invalid)
        _tokenIdCounter.increment();
    }

    /**
     * @notice Mint a new domain NFT
     * Requirements:
     * - Domain name must not be empty
     * - Domain name must not already exist
     * - Only owner can call this function
     */
    function mintDomain(
        address to,
        string memory domainName
    ) external onlyOwner returns (uint256) {
        require(bytes(domainName).length > 0, "Domain name cannot be empty");
        require(!_domainExists[domainName], "Domain already exists");
        require(to != address(0), "Cannot mint to zero address");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        
        _domainToTokenId[domainName] = tokenId;
        _tokenIdToDomain[tokenId] = domainName;
        _domainExists[domainName] = true;

        emit DomainMinted(to, tokenId, domainName);

        return tokenId;
    }

    function getDomainTokenId(
        string memory domainName
    ) external view returns (uint256) {
        require(_domainExists[domainName], "Domain does not exist");
        return _domainToTokenId[domainName];
    }

    function getTokenDomain(
        uint256 tokenId
    ) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenIdToDomain[tokenId];
    }

    function domainExists(string memory domainName) external view returns (bool) {
        return _domainExists[domainName];
    }

    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function getDomainsOfOwner(
        address owner
    ) external view returns (string[] memory) {
        uint256 balance = balanceOf(owner);
        string[] memory domains = new string[](balance);

        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            domains[i] = _tokenIdToDomain[tokenId];
        }

        return domains;
    }

    // Override required functions for multiple inheritance

    /**
     * @dev Override for _update to handle enumerable extension
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }


    /**
     * @dev Override for _increaseBalance to handle enumerable extension
     */
    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Override for tokenURI to handle URI storage
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override for supportsInterface to handle multiple extensions
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}