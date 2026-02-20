import algosdk from 'algosdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;
const ALGOD_TOKEN = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

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
    console.log('🔍 Verifying deployment on TestNet...');

    // 1. Get deployer address
    const envDeploy = loadEnvFile(path.join(__dirname, '.env.deploy'));
    const mn = envDeploy['DEPLOYER_MNEMONIC'] || process.env.DEPLOYER_MNEMONIC;

    if (!mn) {
        console.error('❌ No mnemonic found in .env.deploy');
        return;
    }

    const account = algosdk.mnemonicToSecretKey(mn);
    console.log(`👤 Checking account: ${account.addr}`);

    // 2. Query Indexer for created apps (using fetch because algosdk indexer might 403)
    // Actually let's use algod account info directly.

    const algod = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
    const info = await algod.accountInformation(account.addr).do();
    // console.log('DEBUG INFO:', JSON.stringify(info, null, 2));

    // Support v2 (kebab) and v3 (camel)
    const createdApps = info['created-apps'] || info.createdApps || info.createdApplications || [];
    console.log(`📦 Found ${createdApps.length} created apps.`);

    // Check specific transaction if account query fails
    const txId = 'VDDHJJMMZLIU3CT4ERD7F2QVRZVSMDIL2QLPSVLJDB2SNG4PEOBA';
    try {
        // Note: pendingTransactionInformation only works for recently confirmed txns in local node mempool/ledger
        // AlgoNode might not have it if it's old. 
        // Better to use Indexer if available, but let's try algod first or just trust account info.

        // Actually, let's use the Indexer since the txn is confirmed.
        // Indexer URL: https://testnet-idx.algonode.cloud
        const indexer = new algosdk.Indexer(ALGOD_TOKEN, 'https://testnet-idx.algonode.cloud', 443);
        const txInfo = await indexer.lookupTransactionByID(txId).do();
        // console.log('DEBUG TX INFO:', JSON.stringify(txInfo, null, 2));

        const confirmedRound = txInfo.transaction['confirmed-round'];
        const createdAppId = txInfo.transaction['created-application-index'];

        if (createdAppId) {
            console.log(`✅ Recovered App ID from TX: ${createdAppId}`);
            // Add it to createdApps list fake to proceed
            createdApps.push({ id: createdAppId });
        }
    } catch (e) {
        console.log('⚠️ Could not fetch TX info:', e.message);
    }

    if (createdApps.length === 0) {
        console.log('⚠️  No apps found. Deployment likely failed.');
        return;
    }

    // Sort by ID descending (newest first)
    createdApps.sort((a, b) => b.id - a.id);
    const newestAppId = createdApps[0].id;

    console.log(`✅ Newest App ID: ${newestAppId}`);

    // 3. Update frontend/.env
    const envPath = path.join(__dirname, 'credential-verifier', 'frontend', '.env');
    let envContent = readFileSync(envPath, 'utf8');

    // Replace valid or undefined/empty
    envContent = envContent
        .replace(/^VITE_APP_ID=.*/m, `VITE_APP_ID=${newestAppId}`)
        .replace(/^VITE_ALGOD_SERVER=.*/m, `VITE_ALGOD_SERVER=${ALGOD_SERVER}`)
        .replace(/^VITE_ALGOD_TOKEN=.*/m, `VITE_ALGOD_TOKEN=`)
        .replace(/^VITE_INDEXER_SERVER=.*/m, `VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud`)
        .replace(/^VITE_INDEXER_TOKEN=.*/m, `VITE_INDEXER_TOKEN=`);

    writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Updated frontend/.env with App ID:', newestAppId);
    console.log(`\n👉 View your app here: https://testnet.explorer.perawallet.app/application/${newestAppId}`);
}

main().catch(e => console.error(e));
