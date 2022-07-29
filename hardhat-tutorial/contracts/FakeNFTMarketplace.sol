// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract FakeNFTMarketplace {
    /// @dev mapping of fake Token Id to owner's address
    mapping(uint256 => address) public tokens;
    /// @dev assign the price of each fake NFT
    uint256 nftPrice = 0.01 ether;

    /// @dev purchase() to purchase NFT from the fakeNFTmarketplace 
    /// @param _tokenId - the fake NFT token id to purchase
    function purchase(uint256 _tokenId) external payable {
        require(msg.value == nftPrice, "The Price of each NFT is 0.1 ETH");
        tokens[_tokenId] = msg.sender;
    }

    /// @dev getPrice() returns the price of each fake nft
    function getPrice() external view returns (uint256) {
        return nftPrice;
    }

    /// @dev available() checks if the given tokenId is available or not i.e sold or not
    /// @param _tokenId - the tokenId to be checked for availability
    function available(uint256 _tokenId) external view returns (bool) {
        // address(0) represents the default address for solidity smart contracts
        if(tokens[_tokenId] == address(0)) {
            return true;
        }
        return false;
    } 
}