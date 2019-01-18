import Ethers from 'ethers-cordova';

import DetherCoreJson from 'dethercontract/contracts/DetherCore.json';
import SmsCertifierJson from 'dethercontract/contracts/SmsCertifier.json';
import erc20 from 'dethercontract/contracts/ERC20.json';
import DetherExchangeRateOracleJson from 'dethercontract/contracts/ExchangeRateOracle.json';
import DetherFakeExchangeRateOracleJson from 'dethercontract/contracts/FakeExchangeRateOracle.json';
import DetherBankJson from 'dethercontract/contracts/DetherBank.json';

import { isAddr, getNetworkName } from './eth';
import { validateGetCustomContract } from './validation';

const Contracts = {
  /**
   * @ignore
   */
  getContract(ContractJson, provider, contractAddr) {
    if (!ContractJson || !provider) {
      throw new Error('No ContractJson or provider found');
    }

    if (contractAddr) {
      return new Ethers.Contract(contractAddr, ContractJson.abi, provider);
    }

    const chainId = provider.provider ?
                    provider.provider.chainId :
                    provider.chainId;

    if (!chainId) throw new Error('No chain id found');


    const network = ContractJson.networks[chainId];

    if (!network) {
      throw new Error(`Contract not deployed on network ${chainId}`);
    }
    // override of contractAddr provided
    return new Ethers.Contract(network.address, ContractJson.abi, provider);
  },

  /**
   * @ignore
   */
  getDetherContract(provider, addr) {
    if (!DetherCoreJson || !provider) {
      throw new Error('No DetherCoreJson or provider found');
    }

    return Contracts.getContract(DetherCoreJson, provider, addr);
  },

  getDetherSmsContract(provider, addr) {
    if (!SmsCertifierJson || !provider) {
      throw new Error('No SmsCertifierJson or provider found');
    }

    return Contracts.getContract(SmsCertifierJson, provider, addr);
  },

  getDetherBankContract(provider) {
    if (!DetherBankJson || !provider) {
      throw new Error('No DetherBankJson or provider found');
    }

    return Contracts.getContract(DetherBankJson, provider);
  },

  getDetherExchangeRateOracleContract(provider) {

    switch (provider.name) {
      case 'ropsten':
        if (!DetherFakeExchangeRateOracleJson || !provider) {
          throw new Error('No DetherFakeExchangeRateOracleJson or provider found');
        }
        return Contracts.getContract(DetherFakeExchangeRateOracleJson, provider);

      case 'kovan':
      case 'mainnet':
      case 'homestead':
        if (!DetherExchangeRateOracleJson || !provider) {
          throw new Error('No DetherExchangeRateOracleJson or provider found');
        }
        return Contracts.getContract(DetherExchangeRateOracleJson, provider);

      default:
        throw new Error(`network ${network} has no deployed ExchangePriceOracle contract`);
    }
  },

  /**
   * getErc20Contract(provider, address)
   */
   getErc20Contract(provider, address) {
      if (!provider) throw new Error('No provider found');
      if (!isAddr(address)) throw new TypeError('Invalid ETH address');
      const chainId = provider.provider ?
                      provider.provider.chainId :
                      provider.chainId;

      if (!chainId) throw new Error('No chain id found');
      return new Ethers.Contract(address, erc20.abi, provider);
   },


   /**
    * Returns a custom signed contract
    * Allows to add value to a transaction
    *
    * @param {object}      opts
    * @param {object}      opts.wallet   Decrypted user wallet
    * @param {string}      opts.password password to decrypt wallet
    * @param {string}      opts.address address of ERC20
    * @param {string}      opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
    * @return {object}     Dether Contract
    * @private
    * @ignore
    */
   async getSignedErc20Contract(opts) {
     const validation = validateGetCustomContract(opts);
     if (validation.error) throw new TypeError(validation.msg);

     const { wallet } = opts;

     const customProvider = {
       getAddress: wallet.getAddress.bind(wallet),
       provider: wallet.provider,
       sendTransaction: (transaction) => {
         if (opts.value) {
           transaction.value = opts.value;
         }
         if (opts.nonce) {
           transaction.nonce = opts.nonce;
         }
         if (opts.gasPrice) {
           transaction.gasPrice = opts.gasPrice;
         }
         if (opts.gasLimit) {
           transaction.gasLimit = opts.gasLimit;
         }
         return wallet.sendTransaction(transaction);
       },
     };

     return Contracts.getErc20Contract(customProvider, opts.address);
   },


  /**
   * Returns a custom signed contract
   * Allows to add value to a transaction
   *
   * @param {object}      opts
   * @param {object}      opts.wallet   Decrypted user wallet
   * @param {string}      opts.password password to decrypt wallet
   * @param {?BigNumber}  opts.value    Ether value to send while calling contract
   * @param {?BigNumber}  opts.gasPrice (optionnal) gas value you want to add in your transaction
   * @return {object}     Dether Contract
   * @private
   * @ignore
   */
  async getCustomContract(opts) {
    const validation = validateGetCustomContract(opts);
    if (validation.error) throw new TypeError(validation.msg);
    const { wallet } = opts;

    const customProvider = {
      getAddress: wallet.getAddress.bind(wallet),
      provider: wallet.provider,
      sendTransaction: (transaction) => {
        if (opts.value) {
          transaction.value = opts.value;
        }
        if (opts.nonce) {
          transaction.nonce = opts.nonce;
        }
        if (opts.gasPrice) {
          transaction.gasPrice = opts.gasPrice;
        }
        if (opts.gasLimit) {
          transaction.gasLimit = opts.gasLimit;
        }
        return wallet.sendTransaction(transaction);
      },
    };

    return Contracts.getDetherContract(customProvider, opts.address);
  },

  /**
   * Returns a custom signed contract
   * Allows to add value to a transaction
   *
   * @param {object}      opts
   * @param {object}      opts.wallet   Decrypted user wallet
   * @param {string}      opts.password password to decrypt wallet
   * @param {?BigNumber}  opts.value    Ether value to send while calling contract
   * @return {object}     Dether Contract
   * @private
   * @ignore
   */
  async getSmsContract(opts) {
    const validation = validateGetCustomContract(opts);
    if (validation.error) throw new TypeError(validation.msg);

    const { wallet  } = opts;

    const customProvider = {
      getAddress: wallet.getAddress.bind(wallet),
      provider: wallet.provider,
      sendTransaction: (transaction) => {
        if (opts.value) {
          transaction.value = opts.value;
        }
        if (opts.nonce > 0) {
          transaction.nonce = opts.nonce;
        }
        if (opts.gasPrice) {
          transaction.gasPrice = opts.gasPrice;
        }
        return wallet.sendTransaction(transaction);
      },
    };
    return Contracts.getDetherSmsContract(customProvider, opts.address);
  },
};

export default Contracts;
