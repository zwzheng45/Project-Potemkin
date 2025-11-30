import pkgutil
import json
import threading
import time

from web3 import Web3
from eth_account.messages import encode_defunct
from web3.constants import ADDRESS_ZERO
from web3.contract.contract import ContractFunction
from web3.types import (
    TxParams,
    Wei,
)

from typing import (
    Any,
    Optional
)

import logging
logger = logging.getLogger(__name__)

class Client:
    # RPC endpoints for different chains
    BSC_TESTNET_RPC = [
        "https://data-seed-prebsc-1-s1.binance.org:8545",
        "https://data-seed-prebsc-1-s2.binance.org:8545",
        "https://data-seed-prebsc-1-s3.binance.org:8545",
        "https://data-seed-prebsc-2-s1.binance.org:8545",
        "https://data-seed-prebsc-2-s2.binance.org:8545",
        "https://data-seed-prebsc-2-s3.binance.org:8545",
        "https://bsc-testnet.drpc.org",
        "https://bsc-testnet.public.blastapi.io",
        "https://bsc-testnet-rpc.publicnode.com",
        "https://api.zan.top/bsc-testnet"
    ]

    BSC_MAINNET_RPC = [
        "https://bsc-dataseed1.binance.org",
        "https://bsc-dataseed2.binance.org",
        "https://bsc-dataseed3.binance.org",
        "https://bsc-dataseed4.binance.org"
    ]
    
    ETH_MAINNET_RPC = [
    ]

    def __init__(self,  
                 wallet_address: str, 
                 private_key: str, 
                 ep: str = "https://bsc-testnet-rpc.publicnode.com", 
                 membase_contract: str = "0x100E3F8c5285df46A8B9edF6b38B8f90F1C32B7b",
                 check_rpc: bool = True
                 ):
        
        # Determine which RPC list to use based on the endpoint
        if "binance" in ep.lower() or "bsc" in ep.lower():
            if "testnet" in ep.lower() or "test" in ep.lower():
                self.rpc_list = self.BSC_TESTNET_RPC
            else:
                self.rpc_list = self.BSC_MAINNET_RPC
        else:
            self.rpc_list = self.ETH_MAINNET_RPC
            
        # Add user-provided endpoint to the beginning of the list
        if ep not in self.rpc_list:
            self.rpc_list.insert(0, ep)

        # Initialize connection
        self.current_rpc = ep
        self._check_and_switch_rpc()
        if not self.w3:
            raise Exception("Failed to connect to any RPC endpoint")

        self.wallet_address = Web3.to_checksum_address(wallet_address)
        self.private_key = private_key

        contract_json = json.loads(pkgutil.get_data('membase.chain', 'solc/Membase.json').decode())
        self.membase = self.w3.eth.contract(address=membase_contract, abi=contract_json['abi'])

        # Start periodic connection check
        self.check_rpc = check_rpc
        if check_rpc:
            self.check_interval = 300
            self._stop_check = False
            self._check_thread = threading.Thread(target=self._periodic_connection_check, daemon=True)
            self._check_thread.start()

    def _periodic_connection_check(self):
        """
        Periodically check RPC connection and switch if needed.
        Runs in a separate thread.
        """
        while not self._stop_check:
            try:
                if not self.w3.is_connected():
                    logger.warning(f"RPC connection lost: {self.current_rpc}")
                    self._check_and_switch_rpc()
            except Exception as e:
                logger.warning(f"Error checking RPC connection: {str(e)}")
                self._check_and_switch_rpc()
            
            time.sleep(self.check_interval)

    def stop_periodic_check(self):
        """
        Stop the periodic connection check thread.
        Should be called when the client is no longer needed.
        """
        if not self.check_rpc:
            return
        self._stop_check = True
        if self._check_thread.is_alive():
            self._check_thread.join(timeout=1.0)

    def __del__(self):
        """
        Cleanup when the object is destroyed.
        """
        if not self.check_rpc:
            return
        self.stop_periodic_check()

    def _check_and_switch_rpc(self):
        """
        Check current RPC connection and switch to another one if needed.
        Returns Web3 instance if connection is successful, None otherwise.
        """
        # First check current connection if exists
        if hasattr(self, 'w3'):
            try:
                if self.w3.is_connected():
                    return
            except Exception:
                pass

        # Try connecting to each RPC node until a successful connection is made
        for rpc in self.rpc_list:
            # Skip current failing RPC
            if rpc == self.current_rpc:
                continue
                
            try:
                w3 = Web3(Web3.HTTPProvider(rpc))
                if w3.is_connected():
                    print(f"Successfully connected to the chain: {rpc}")
                    self.current_rpc = rpc
                    self.w3 = w3
                    break
            except Exception as e:
                logger.warning(f"Failed to connect to {rpc}: {str(e)}")
                continue

    def sign_message(self, message: str)-> str: 
        digest = encode_defunct(text=message)
        self._check_and_switch_rpc()
        signed_message =  self.w3.eth.account.sign_message(digest,self.private_key)
        return signed_message.signature.hex()
    
    def valid_signature(self, message: str, signature: str, wallet_address: str) -> bool: 
        digest = encode_defunct(text=message)
        self._check_and_switch_rpc()
        rec = self.w3.eth.account.recover_message(digest, signature=signature)
        if wallet_address == rec:
            return True
        return False

    def register(self, _uuid: str): 
        addr = self.membase.functions.getAgent(_uuid).call()
        if addr == self.wallet_address:
            return 
        
        if addr != ADDRESS_ZERO:
            raise Exception(f"already register: {_uuid} by {addr}")
        
        return self._build_and_send_tx(
            self.membase.functions.register(_uuid),
            self._get_tx_params(),
        )
    
    def createTask(self, _taskid: str, _price: int): 
        fin, owner, price, value, winner = self.membase.functions.getTask(_taskid).call()
        print(f"task: ", fin, owner, price, value, winner)
        if owner == self.wallet_address:
            return 
        
        if owner != ADDRESS_ZERO:
            raise Exception(f"already register: {_taskid} by {owner}")
        
        return self._build_and_send_tx(
            self.membase.functions.createTask(_taskid, _price),
            self._get_tx_params(),
        )


    def joinTask(self, _taskid: str, _uuid: str): 
        if self.membase.functions.getPermission(_taskid, _uuid).call():
            print(f"already join task: {_taskid}")
            return 

        fin, owner, price, value ,winner= self.membase.functions.getTask(_taskid).call()
        print(f"task: ", fin, owner, price, value, winner)
        
        if fin:
            raise Exception(f"{_taskid} already finish, winner is {winner}")
        
        return self._build_and_send_tx(
            self.membase.functions.joinTask(_taskid, _uuid),
            self._get_tx_params(value=Wei(price)),
        )

    def finishTask(self, _taskid: str, _uuid: str): 
        fin, owner, price, value, winner = self.membase.functions.getTask(_taskid).call()
        print(f"task: ", fin, owner, winner, price, value, winner)
        
        if fin:
            raise Exception(f"{_taskid} already finish, winner is {winner}")
        
        return self._build_and_send_tx(
            self.membase.functions.finishTask(_taskid, _uuid),
            self._get_tx_params(),
        )

    def getTask(self, _taskid: str): 
        fin, owner, price, value, winner = self.membase.functions.getTask(_taskid).call()
        print(f"task: ", fin, owner, price, value, winner)
        return fin, owner, price, value, winner

    def buy(self, _uuid: str, _auuid: str): 
        if self.membase.functions.getPermission(_uuid, _auuid).call():
            return 

        return self._build_and_send_tx(
            self.membase.functions.buy(_uuid, _auuid),
            self._get_tx_params(),
        )
    
    def get_agent(self, _uuid: str) -> str: 
        return self.membase.functions.getAgent(_uuid).call()

    def has_auth(self, _uuid: str, _auuid: str) -> bool: 
        if self.membase.functions.getPermission(_uuid, _auuid).call():
            return True
        
        fin, owner, price, value, winner = self.membase.functions.getTask(_uuid).call()
        if owner == ADDRESS_ZERO:
            return False
        agent_address = self.membase.functions.getAgent(_auuid).call()
        if owner == agent_address:
            return True

    def _display_cause(self, tx_hash: str):
        print(f"check: {tx_hash.hex()}")
        tx = self.w3.eth.get_transaction(tx_hash)

        replay_tx = {
            'to': tx['to'],
            'from': tx['from'],
            'value': tx['value'],
            'data': tx['input'],
        }

        try:
            self.w3.eth.call(replay_tx, tx.blockNumber - 1)
        except Exception as e: 
            print(e)
            raise e

    def _build_and_send_tx(
        self, function: ContractFunction, tx_params: TxParams
    ) :
        """Build and send a transaction."""
        # Check connection before sending transaction
        self._check_and_switch_rpc()
        if not self.w3.is_connected():
            raise Exception("No available RPC connection")

        transaction = function.build_transaction(tx_params)

        try: 
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.private_key)
            rawTX = signed_txn.raw_transaction

            tx_hash = self.w3.eth.send_raw_transaction(rawTX)
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if tx_receipt['status'] == 0:
                print("Transaction failed")
                self._display_cause(tx_hash)
            else:
                print(f'Transaction succeeded: {tx_hash.hex()}')
                logger.debug(f"nonce: {tx_params['nonce']}")
                #gasfee = tx_receipt['gasUsed']*tx_params['gasPrice']
                return "0x"+str(tx_hash.hex())
        except Exception as e:
            raise e

    def _get_tx_params(
        self, value: Wei = Wei(0), gas: Optional[Wei] = None
        ) -> TxParams:
        """Get generic transaction parameters."""
        params: TxParams = {
            "from": self.wallet_address,
            "value": value,
            "nonce": self.w3.eth.get_transaction_count(self.wallet_address) ,
            "gasPrice": self.w3.eth.gas_price,
            "gas": 300_000,
        }

        if gas:
            params["gas"] = gas

        return params


import os
from dotenv import load_dotenv

load_dotenv() 

membase_account = os.getenv('MEMBASE_ACCOUNT')
if not membase_account or membase_account == "":
    print("'MEMBASE_ACCOUNT' is not set, interact with chain")
    exit(1)

membase_secret = os.getenv('MEMBASE_SECRET_KEY')
if not membase_secret or membase_secret == "":
    print("'MEMBASE_SECRET_KEY' is not set")
    exit(1)

membase_id = os.getenv('MEMBASE_ID')
if not membase_id or membase_id == "":
    print("'MEMBASE_ID' is not set, used defined")
    exit(1)

membase_chain = Client(membase_account, membase_secret)