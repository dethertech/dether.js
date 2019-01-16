/* eslint-disable max-len, no-nested-ternary */
import Ethers from 'ethers';
import xhr from 'xhr-request';

import { add0x, isAddr, getMaxUint256Value } from './utils/eth';
import DetherUser from './detherUser';
import Contracts from './utils/contracts';
import * as ExternalContracts from './utils/externalContracts';
import Providers from './utils/providers';
import Formatters from './utils/formatters';
import { ALLOWED_EXCHANGE_PAIRS } from './constants/appConstants';
import { getRateEstimation } from './utils/exchangeTokens';
// to add different stuff on it


// used to get bitfinex
export const getRequest = url => new Promise((resolve, reject) => {
  xhr(url, { json: true }, (err, res) => (
    err ? reject(err) : resolve(res)
  ));
});


/**
 * @example
 * import DetherJS from 'dether.js';
 */
class DetherJS {
  /**
   * Creates an instance of DetherUser
   * You may not instanciate from here, prefer from DetherJS.getUser method
   *
   * @param {object}    providerData
   * @param {String}    providerData.network      Name of network ('homestead',
   *                                              'ropsten', 'rinkeby', 'kovan')
   * @param {?String}   providerData.rpcURL       JSON RPC provider URL
   * @param {?String}   providerData.infuraKey    INFURA API Key
   * @param {?String}   providerData.etherscanKey Etherscan API Key
   *
   * @param {object}    options
   * @param {?boolean}  options.manualInitContracts true if we are gonna init the contracts later on,
   *                                                false if we want to instantiate from JSON files (.networks)
   */
  constructor(providerData, { manualInitContracts = false } = {}) {
    /** @ignore */
    this.provider = Providers.getProvider(providerData);
    /** @ignore */
    if (!manualInitContracts) {
      // default is to init immediately
      this.initDether();
    }
    this.network = providerData.network;
  }

  /**
   * init dether contracts, by default will be called when instantiating,
   * but if manualInitContracts, we will manually call this function later on
   *
   */
  initDether({ detherCoreAddr, detherSmsAddr, detherTokenAddr } = {}) {
    this.contractInstance = Contracts.getDetherContract(this.provider, detherCoreAddr);
    this.smsInstance = Contracts.getDetherSmsContract(this.provider, detherSmsAddr);

    // save custom addresses of contracts to be used with Contracts.getCustomContract, etc.
    this.dthCoreAddress = detherCoreAddr;
    this.dthSmsAddress = detherSmsAddr;
    this.dthTokenAddress = detherTokenAddr;

    if (!this.contractInstance || !this.smsInstance) throw new Error('Unable to load contracts');
  }

  /**
   * Get instance of DetherUser linked to this Dether instance
   * @param  {object}  encryptedWallet Encrypted user wallet
   * @return {Object} DetherUser
   */
  getUser(encryptedWallet) {
    return new DetherUser({
      encryptedWallet,
      dether: this,
    });
  }

  /**
   * get teller by address
   * @param  {string}  address ethereum address
   * @return {Promise<Object>} teller
   */
  async getTeller(address) {
    const rawTeller = await this.contractInstance.getTeller(address);
    const rawReput = await this.contractInstance.getReput(address);

    if (Ethers.utils.toUtf8String(rawTeller[2]).replace(/\0/g, '') === '') {
          return null;
    }
    return Object.assign(
      {},
      Formatters.tellerFromContract(rawTeller),
      Formatters.reputFromContract(rawReput),
      {
        ethAddress: address,

      },
    );
  }

  // getShop
  /**
   * get teller by address
   * @param  {string}  address ethereum address
   * @return {Promise<Object>} teller
   */
  async getShop(address) {
    const rawShop = await this.contractInstance.getShop(address);
    let res = Ethers.utils.toUtf8String(rawShop[2]);
    res = res.replace(/\0/g, '');
    if (!res) return null;

    return Object.assign(
      {},
      Formatters.shopFromContract(rawShop),
      {
        ethAddress: address,
      },
    );
  }

  /**
   * @ignore
   * Filter null and removes tellers with same address
   * @param {Array} list tellers
   * @return {Array} filtered tellers
   */
  static _filterTellerList(list) {
    return list
      .filter(teller => !!teller)
      .reduce(
        (acc, teller) =>
          (!acc.some(t => t.ethAddress === teller.ethAddress) ? [...acc, teller] : acc),
        [],
      );
  }

