/**
 * deploy_testnet.mjs
 * Deploys CredentialVerifier to Algorand TestNet using AlgoNode (no local sandbox needed).
 *
 * Usage:
 *   1. Create a .env.deploy file in this directory with:
 *      DEPLOYER_MNEMONIC=word1 word2 ... word25
 *   2. Run: node deploy_testnet.mjs
 *
 * After a successful deploy, this script will automatically update
 * credential-verifier/frontend/.env with the new VITE_APP_ID.
 */

import algosdk from 'algosdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline/promises';

// ── Config ────────────────────────────────────────────────────────────────────
const NODES = [
    {
        url: 'https://testnet-api.algonode.cloud',
        port: 443,
        token: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    },
    {
        url: 'https://testnet-api.4160.nodely.dev',
        port: 443,
        token: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    },
    {
        url: 'https://algorand-testnet.publicnode.com',
        port: 443,
        token: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    },
];

async function getWorkingAlgod() {
    console.log('🔗 Connecting to Algorand TestNet...');
    for (const node of NODES) {
        try {
            const algod = new algosdk.Algodv2(node.token, node.url, node.port);
            const status = await algod.status().do();
            console.log(`   ✅ Connected to ${node.url}`);
            console.log(`   Node last round: ${status['last-round']}`);
            return { algod, url: node.url, port: node.port, token: node.token };
        } catch (e) {
            console.log(`   ❌ Failed to connect to ${node.url}: ${e.message}`);
        }
    }
    throw new Error('Could not connect to any TestNet node. Please check your internet connection.');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
    try {
        const text = readFileSync(filePath, 'utf8');
        const vars = {};
        for (const line of text.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) continue;
            const key = trimmed.slice(0, eqIdx).trim();
            const value = trimmed.slice(eqIdx + 1).trim();
            vars[key] = value;
        }
        return vars;
    } catch {
        return {};
    }
}

async function getMnemonic() {
    // Try .env.deploy first, then process.env
    const envDeploy = loadEnvFile(path.join(__dirname, '.env.deploy'));
    let mn = envDeploy['DEPLOYER_MNEMONIC'] || process.env.DEPLOYER_MNEMONIC || '';
    if (mn) return mn.trim();

    // Fall back to interactive prompt
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    mn = await rl.question('Enter your TestNet account mnemonic (25 words): ');
    rl.close();
    return mn.trim();
}

/**
 * Updates frontend .env with the new App ID and the working node URL
 */
function updateFrontendEnv(appId, nodeUrl, nodePort, nodeToken) {
    const envPath = path.join(__dirname, 'credential-verifier', 'frontend', '.env');
    const current = readFileSync(envPath, 'utf8');

    // Convert token to string if it's an object (for existing env file format)
    // But for frontend we typically want a simple URL.
    // Ideally we just update the server URL.

    const tokenStr = (typeof nodeToken === 'string') ? nodeToken : '';

    const updated = current
        .replace(/^VITE_APP_ID=.*/m, `VITE_APP_ID=${appId}`)
        .replace(/^VITE_ALGOD_SERVER=.*/m, `VITE_ALGOD_SERVER=${nodeUrl}`)
        .replace(/^VITE_ALGOD_TOKEN=.*/m, `VITE_ALGOD_TOKEN=${tokenStr}`)
        .replace(/^VITE_INDEXER_SERVER=.*/m, `VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud`) // Indexer usually fine
        .replace(/^VITE_INDEXER_TOKEN=.*/m, `VITE_INDEXER_TOKEN=`);

    writeFileSync(envPath, updated, 'utf8');
    console.log(`\n✅ Updated frontend/.env:`);
    console.log(`   VITE_APP_ID=${appId}`);
    console.log(`   VITE_ALGOD_SERVER=${nodeUrl}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    // 1. Connect to a working node
    let algodClient, nodeUrl, nodePort, nodeToken;
    try {
        const conn = await getWorkingAlgod();
        algodClient = conn.algod;
        nodeUrl = conn.url;
        nodePort = conn.port;
        nodeToken = conn.token;
    } catch (e) {
        console.error(`\n❌ ${e.message}`);
        console.error('   Try checking your internet connection or using a VPN.');
        process.exit(1);
    }

    // Load mnemonic
    const mn = await getMnemonic();
    if (!mn) {
        console.error('❌ No mnemonic provided. Aborting.');
        process.exit(1);
    }

    const account = algosdk.mnemonicToSecretKey(mn);
    console.log(`\n👤 Deployer: ${account.addr}`);

    // Check balance
    const info = await algodClient.accountInformation(account.addr).do();
    const balanceAlgo = Number(info.amount) / 1e6;
    console.log(`   Balance : ${balanceAlgo.toFixed(6)} ALGO`);
    if (balanceAlgo < 0.2) {
        console.error('❌ Insufficient balance. Fund your account at:');
        console.error('   https://dispenser.testnet.aws.algodev.network/');
        process.exit(1);
    }

    // Load compiled bytecode from ARC56 JSON
    const arc56Path = path.join(
        __dirname,
        'credential-verifier', 'frontend', 'src', 'lib', 'CredentialVerifier.arc56.json'
    );
    const arc56 = JSON.parse(readFileSync(arc56Path, 'utf8'));

    const approval = new Uint8Array(Buffer.from(arc56.byteCode.approval, 'base64'));
    const clear = new Uint8Array(Buffer.from(arc56.byteCode.clear, 'base64'));

    console.log(`\n📦 Bytecode loaded from ${path.basename(arc56Path)}`);
    console.log(`   Approval program : ${approval.length} bytes`);
    console.log(`   Clear    program : ${clear.length} bytes`);

    // Build the ApplicationCreate transaction
    const sp = await algodClient.getTransactionParams().do();

    const txn = algosdk.makeApplicationCreateTxnFromObject({
        sender: account.addr,
        suggestedParams: sp,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram: approval,
        clearProgram: clear,
        numGlobalInts: 0,
        numGlobalByteSlices: 1,   // admin key
        numLocalInts: 0,
        numLocalByteSlices: 0,
        extraPages: 0,
    });

    // Sign with the deployer's secret key
    const signedTxn = txn.signTxn(account.sk);

    console.log('\n🚀 Sending deployment transaction...');
    const { txid } = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`   Tx ID: ${txid}`);

    const result = await algosdk.waitForConfirmation(algodClient, txid, 8);
    const appId = result['application-index'];

    console.log(`\n✅ CredentialVerifier deployed successfully!`);
    console.log(`   App ID      : ${appId}`);
    console.log(`   Tx ID       : ${txid}`);
    console.log(`\n🔍 View on explorer:`);
    console.log(`   https://testnet.explorer.perawallet.app/application/${appId}`);

    // Auto-update frontend/.env
    updateFrontendEnv(appId, nodeUrl, nodePort, nodeToken);
}

main().catch(e => { console.error('\n❌', e.message ?? e); process.exit(1); });
