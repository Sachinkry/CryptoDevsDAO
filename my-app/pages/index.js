import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { Contract, providers, utils } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import Web3Modal from "web3modal";
import { useState, useEffect, useRef } from "react";
import {
  CRYPTODEVS_DAO_ABI,
  CRYPTODEVS_DAO_CONTRACT_ADDRESS,
  CRYPTODEVS_NFT_ABI,
  CRYPTODEVS_NFT_CONTRACT_ADDRESS,
} from "../constants";

export default function Home() {
  // keep track of whether wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // useRef creates an object with 'current' property and assigns it web3ModalRef
  const web3ModalRef = useRef();
  // ETH balance of the DAO contract
  const [treasuryBalance, setTreasuryBalance] = useState("6");
  // no of CD nfts owned by the user
  const [nftBalance, setNftBalance] = useState("0");
  // no of proposals in the dao
  const [numProposals, setNumProposals] = useState("0");
  // array of proposals created in dao
  const [proposals, setProposals] = useState([]);
  // fake nft token ID to purchase when creating a proposal
  const [fakeNftTokenId, setFakeNftTokenId] = useState("");
  // one of 'create Proposal' or 'view Proposal'
  const [selectedTab, setSelectedTab] = useState("");
  const [loading, setLoading] = useState(false);
  // useEffect to render the Home component every time there's change in 'walletConnected' value
  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet().then(() => {
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumProposalsInDAO();
      });
    }
  }, [walletConnected]);

  // this code will run everytime there's a change in 'selectedTab' state variable
  // used to re-fetch all proposals in the DAO when user switches to the "View Proposals"
  useEffect(() => {
    if (selectedTab === 'View Proposals') {
      fetchAllProposals();
    }
    console.log(proposals);
  }, [selectedTab]);

  // get provider or signer
  const getProviderOrSigner = async (needSigner = false) => {
    try {
      const provider = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(provider);
      const { chainId } = await web3Provider.getNetwork();

      if (chainId !== 4) {
        window.alert("Please switch to Rinkeby network");
        throw new Error("NOT ON RINKEBY NETWORK!!!");
      }

      if (needSigner) {
        const signer = await web3Provider.getSigner();
        return signer;
      }
      console.log("hello");

      return web3Provider;
    } catch (err) {
      console.log(err);
    }
  }
  // connect wallet to the dapp
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  }

  // Read the ETH balance of the DAO contract and keep track of it using state variable 'treasuryBalance'
  const getDAOTreasuryBalance = async () => {
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(
        CRYPTODEVS_DAO_CONTRACT_ADDRESS
      );
      console.log(formatEther(balance));
      setTreasuryBalance(balance.toString());
    } catch (err) {
      console.error(err);
    }
  }

  // get no of proposals in the DAO and set 'numProposals' state variable
  const getNumProposalsInDAO = async () => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = cryptoDevsDAOContractInstance(provider);
      const numProposalsInDAO = await daoContract.numProposals();
      setNumProposals(numProposalsInDAO.toString());
    } catch (err) {
      console.error(err);
    }
  }

  // get no of cryptoDevs NFT owned by the connected address and set 'nftBalance' state variable
  const getUserNFTBalance = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = cryptoDevsNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));
    } catch (err) {
      console.error(err);
    }
  }

  // createProposal function 
  const createProposal = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = cryptoDevsDAOContractInstance(signer);
      const txn = await daoContract.createProposal(fakeNftTokenId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  }

  // helper function to get a proposal by id
  const fetchProposalById = async (id) => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = cryptoDevsDAOContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      return parsedProposal;
    } catch (err) {
      console.error(err);
    }
  }

  // fetchAllProposals function 
  // it runs loop on 'numProposals' to fetch all proposal in the DAO and push them to state variable 'proposals'
  const fetchAllProposals = async () => {
    try {
      const proposals = [];
      for (let i = 0; i < numProposals; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      console.log(proposals);
      return proposals;
    } catch (err) {
      console.error(err);
    }
  }

  // 'voteOnProposal' function using the passed proposalId and Vote
  const voteOnProposal = async (proposalId, _vote) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = cryptoDevsDAOContractInstance
        (signer);

      let vote = _vote === "YAY" ? 0 : 1;
      const txn = await daoContract.voteOnProposal(proposalId, vote);

      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();

    } catch (err) {
      console.error(err);
    }
  };

  // 'executeProposal' function using proposal ID
  const executeProposal = async (proposalId) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = cryptoDevsDAOContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);
      // const value = proposalId
      // console.log(value);
      // const txn = await daoContract.executeProposal(proposalId, {
      //   value: utils.parseEther(value.toString()),
      // })

      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch (error) {
      // console.error(error);
      // window.alert(error.data.message);
      if (error.data && error.data.message) {
        window.alert(error.data.message)
      } else {
        window.alert(error)
      }
    }
  }
  // get cryptodevs nft contract instance
  const cryptoDevsNFTContractInstance = (providerOrSigner) => {
    return new Contract(
      CRYPTODEVS_NFT_CONTRACT_ADDRESS,
      CRYPTODEVS_NFT_ABI,
      providerOrSigner
    );
  };

  // get cryptoDevs DAO contract instance
  const cryptoDevsDAOContractInstance = (providerOrSigner) => {
    return new Contract(
      CRYPTODEVS_DAO_CONTRACT_ADDRESS,
      CRYPTODEVS_DAO_ABI,
      providerOrSigner
    );
  };

  // render the contents of the appropriate tab based on 'selectedTab'
  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }

  // render the "Create Proposal" tab content
  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>Loading... Waiting for transaction...</div>
      );
    } else if (nftBalance === 0) {
      return (
        <div className={styles.container}>
          You do not own any CryptoDevs NFTs. <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.description}>
          <label>Fake NFT Token ID to purchase: </label>
          <input
            placeholder='0'
            type='number'
            onChange={(e) => setFakeNftTokenId(e.target.value)}
          />
          <button className={styles.button2} onClick={createProposal}>Create</button>
        </div>
      );
    }
  }
  // render 'View Proposals' tab content
  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>No proposals have been created</div>
      );
    } else {
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes} </p>
              <p>Nay Votes: {p.nayVotes} </p>
              <p>Executed?: {p.executed.toString()} </p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button}
                    onClick={() => voteOnProposal(p.proposalId, "YAY")}
                  >
                    Vote YAY
                  </button><br />
                  <button
                    className={styles.button}
                    onClick={() => voteOnProposal(p.proposalId, "NAY")}
                  >
                    Vote NAY
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button}
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    Execute Proposal{" "}
                    {p.yayVotes > p.nayVotes ? "YAY" : "NAY"}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal executed</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div>
      <Head>
        <title>CryptoDevs DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>
            Your CryptoDevs NFT Balance: {nftBalance}
            <br />
            Treasury Balance: {formatEther(treasuryBalance)} ETH
            <br />
            Total Number of Proposals: {numProposals}
          </div>
          <div className={styles.flex}>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("Create Proposal")}
            >
              Create Proposal
            </button>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("View Proposals")}
            >
              View Proposals
            </button>
            {renderTabs()}
          </div>
          <br />
          <button className={styles.button} onClick={connectWallet}>Connect Wallet</button>
        </div>
        <div>
          <img className={styles.image} src="/cryptodevs/0.svg" />
        </div>
      </div>

    </div>
  )
}
