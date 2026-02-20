/**
 * gen_account.mjs
 * Generates a fresh Algorand account (keypair) and prints the address + mnemonic.
 * Paste the mnemonic into .env.deploy, fund the address at the TestNet dispenser,
 * then run: node deploy_testnet.mjs
 */

import algosdk from 'algosdk';

const account = algosdk.generateAccount();
const mn = algosdk.secretKeyToMnemonic(account.sk);
const address = account.addr.toString(); // algosdk v2: addr is an object, not a string

console.log('\n🔑 New Algorand TestNet account generated\n');
console.log('  Address  :', address);
console.log('  Mnemonic :', mn);
console.log('\n📋 Next steps:');
console.log('  1. Fund this address at:');
console.log('     https://dispenser.testnet.aws.algodev.network/');
console.log('  2. Paste the mnemonic into .env.deploy:');
console.log(`     DEPLOYER_MNEMONIC=${mn}`);
console.log(`\n  Your address (for the dispenser): ${address}`);
console.log('  3. Run:  node deploy_testnet.mjs');
console.log('\n⚠️  Keep the mnemonic safe — it controls your TestNet account.\n');
