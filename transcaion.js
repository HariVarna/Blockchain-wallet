const { Wallet, JsonRpcProvider, formatEther, parseEther, isAddress } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load local wallet.json if present
let walletData = null;
const walletJsonPath = path.join(__dirname, "wallet.json");

if (fs.existsSync(walletJsonPath)) {
    try {
        walletData = JSON.parse(fs.readFileSync(walletJsonPath, "utf8"));
    } catch (e) {
        console.error("Error reading wallet.json:", e.message);
    }
}

async function main() {
    console.log("==========================================");
    console.log("   Ethereum Wallet & Transaction Tool     ");
    console.log("==========================================");

    if (!walletData) {
        console.log("No wallet.json found. Creating a new wallet first...");
        const newWallet = Wallet.createRandom();
        walletData = {
            walletAddress: newWallet.address,
            privateKey: newWallet.privateKey,
            mnemonicPhrase: newWallet.mnemonic.phrase
        };
        fs.writeFileSync(walletJsonPath, JSON.stringify(walletData, null, 2));
        console.log("New wallet generated and saved to wallet.json!");
    }

    console.log(`\nActive Wallet Address: ${walletData.walletAddress}`);

    // Connect to Sepolia Testnet RPC Provider
    const rpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";
    const provider = new JsonRpcProvider(rpcUrl);

    try {
        console.log("Connecting to Sepolia Testnet RPC...");
        const balanceWei = await provider.getBalance(walletData.walletAddress);
        const balanceEth = formatEther(balanceWei);

        console.log(`Balance: ${balanceEth} ETH`);

        const feeData = await provider.getFeeData();
        if (feeData.gasPrice) {
            console.log(`Current Gas Price: ${formatEther(feeData.gasPrice * 1000000000n)} Gwei`);
        }

        // Example transaction building demonstration
        const wallet = new Wallet(walletData.privateKey, provider);
        console.log("\nWallet instance successfully initialized with private key.");
        console.log("To send a transaction via CLI, supply a target recipient address and ETH amount.");

    } catch (err) {
        console.error("RPC Connection Error:", err.message);
    }
}

main().catch(console.error);