  /**
   * Get All tellers on the map
   * @param  {array}   addr ethereum addresses
   * @return {Promise<Array>} array of tellers
   */
  async getAllTellers(addrs) {
    if (addrs && !Array.isArray(addrs)) throw new TypeError('Need array of addresses as parameter');
    const result = addrs || await this.contractInstance.getAllTellers();
    if (!result || !result.length) return [];

    const tellerAddrList = result;
    // const tellers = await Promise.all(result.map(this.getTeller.bind(this)));

    const tellers = await Promise.all(tellerAddrList.map(this.getTeller.bind(this)));
    return tellers;
    // return DetherJS._filterTellerList(tellers);
  }

  // /**
  //  * Get All tellers per zone
  //  * @param {object} opts
  //  * @param {string} opts.countryId dether instance
  //  * @param  {Integer}  opts.postalCode
  //  * @return {Promise<Array>} array of tellers in zone
  //  */
  // async getTellersInZone(opts) {
  //   if (!Number.isInteger(opts.postalCode) ) throw new TypeError('Invalid zone');
  //   const tellersInZone = await this.contractInstance.getZone(opts.countryId, opts.postalCode);
  //   if (!tellersInZone) return [];
  //   // const tellersList = tellersInZone[0];
  //   const tellers = await Promise.all(tellersInZone.map(this.getTeller.bind(this)));
  //   return tellers;
  //   // return DetherJS._filterTellerList(tellers);
  // }

  /**
   * Get teller balance in escrow
   * @param  {string} address  Teller ethereum address
   * @return {Promise<Number>} Escrow balance of teller at address
   */
  async getTellerBalance(address) {
    if (!isAddr(address)) throw new TypeError('Invalid ETH address');
    const fullAddress = add0x(address);
    const result = await this.contractInstance.getTellerBalance(fullAddress);
    return Number(Ethers.utils.formatEther(result));
  }


// get all balance
/**
 * get all balance of the current account
 * @param {array} ticker of ERC 20/223
 * @param {string} address of account to check
 */
async getAllBalance(address, ticker) {
  if (!isAddr(address)) throw new TypeError('Invalid ETH address');

  // ETH is handled at end of this function
  ticker = ticker.filter(x => x !== 'ETH');

  const result = {};

  for (const tick of ticker) { // eslint-disable-line no-restricted-syntax
    let tokenAddress;
    try {
      tokenAddress = (tick === 'DTH' && this.dthTokenAddress) || ExternalContracts.getTokenContractAddr(this.provider, tick);
    } catch (err) {
      throw new TypeError(`found no address for token: ${tick}`);
    }
    const erc20 = Contracts.getErc20Contract(this.provider, tokenAddress);
    result[tick] = Ethers.utils.formatEther((await erc20.balanceOf(address))); // eslint-disable-line no-await-in-loop
  }

  result.ETH = Ethers.utils.formatEther(await this.provider.getBalance(address));

  return result;
}

/**
 * getReput
 * @param address
 * @return {promise} reput
 */
 async getTellerReputation(addr) {
     const rawReput = await this.contractInstance.getReput(addr);
     const rawTeller = await this.contractInstance.getTeller(addr);

     const telletFormatted = Formatters.tellerFromContract(rawTeller);
     return Object.assign(
       {},
       Formatters.reputFromContract(rawReput),
       {
         messenger: telletFormatted.messenger,
       },
     );
 }

// getAllShop
/**
 * Get All tellers on the map
 * @param  {array}   addr ethereum addresses
 * @return {Promise<Array>} array of tellers
 */
async getAllShops(addrs) {
  if (addrs && !Array.isArray(addrs)) throw new TypeError('Need array of addresses as parameter');
  const result = addrs || await this.contractInstance.getAllShops();


  if (!result || !result.length) return [];

  const shopAddrList = result;

  const shops = await Promise.all(shopAddrList.map(this.getShop.bind(this)));
  return shops;
  // return DetherJS._filterTellerList(shops);
}

/**
 * get the price of the licence for the shop
 * @return {string} country
 */
 async getLicenceShop(country) {
   // verif
   const price = await this.contractInstance.licenceShop(Ethers.utils.toUtf8Bytes(country));
   return Ethers.utils.formatEther(price.toString());
 }

