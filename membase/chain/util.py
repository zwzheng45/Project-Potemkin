# util.py

import pkgutil
from web3 import Web3 
from web3.contract import Contract

import requests
import json

from typing import Optional

from dotenv import load_dotenv
import os
load_dotenv()

# BSC / BSC_TESTNET
BSC_TESTNET_SETTINGS = {
    "RPC": "https://bsc-testnet-rpc.publicnode.com",
    "Explorer": "https://testnet.bscscan.com/",
    "ChainId": 97,
    "PancakeV3Factory": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    "PancakeV3SwapRouter": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
    "PancakeV3PoolDeployer": "0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9",
    "PancakeV3Quoter": "0xbC203d7f83677c7ed3F7acEc959963E7F4ECC5C2",
    "PostionManage": "0x427bF5b37357632377eCbEC9de3626C71A5396c1",
    "Beeper": "0x6257761AB5a92E89cD727Ea6650E1188D738007a",
    "BeeperUtil": "0xa29Bfb0ab2EED7299659B4AAB69a38a77Fd62aa5",
}

BSC_MAINNET_SETTINGS = {
    "RPC": "https://bsc-rpc.publicnode.com",
    "Explorer": "https://www.bscscan.com/",
    "ChainId": 56,
    "PancakeV3Factory": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    "PancakeV3SwapRouter": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
    "PancakeV3PoolDeployer": "0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9",
    "PancakeV3Quoter": "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
    "PostionManage": "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364",
    "Beeper": "0x488FF32dABC2cC42FEc96AED5F002603bB3CEd3F",
    "BeeperUtil": "0x5c84c3c6dF5A820D5233743b4Eea5D32bEa30362",
}

CHAIN_SETTINGS = {
    'BSC': BSC_MAINNET_SETTINGS,
    'BSC_TESTNET': BSC_TESTNET_SETTINGS,
}

def _load_contract_erc20(w3: Web3, token_address: str) -> Contract:
    contract_abi = pkgutil.get_data('membase.chain', 'solc/Token.abi').decode()
    return w3.eth.contract(address=token_address, abi=contract_abi)


def _create_wallet(app_id: str):
    url = f"https://api.privy.io/v1/wallets/"
    headers = {
        "privy-app-id": app_id,
        "Content-Type": "application/json"
    }

    app_secret = os.getenv('PRIVY_APP_SECRET')
    data = {
        "chain_type": "ethereum"
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data), auth=(app_id, app_secret))
        response.raise_for_status()
        print(response.json())
        return response.json()['address'], response.json()['id']
    except Exception as e:
        print(response.json())
        raise e


def _sign_transcation(app_id: str, wallet_id: str, tx: dict):
    url = f"https://api.privy.io/v1/wallets/{wallet_id}/rpc"
    headers = {
        "privy-app-id": app_id,
        "Content-Type": "application/json"
    }

    transcation = {
        'to': tx['to'],
        'nonce': tx['nonce'],
        'gas_limit': tx['gas'],
        'gas_price': tx['gasPrice'],
        'value': tx['value'],
        'chain_id': tx['chainId'],
        'type': 0,
    }

    #print(transcation)

    data = tx.get('data')
    if (data):
         transcation['data'] = data

    app_secret = os.getenv('PRIVY_APP_SECRET')
    data = {
        "method": "eth_signTransaction",
        "params": {
            "transaction": transcation
        }
    }
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data), auth=(app_id, app_secret))
        response.raise_for_status()
        return response.json()['data']['signed_transaction']
    except Exception as e:
        print(response.json())
        raise e 
    
def get_0x_quote(
        buy_token: str,
        sell_token: str,
        sell_amount: int,
        taker: str,
        chain_id: str, 
        gas_price: Optional[int] = None,
        slippage: Optional[float] = None,
    ):
        """
        Docs: https://0x.org/docs/api#tag/Swap/operation/swap::permit2::getQuote
        """

        url = "https://api.0x.org/swap/permit2/quote"
        params = {
            'buyToken': buy_token,
            'sellToken': sell_token,
            'sellAmount': sell_amount,
            'chainId': chain_id,
            'taker': taker,
        }

        if gas_price:
            params['gasPrice'] = gas_price

        if slippage:
            params['slippageBps'] = slippage

        print(f'Get url {url} with params {params}')

        headers = {
            "Content-Type": "application/json",
            "0x-api-key": os.getenv('ZEROX_API_KEY', "c9f13c84-9fcb-4f42-aa30-a11b0d016aa5"),
            "0x-version": "v2"
        }

        response = requests.get("https://api.0x.org/swap/permit2/quote", params=params, headers=headers)
        try:
            response.raise_for_status()
            print(f'quote from 0x.org: {response.json()}')
            return response
        except Exception as e:
            print(response.json())
            raise e 
    