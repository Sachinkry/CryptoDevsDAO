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
* Minimal Interface for CryptoDevs nft contract containing only two functions  that we are interested in 
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
    // store created proposals in contract state
    // allow CD NFTs holders to create proposals
    // allow CD NFTs holders to vote on proposals given they haven't already voted and the proposal hadn't passed its deadline yet
    // allow holders of CD NFTs to execute purchase() to buy NFT from FakeNFTMarketplace

    // Create a struct named Proposal containing all relevent information
    struct Proposal {
        // nftTokenId - the tokenId of the NFT from FakeNFTMarketplace
        uint256 nftTokenId;
        // deadline - the UNIX timestamp until which proposal is active. proposal will be executed after deadline has ended
        uint256 deadline;
        // yayVotes - no of yay votes for this proposal
        uint256 yayVotes;
        // nayVotes - no of nay votes for this proposal
        uint256 nayVotes;
        // executed - whether or not this proposal has been executed yet. cannot be executed before deadline
        bool executed;
        // voters - a mapping of CryptoDevNFTs tokenIds to boolean indicating whether an NFT has been used to cast vote or not
        mapping(uint256 => bool) voters;   
    }

    // create a mapping of ID to Proposal
    mapping(uint256 => Proposal) public proposals;
    // no of proposals that have been created 
    uint256 public numProposals;

    // Also create instances of interfaces of  FakeNFTMarketplace and CryptoDevsNFT:::::
    IFakeNFTMarketplace nftMarketplace;
    ICryptoDevsNFT cryptoDevsNFT;
    
    // Create a payable constructor which initializes the contract
    // instances for FakeNFTMarketplace and CryptoDevsNFT
    // the payable allows this constructor to access an ETH desposit when it is being deployed
    constructor(address _nftMarketplace, address _cryptoDevsNFT) payable {
        nftMarketplace = IFakeNFTMarketplace(_nftMarketplace);
        cryptoDevsNFT = ICryptoDevsNFT(_cryptoDevsNFT);
    }

    //Create a modifier which only allows a function to be called by someone who owns atleast 1 cryptodev nft
    modifier nftHolderOnly() {
        require(cryptoDevsNFT.balanceOf(msg.sender) > 0, "You don't own any NFT, NOT A DAO MEMBER!!");
        _;
    }

    /// @dev createProposal() allows a CryptoDevs nft holder to create proposals
    /// @param _nftTokenId - the tokenID of the NFT to be purchase from FakeNFTMarketplace
    /// @return returns the proposal index for the newly created proposal
    function createProposal(uint256 _nftTokenId) 
        external 
        nftHolderOnly 
        returns (uint256) 
    {
        require(nftMarketplace.available(_nftTokenId), "NFT NOT FOR SALE!");
        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _nftTokenId;
        // set the proposal's voting deadline to be (current time + 5 minutes)
        proposal.deadline = block.timestamp + 5 minutes;

        numProposals++;
        return numProposals - 1;
    }

    // create a modifier which allows a function to execute only when deadline has not ended
    modifier activeProposalOnly(uint256 proposalIndex) {
        require(proposals[proposalIndex].deadline > block.timestamp, "DEADLINE_EXCEEDED");
        _;
    } 

    // create an enum named Vote containing possible options for a vote
    // YAY = 0
    // NAY = 1
    enum Vote {
        YAY,
        NAY
    }

    /// @dev voteOnProposal allows a CD NFT holder to vote on proposals if deadline not exceeded
    /// @param proposalIndex - the index of the proposal to vote on in proposals array
    /// @param vote - the type of vote they want to cast
    function voteOnProposal(uint256 proposalIndex, Vote vote) 
        external
        nftHolderOnly
        activeProposalOnly(proposalIndex) {
            Proposal storage proposal = proposals[proposalIndex];

            uint256 voterNFTBalance = cryptoDevsNFT.balanceOf(msg.sender);
            uint256 numVotes = 0;

            // calculate how many NFTs are owned by the voter that haven't been already used for voting on this proposal
            for (uint256 i = 0; i < voterNFTBalance; i++){
                uint256 tokenId = cryptoDevsNFT.tokenOfOwnerByIndex(msg.sender, i);
                if (proposal.voters[tokenId] == false) {
                    numVotes++;
                    proposal.voters[tokenId] = true;
                }
            }
            require(numVotes > 0, "ALREADY_VOTED");

            if(vote == Vote.YAY) {
                proposal.yayVotes += numVotes;
            } else {
                proposal.nayVotes += numVotes;
            }
        }

        // Create a modifier which only allows a function to be called 
        // f the the given proposal's deadline has exceeded
        // and if the proposal has not yet been executed
        modifier inactiveProposalOnly(uint256 proposalIndex) {
            require(
                proposals[proposalIndex].deadline <= block.timestamp, "DEADLINE_NOT_EXCEEDED"
            );
            require(
                proposals[proposalIndex].executed == false, "PROPOSAL_ALREADY_EXECUTED"
            );
            _;
        }

        /// @dev executeProposal allows any CryptoDevsNFT holder to execute a proposal after its deadline has been exceeded
        /// @param proposalIndex - the index of the proposal to execute in the proposals array
        function executeProposal(uint256 proposalIndex)
            external
            nftHolderOnly
            inactiveProposalOnly(proposalIndex) {

            Proposal storage proposal = proposals[proposalIndex];

            // If the proposal has more YAY votes than NAY votes
            // purchase the NFT from the FakeNFTMarketplace
            if(proposal.yayVotes > proposal.nayVotes) {
                uint256 nftPrice = nftMarketplace.getPrice();
                require(address(this).balance >= nftPrice, "NOT_ENOUGH_FUNDS");
                nftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
            }
            proposal.executed = true;
        }

        /// @dev withdrawEther allows the contract owner(deployer) to withdraw ETH from the contract
        function withdrawEther() external onlyOwner {
            payable(owner()).transfer(address(this).balance);
        }

        // the following two fucntions allows the contract to accept eth deposits
        // directly from a wallet without calling a function
        receive() external payable {}

        fallback() external payable {}

        
}