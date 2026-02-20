
import algosdk from 'algosdk';

const INDEXER = 'https://testnet-idx.algonode.cloud';
const TX_ID = 'VDDHJJMMZLIU3CT4ERD7F2QVRZVSMDIL2QLPSVLJDB2SNG4PEOBA';

async function main() {
    const indexer = new algosdk.Indexer({}, INDEXER, 443);
    try {
        const info = await indexer.lookupTransactionByID(TX_ID).do();
        const txn = info.transaction;
        // Check both casing styles just in case
        const appId = txn['created-application-index'] || txn.createdApplicationIndex;

        if (appId) {
            console.log('APP_ID_FOUND:', appId);
        } else {
            console.log('NO_APP_ID_FOUND');
            // Maybe check inner txns?
            if (txn['inner-txns'] && txn['inner-txns'].length > 0) {
                const inner = txn['inner-txns'][0];
                const innerAppId = inner['created-application-index'] || inner.createdApplicationIndex;
                if (innerAppId) console.log('INNER_APP_ID_FOUND:', innerAppId);
            }
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

main();
