const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const { abi, evm } = require("./compile");

const mneumonic =
  "target position reason garbage siren nose agent joke obvious matrix draft gown";
const testnetURL =
  "https://rinkeby.infura.io/v3/4312ae360bf54afda938235b99b07521";

const provider = new HDWalletProvider(mneumonic, testnetURL);

const web3 = new Web3(provider);

const googleDriveStringURL =
  "https://docs.google.com/document/d/136mGW-sehht8XlWmeGCtU3_0XuAemkoiU1ORiouE5Zo/edit?usp=sharing";

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();

  console.log("Attempting to deploy from account: ", accounts[0]);

  const result = await new web3.eth.Contract(abi)
    .deploy({ data: evm.bytecode.object, arguments: [googleDriveStringURL] })
    .send({ gas: 1000000, from: accounts[0] });

  console.log("Contract deployed to: ", result.options.address);
  provider.engine.stop();
};

deploy();

// deployed contract address: ___