 /**
  * get the price of the licence for teller
  * @return {string} country
  */
  async getLicenceTeller(country) {
    // verif
    const price = await this.contractInstance.licenceTeller(Ethers.utils.toUtf8Bytes(country));
    return Ethers.utils.formatEther(price.toString());
  }

/**
 * is zone open?
 * @param {string} countryCode in MAJ
 * @return {Bool}
 */
 async isZoneShopOpen(country) {
   const res = await this.contractInstance.openedCountryShop(Ethers.utils.toUtf8Bytes(country))
   return res;
 }

 /**
  * is zone open?
  * @param {string} countryCode in MAJ
  * @return {Bool}
  */
  async isZoneTellerOpen(country) {
    const res = await this.contractInstance.openedCountryTeller(Ethers.utils.toUtf8Bytes(country))
    return res;
  }

/**
* Get zone shop
* @param {object} opts
* @param {string} opts.countryId code
* @param {string} opts.postalCode code
*/
async getZoneShop(opts) {
  const res = await this.contractInstance.getZoneShop(
    `0x${Formatters.toNBytes(opts.countryId,2)}`,
    `0x${Formatters.toNBytes(opts.postalCode,16)}`,
  );
  return res;
}

/**
* Get zone teller
* @param {object} opts
* @param {string} opts.countryId code
* @param {string} opts.postalCode code
*/
async getZoneTeller(opts) {
  const res = await this.contractInstance.getZoneTeller(
    `0x${Formatters.toNBytes(opts.countryId,2)}`,
    `0x${Formatters.toNBytes(opts.postalCode,16)}`,
  );
  return res;
}

/**
 * Get transaction status
 * @param {string hash} hash tsx
 * @return {promise<string>} Current status
 */
async getTransactionStatus(hash) {
  // erro unknow null (pas internet)
  try {
    const transaction = await this.provider.getTransaction(add0x(hash));
    if (transaction && transaction.blockHash) {
      let receipt = await this.provider.getTransactionReceipt(add0x(hash));
      if (receipt.status === 1) return { status: 'success' };
      return { status: 'error' };
    } else if (transaction) return { status: 'pending' };
    return { status: 'unknow' };
  } catch (e) {
    return { status: 'unknow' };
  }
}
  /**
   * Verif if user is sms whitelisted
   * @param  {string} address  Teller ethereum address
   * @return {Promise<Bool>} Escrow balance of teller at address
   */
  async isCertified(address) {
    if (!isAddr(address)) throw new TypeError('Invalid ETH address');
    const fullAddress = add0x(address);
    const res = await this.smsInstance.certified(fullAddress);
    return res;
  }


    /**
     * Get Estimation fetches the estimated amount we get from token B
     * in exchange for a certain amount from token A, if no estimation can be
     * given we return null
     *
     * @param {object} opts
     * @param {string} opts.sellToken token we are selling
     * @param {string} opts.buyToken token we are buying
     * @param {float} opts.buyAmount buy value in ETH (18 decimal), ex 1.123 ETH, 3.12 DAI
     * @return {Object} .buyAmount is amount (in ETH format) we can buy of buyToken for sellAmount of sellToken
     *                  .buyRate is buy rate kyber returned to us, we need to send this in exchangetokens when doing the kyber trade
     */
    async getEstimation({ sellToken, buyToken, sellAmount }) {
      if (!['kovan', 'mainnet', 'rinkeby', 'ropsten'].includes(this.network)) {
        throw new TypeError('only works on kovan, ropsten, rinkeby and mainnet');
      }
      // check if pair is one of the accepted trading pairs
      const acceptedPair = ALLOWED_EXCHANGE_PAIRS.some((pair) => {
        const [sell, buy] = pair.pair.split('-');
        return (sell === sellToken && buy === buyToken)
          || (sell === buyToken && buy === sellToken);
      });
      if (!acceptedPair) {
        throw new TypeError('Trading pair not implemented');
      }
      if (!sellAmount || typeof sellAmount !== 'number' || sellAmount < 0) {
        throw new TypeError('sellAmount should be a positive number');
      }
      const { buyAmount, buyRate } = await getRateEstimation({
        provider: this.provider,
        sellToken,
        buyToken,
        sellAmount,
      });

      return { buyAmount, buyRate };
    }

