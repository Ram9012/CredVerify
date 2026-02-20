import logging
import sys
import subprocess
from pathlib import Path
import os

def build() -> None:
    # Use absolute paths or relative to this script
    script_dir = Path(__file__).parent
    output_dir = script_dir / "artifacts" / "credential_verifier"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Building CredentialVerifier to {output_dir}")
    
    contract_path = script_dir / "credential_verifier" / "contract.py"
    
    # Run 'python -m puya' compile command
    # Assuming puya is installed in the same python environment
    cmd = [
        sys.executable, "-m", "puya", 
        str(contract_path), 
        "--output-dir", str(output_dir),
        "--output-arc32", # ensure arc32 is generated if needed
        "--output-teal",  # ensure teal is generated
    ]
    
    print(f"Running: {' '.join(cmd)}")
    # We use explicit environment setup if needed, but inheriting is fine usually
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print("Compilation failed!")
        print(result.stdout)
        print(result.stderr)
        sys.exit(1)
        
    print("Compilation successful!")
    print(result.stdout)
    print(result.stderr) # puya logs to stderr often

if __name__ == "__main__":
    build()
