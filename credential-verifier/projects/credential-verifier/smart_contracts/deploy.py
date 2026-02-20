import logging
import os
from pathlib import Path
from dotenv import load_dotenv
from algokit_utils.beta.algorand_client import AlgorandClient
from algokit_utils import get_localnet_default_account
from algosdk.v2client.algod import AlgodClient
from algosdk.v2client.indexer import IndexerClient
from algosdk import account, mnemonic

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def deploy():
    load_dotenv()
    
    # Check for mnemonic
    mn = os.getenv("MNEMONIC")
    if not mn:
        logger.warning("No MNEMONIC found in .env. Attempting to use LocalNet default or prompting user.")
        # For this script we want to deploy to TestNet, so we need a real account or prompt
        try:
             mn = input("Please enter your TestNet MNEMONIC (or press Enter to try defaults): ")
        except EOFError:
             pass

    # Initialize AlgorandClient for TestNet
    # We use AlgoNode for easy access to TestNet without local node
    algod_token = ""
    algod_address = "https://testnet-api.algonode.cloud"
    indexer_token = ""
    indexer_address = "https://testnet-idx.algonode.cloud"
    
    # Alternatively use algokit_utils to get client, but explicit is safer for custom endpoint
    algorand = AlgorandClient.default_testnet() 
    
    # If we want to use the specific environment variables from .env if they are set to testnet?
    # The current .env has local settings. We should override or ignore them for this script if we want TestNet.
    
    logger.info(f"Connecting to Algorand TestNet via {algod_address}")

    # Set up the deployer account
    if mn:
        signer = algorand.account.from_mnemonic(mn)
    else:
        # Fallback to localnet signer if just testing locally, but user asked for TestLink (TestNet)
        # We will stop here if no mnemonic.
        logger.error("MNEMONIC is required for TestNet deployment.")
        return

    logger.info(f"Deploying with account: {signer.address}")

    # Read artifacts
    # We expect `credential_verifier.arc4.json` and `credential_verifier.approval.teal` etc.
    # The build script output path:
    artifacts_dir = Path(__file__).parent / "artifacts" / "credential_verifier"
    
    # We need the app spec file. Algopy compile should output one.
    # Let's verify what files are generated.
    # Assuming standard arc32/arc4 json file.
    
    import json
    # Look for *.arc4.json or similar
    app_spec_file = next(artifacts_dir.glob("*.arc4.json"), None)
    if not app_spec_file:
         # Try contract.arc4.json or matching directory name
         app_spec_file = artifacts_dir / "CredentialVerifier.arc4.json"
    
    if not app_spec_file.exists():
        logger.error(f"App spec file not found in {artifacts_dir}")
        return

    app_spec = Path(app_spec_file).read_text()
    
    # Deploy
    factory = algorand.client.get_app_factory(
        app_spec=app_spec,
        app_name="CredentialVerifier",
        signer=signer
    )
    
    # Deploy the app (create or update if exists and updatable/deletable)
    # Since we don't have a previous app ID stored in a lock file here, 
    # algokit deploy usually handles that if we use the wrapper.
    # Here we are using `deploy` method which handles idempotency if we provide version/name correctly.
    
    deploy_result = factory.deploy(
        on_schema_break="append",
        on_update="append",
    )
    
    logger.info(f"Deployed App ID: {deploy_result.app_id}")
    logger.info(f"App Address: {deploy_result.app_address}")
    
    # Write to a file or update .env?
    print(f"DEPLOYED_APP_ID={deploy_result.app_id}")

if __name__ == "__main__":
    deploy()