  /**
   * Get available amount of eth a given address can sell today
   * @param {string} address - address to check sell amount for
   * @param {string} [unit='eth'] - which unit to return result in
   * @return {string} the amount of eth left to sell today for the given address,
   *                  in the given unit
   */
  async availableSellAmount(address, unit = 'eth') { // eslint-disable-line
    if (!['eth', 'usd', 'wei'].includes(unit)) {
      throw new TypeError('invalid unit (2nd arg) specified, allowed values: eth, wei, usd');
    }
    const DetherCore = Contracts.getDetherContract(this.provider);
    const DetherBank = Contracts.getDetherBankContract(this.provider);
    const DetherExchangeRateOracle = Contracts.getDetherExchangeRateOracleContract(this.provider);

    if (!DetherCore.isTeller(address)) {
      throw new TypeError('address is not a Teller');
    }

    const countryId = (await DetherCore.getTeller(address))[2];
    const tier = (await DetherCore.isTier2(address)) ? 2
                 : (await DetherCore.isTier1(address)) ? 1
                 : 0;

    const weiSoldToday = await DetherBank.getWeiSoldToday(address);
    const usdDailyLimit = await DetherCore.getSellDailyLimit(tier, Ethers.utils.hexlify(countryId));
    const weiPriceOneUsd = await DetherExchangeRateOracle.getWeiPriceOneUsd();
    const weiDailyLimit = usdDailyLimit.mul(weiPriceOneUsd);
    const weiLeftToSell = weiDailyLimit.sub(weiSoldToday);

    switch (unit) {
      case 'usd':
        return weiLeftToSell.div(weiPriceOneUsd).toString();
      case 'eth':
        return Ethers.utils.formatEther(weiLeftToSell);
      case 'wei':
        return weiLeftToSell.toString();
      default:
        break;
    }
  }

  /**
   * Get available amount of eth a given address can sell today
   * @param {Object} opts
   * @param {string} opts.ethAddress - address tof the user
   * @param {string} opts.ticker - token to check if allowance is set
   * @return {bool} TRUE if allowance is set, FALSE if allowance is not set
   */
  async hasAirswapAllowance({ethAddress, ticker}) {
    const tokenAddress = ExternalContracts.getTokenContractAddr(this.provider, ticker);
    const erc20 = Contracts.getErc20Contract(this.provider, tokenAddress);
    const airswapAddr = ExternalContracts.getAirsSwapExchangeContractAddr(this.provider)
    const allowance = await erc20.allowance(ethAddress, airswapAddr);
    return allowance.gt(getMaxUint256Value().div(2));
  }

  /**
   * Get available amount of eth a given address can sell today
   * @param {Object} opts
   * @param {string} opts.ethAddress - address tof the user
   * @param {string} opts.ticker - token to check if allowance is set
   * @return {bool} TRUE if allowance is set, FALSE if allowance is not set
   */
  async hasKyberAllowance({ethAddress, ticker }) {
    const tokenAddress = ExternalContracts.getTokenContractAddr(this.provider, ticker);
    const erc20 = Contracts.getErc20Contract(this.provider, tokenAddress);
    const kyberAddr = ExternalContracts.getKyberNetworkProxyContractAddr(this.provider)
    const allowance = await erc20.allowance(ethAddress, kyberAddr);
    return allowance.gt(getMaxUint256Value().div(2));
  }

  /**
  * Get available amount of eth a given address can sell today
  * @param {Object} opts
  * @param {string} opts.ethAddress - address tof the user
  * @param {string} opts.ticker - token to check if allowance is set
  * @return {bool} TRUE if allowance is set, FALSE if allowance is not set
  */
   async hasNotNeededAllowance({ ethAddress, ticker }) {
     const tokenAddress = ExternalContracts.getTokenContractAddr(this.provider, ticker);
      const result = ALLOWED_EXCHANGE_PAIRS.find((pair) => {
       const [sell, buy] = pair.pair.split('-');
       return (buy === ticker);
     });
     if (result.exchange != 'airswap') return true;
     const erc20 = Contracts.getErc20Contract(this.provider, tokenAddress);
     const airswapAddr = ExternalContracts.getAirsSwapExchangeContractAddr(this.provider);
     const allowance = await erc20.allowance(ethAddress, airswapAddr);
     return allowance.gt(getMaxUint256Value().div(2));
   }

}

DetherJS.Ethers = Ethers;

export default DetherJS;
