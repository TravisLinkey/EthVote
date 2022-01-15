// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract EthVote {
    enum State {
        BALLOT_CREATED,
        BALLOT_OPEN,
        BALLOT_CLOSED
    }

    State public currentState;

    struct Candidate {
        string description;
        uint256 numVotes;
    }
    Candidate[] public candidates;
    Candidate public voteWinner;

    address payable public ballotCreator;
    uint256 public totalVotes;

    modifier creatorOnly() {
        require(
            msg.sender == ballotCreator,
            "Only creator of ballot can use call this funciton."
        );
        _;
    }

    modifier ballotCreated() {
        require(currentState == State.BALLOT_CREATED);
        _;
    }

    modifier ballotOpen() {
        require(currentState == State.BALLOT_OPEN);
        _;
    }

    constructor() {
        ballotCreator = payable(msg.sender);
        totalVotes = 0;
        currentState = State.BALLOT_CREATED;
    }

    function addCandidate(string memory description)
        external
        creatorOnly
        ballotCreated
    {
        Candidate memory newCandidate = Candidate(description, 0);
        candidates.push(newCandidate);
    }

    function startVote() external creatorOnly ballotCreated {
        require(candidates.length > 1, "There must be at least two candidates");
        currentState = State.BALLOT_OPEN;
    }

    function placeVote(uint256 candidateNum) external payable ballotOpen {
        require(msg.value >= 100, "Must pay minimum 100 to vote.");
        require(candidateNum < candidates.length, "Candidate does not exist.");
        candidates[candidateNum].numVotes += 1;
        totalVotes += 1;
    }

    function chooseWinner() external ballotOpen creatorOnly {
        uint256 maxVotes = 0;
        uint256 winnerIndex = 999;
        uint256 secondPlace = 999;

        for (uint256 i; i < candidates.length; i++) {
            if (candidates[i].numVotes > maxVotes) {
                winnerIndex = i;
                maxVotes = candidates[i].numVotes;
            }

            if (candidates[i].numVotes == maxVotes) {
                secondPlace = i;
            }
        }

        require(maxVotes > 0, "No votes were cast");

        currentState = State.BALLOT_CLOSED;
        ballotCreator.transfer(address(this).balance);

        if (
            secondPlace != 999 && candidates[secondPlace].numVotes == maxVotes
        ) {
            voteWinner = Candidate("Vote was a tie!", maxVotes);
        } else {
            voteWinner = candidates[winnerIndex];
        }
    }
}
