const { ethers } = require("hardhat");
const { CRYPTODEVS_NFT_CONTRACT_ADDRESS } = require("../constants");

async function main() {

  // deploy the fakeNftMarketplace first
  const FakeNFTMarketplace = await ethers.getContractFactory("FakeNFTMarketplace");

  const fakeNftMarketplace = await FakeNFTMarketplace.deploy();
  await fakeNftMarketplace.deployed();

  console.log(
    "FakeNFTMarketplace deployed to:",
    fakeNftMarketplace.address
  );

  // Now deploy the CryptodevsDao contract
  const CryptodevsDaoContract = await ethers.getContractFactory("CryptoDevsDAO");
  const cryptodevsDao = await CryptodevsDaoContract.deploy(
    fakeNftMarketplace.address,
    CRYPTODEVS_NFT_CONTRACT_ADDRESS,
    {
      value: ethers.utils.parseEther("0.1")
    }
  );
  await cryptodevsDao.deployed();

  console.log(
    "CryptoDevsDAOContract deployed to:",
    cryptodevsDao.address
  )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
