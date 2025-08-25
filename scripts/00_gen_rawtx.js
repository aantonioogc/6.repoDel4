const ethers = require("ethers");

async function main() {
  const wallet = ethers.Wallet.createRandom();
  const tx = {
    type: 2,
    to: wallet.address,
    value: ethers.utils.parseEther("0.01"),
    gasLimit: 21000,
    maxFeePerGas: ethers.utils.parseUnits("2", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("1.5", "gwei"),
    nonce: 0,
    chainId: 1
  };

  // usamos una wallet prefabricada de hardhat (tiene clave conocida)
  const signer = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  );

  const rawTx = await signer.signTransaction(tx);
  console.log("RAW_TX=", rawTx);
}

main();
