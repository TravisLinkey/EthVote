const assert = require("assert");
const { expect } = require("chai");
const ganache = require("ganache-cli");
const { execPath } = require("process");
const Web3 = require("web3");
const web3 = new Web3(ganache.provider());

const { abi, evm } = require("../compile");

let accounts;
let ethvote;

beforeEach(async () => {
  // Get a list of accounts
  accounts = await web3.eth.getAccounts();

  // 1. deploy the contract
  ethvote = await new web3.eth.Contract(abi)
    .deploy({
      data: evm.bytecode.object,
      arguments: [],
    })
    .send({ from: accounts[0], gas: "6000000" });
});

describe("EthVote", async () => {
  it("deploys a contract", () => {
    assert.ok(ethvote.options.address);
  });

  it("adds 1st candidate", async () => {
    const candidateDesc = "I want to INCREASE fees!";
    await ethvote.methods
      .addCandidate(candidateDesc)
      .send({ from: accounts[0] });

    const candidate = await ethvote.methods.candidates(0).call();
    assert.ok(candidate.description, candidateDesc);
  });

  it("adds 2nd candidate", async () => {
    const firstCandidateDesc = "I want to INCREASE fees!";
    const secondCandidateDesc = "I want to REDUCE fees!";
    await ethvote.methods
      .addCandidate(firstCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods
      .addCandidate(secondCandidateDesc)
      .send({ from: accounts[0] });

    const candidate = await ethvote.methods.candidates(1).call();
    assert.ok(candidate.description, secondCandidateDesc);
  });

  it("starts the vote", async () => {
    const firstCandidateDesc = "I want to INCREASE fees!";
    const secondCandidateDesc = "I want to REDUCE fees!";
    await ethvote.methods
      .addCandidate(firstCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods
      .addCandidate(secondCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods.startVote().send({ from: accounts[0] });
    const currentState = await ethvote.methods.currentState().call();
    assert.ok(currentState, "1");
  });

  it("lets user place a vote", async () => {
    const firstCandidateDesc = "I want to INCREASE fees!";
    const secondCandidateDesc = "I want to REDUCE fees!";
    await ethvote.methods
      .addCandidate(firstCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods
      .addCandidate(secondCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods.startVote().send({ from: accounts[0] });
    await ethvote.methods
      .placeVote(1)
      .send({ from: accounts[1], value: "100000000" });
    const candidate = await ethvote.methods.candidates(1).call();
    assert.ok(candidate.numVotes, "1");
  });

  it("let a different user place a vote", async () => {
    const firstCandidateDesc = "I want to INCREASE fees!";
    const secondCandidateDesc = "I want to REDUCE fees!";
    await ethvote.methods
      .addCandidate(firstCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods
      .addCandidate(secondCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods.startVote().send({ from: accounts[0] });
    await ethvote.methods
      .placeVote(1)
      .send({ from: accounts[1], value: "100" });
    await ethvote.methods
      .placeVote(1)
      .send({ from: accounts[2], value: "100" });
    const candidate = await ethvote.methods.candidates(1).call();
    assert.ok(candidate.numVotes, "2");
  });

  it("decides the winner", async () => {
    const firstCandidateDesc = "I want to INCREASE fees!";
    const secondCandidateDesc = "I want to REDUCE fees!";
    await ethvote.methods
      .addCandidate(firstCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods
      .addCandidate(secondCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods.startVote().send({ from: accounts[0] });

    const balance = await web3.eth.getBalance(accounts[2]);

    await ethvote.methods
      .placeVote(1)
      .send({ from: accounts[2], value: "100" });

    const winner = await ethvote.methods
      .chooseWinner()
      .send({ from: accounts[0], gas: "100000" });
    const secondCandidate = await ethvote.methods.candidates(1).call();
    assert.ok(winner, secondCandidate);
  });

  it("finishes the vote, pays the contract creator", async () => {
    const firstCandidateDesc = "I want to INCREASE fees!";
    const secondCandidateDesc = "I want to REDUCE fees!";

    const beforeBalance = await web3.eth.getBalance(accounts[0]);

    await ethvote.methods
      .addCandidate(firstCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods
      .addCandidate(secondCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods.startVote().send({ from: accounts[0] });

    await ethvote.methods
      .placeVote(1)
      .send({ from: accounts[2], value: "100000000000000000" });

    await ethvote.methods
      .chooseWinner()
      .send({ from: accounts[0], gas: "100000" });
    const contractState = ethvote.methods.currentState().call();
    assert.ok(contractState, "2");

    const afterBalance = await web3.eth.getBalance(accounts[0]);
    assert.ok(parseInt(afterBalance) > parseInt(beforeBalance));
  });

  it("user votes for non-candidate, gives their money back", async () => {
    const firstCandidateDesc = "I want to INCREASE fees!";
    const secondCandidateDesc = "I want to REDUCE fees!";
    await ethvote.methods
      .addCandidate(firstCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods
      .addCandidate(secondCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods.startVote().send({ from: accounts[0] });

    try {
      await ethvote.methods
        .placeVote(2)
        .send({ from: accounts[1], value: "100" });
      throw new Error("Did not work");
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql(
        "VM Exception while processing transaction: revert Candidate does not exist."
      );
    }
  });

  // extra
  it("resolves a tie", async () => {
    const firstCandidateDesc = "I want to INCREASE fees!";
    const secondCandidateDesc = "I want to REDUCE fees!";

    await ethvote.methods
      .addCandidate(firstCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods
      .addCandidate(secondCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods.startVote().send({ from: accounts[0] });
    await ethvote.methods
      .placeVote(1)
      .send({ from: accounts[2], value: "100" });
    await ethvote.methods
      .placeVote(0)
      .send({ from: accounts[1], value: "100" });
    await ethvote.methods
      .chooseWinner()
      .send({ from: accounts[0], gas: "1000000" });

    const winner = await ethvote.methods.voteWinner().call();
    assert.ok(winner.description, "Vote was a Tie");
    assert.ok(winner.numVotes, "1");
  });

  it("checks there were votes", async () => {
    const firstCandidateDesc = "I want to INCREASE fees!";
    const secondCandidateDesc = "I want to REDUCE fees!";

    await ethvote.methods
      .addCandidate(firstCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods
      .addCandidate(secondCandidateDesc)
      .send({ from: accounts[0] });
    await ethvote.methods.startVote().send({ from: accounts[0] });

    try {
      await ethvote.methods
        .chooseWinner()
        .send({ from: accounts[0], gas: "1000000" });
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql(
        "VM Exception while processing transaction: revert No votes were cast"
      );
    }
  });
  it("checks there were at least two candidates", async () => {
    const firstCandidateDesc = "I want to INCREASE fees!";

    await ethvote.methods
      .addCandidate(firstCandidateDesc)
      .send({ from: accounts[0] });
    try {
      await ethvote.methods.startVote().send({ from: accounts[0] });
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e.message).to.eql(
        "VM Exception while processing transaction: revert There must be at least two candidates"
      );
    }
  });
});
