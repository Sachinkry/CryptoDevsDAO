// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

/*
*  Interface for the FakeNFTMarketplace
*/
interface IFakeNFTMarketplace {
    /// @dev getPrice() returns the price of each NFT
    /// @return returns the price in wei for each fake NFT
    function getPrice() external view returns (uint256);

    /// @dev available() checks if the tokenId is sold or not
    /// @return returns a boolean value
    function available(uint256 _tokenId) external view returns (bool);

    /// @dev purchase() purchases the fake Nft from FakeNFTMarketplace
    /// @param _tokenId - the fake Token Id to purchase
    function purchase(uint256 _tokenId) external payable; 
}

/*
* Minimal Interface for CryptoDevs nft contract     containing only two functions  that we are interested in 
*/
interface ICryptoDevsNFT {
    /// @dev balanceOf() returns the no of CryptoDev NFTs owned by an address
    /// @param owner - address to fetch no of nfts for
    /// @return returns the no of nfts owned by owner
    function balanceOf(address owner) external view returns (uint256);

    /// @dev tokenOfOwnerByIndex() returns token Id at given index for owner
    /// @param owner - address to fetch tokenId for
    /// @param index - index of the owned nfts array by owner
    /// @return returns the tokenId of the NFT
    function tokenOfOwnerByIndex(address owner, uint256 index) 
       external 
       view 
       returns (uint256);
}


contract CryptoDevsDAO is Ownable {

}