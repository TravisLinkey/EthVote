const path = require("path");
const fs = require("fs");
const solc = require("solc");

const ethvotePath = path.resolve(__dirname, "contracts", "EthVote.sol");
const source = fs.readFileSync(ethvotePath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "EthVote.sol": {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      "*": {
        "*": ["*"],
      },
    },
  },
};

module.exports = JSON.parse(solc.compile(JSON.stringify(input))).contracts[
  "EthVote.sol"
].EthVote;
