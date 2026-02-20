import algosdk from 'algosdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const NODES = [
    { url: 'https://testnet-api.algonode.cloud', port: 443, token: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
    { url: 'https://testnet-api.4160.nodely.dev', port: 443, token: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
];

async function getWorkingAlgod() {
    for (const node of NODES) {
        try {
            const algod = new algosdk.Algodv2(node.token, node.url, node.port);
            await algod.status().do();
            return algod;
        } catch (e) { }
    }
    throw new Error('Could not connect to TestNet');
}

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
    } catch { return {}; }
}

async function main() {
    console.log('💰 Funding Smart Contract...');

    const frontendEnv = loadEnvFile(path.join(__dirname, 'credential-verifier', 'frontend', '.env'));
    const appIdStr = frontendEnv['VITE_APP_ID'];
    if (!appIdStr || appIdStr === 'undefined') {
        process.exit(1);
    }
    const appId = parseInt(appIdStr);
    const appAddr = algosdk.getApplicationAddress(appId);

    const envDeploy = loadEnvFile(path.join(__dirname, '.env.deploy'));
    const mn = envDeploy['DEPLOYER_MNEMONIC'] || process.env.DEPLOYER_MNEMONIC;
    if (!mn) process.exit(1);

    const sender = algosdk.mnemonicToSecretKey(mn);
    const algod = await getWorkingAlgod();
    const sp = await algod.getTransactionParams().do();

    const amount = 2_000_000;

    // Explicit strings
    const fromStr = typeof sender.addr === 'string' ? sender.addr : sender.addr.toString();
    const toStr = typeof appAddr === 'string' ? appAddr : appAddr.toString();

    console.log(`DEBUG: From=${fromStr} To=${toStr} Amount=${amount}`);

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: fromStr,
        to: toStr,
        amount: amount,
        suggestedParams: sp,
    });

    const signedTxn = txn.signTxn(sender.sk);
    const { txId } = await algod.sendRawTransaction(signedTxn).do();

    console.log(`🚀 Sending 2 ALGO... TxID: ${txId}`);
    await algosdk.waitForConfirmation(algod, txId, 4);

    console.log('✅ Contract Funded! You can now use the app.');
}

main().catch(e => console.error('CRASH:', e));
