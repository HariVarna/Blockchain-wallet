const { Wallet } = require("ethers");
const fs = require("fs");

const wallet = Wallet.createRandom();
const walletData = {
    walletAddress: wallet.address,
    privateKey: wallet.privateKey,
    mnemonicPhrase: wallet.mnemonic.phrase
};

fs.writeFileSync(
    "wallet.json",
    JSON.stringify(walletData, null, 2)
);

console.log("Wallet created successfully.");