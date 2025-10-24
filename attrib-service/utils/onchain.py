import os
from web3 import Web3

RPC_URL = os.getenv("CHAIN_RPC_URL")
CONTRACT_ADDRESS = os.getenv("PROOF_LEDGER_ADDR")
CONTRACT_ABI_JSON = os.getenv("PROOF_LEDGER_ABI")
PRIVATE_KEY = os.getenv("CHAIN_SENDER_PK")

def ready() -> bool:
    return all([RPC_URL, CONTRACT_ADDRESS, CONTRACT_ABI_JSON, PRIVATE_KEY])

def submit_onchain_receipt(fn_name: str, args: list) -> str:
    if not ready():
        return "onchain-disabled"
    from eth_account import Account
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    acct = Account.from_key(PRIVATE_KEY)
    contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI_JSON)
    fn = getattr(contract.functions, fn_name)(*args)
    tx = fn.build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "gas": 500000,
        "maxFeePerGas": w3.to_wei("50", "gwei"),
        "maxPriorityFeePerGas": w3.to_wei("1", "gwei"),
        "chainId": w3.eth.chain_id
    })
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    return tx_hash.hex()