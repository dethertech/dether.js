/* eslint-disable max-len, no-multi-spaces, object-curly-newline, import/first */

import Ethers from "ethers";
import web3Abi from "web3-eth-abi";

const DetherJS = require("./index");
import { add0x, getMaxUint256Value } from "./utils/eth";
import {
  validateSellPoint,
  validateSendCoin,
  validatePassword
} from "./utils/validation";
import Contracts from "./utils/contracts";
import Formatters from "./utils/formatters";
import { exchangeTokens } from "./utils/exchangeTokens";
import { TICKER } from "./constants/appConstants";
import * as ExternalContracts from "./utils/externalContracts";
import { ALLOWED_EXCHANGE_PAIRS } from "./constants/appConstants";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * @example
 * import DetherJS from 'dether.js';
 *
 * const wallet = DetherJS.Ethers.Wallet.createRandom();
 * const encryptedWallet = await wallet.encrypt('password');
 *
 * const User = dether.getUser(encryptedWallet);
 */
class DetherUser {
  /**
   * Creates an instance of DetherUser.
   *
   * You may not instanciate from here, prefer from DetherJS.getUser method
   *
   * @param {object} opts
   * @param {DetherJS} opts.dether dether instance
   * @param {string} opts.encryptedWallet user wallet
   */
  constructor(opts) {
    if (!opts.dether || !opts.encryptedWallet) {
      throw new Error("Need dether instance and wallet");
    }
    /** @ignore */
    this.dether = opts.dether;
    /** @ignore */
    this.encryptedWallet = opts.encryptedWallet;
    const parsedWallet = JSON.parse(opts.encryptedWallet);
    this.address = add0x(parsedWallet.address);
  }

  /**
   * Returns decrypted wallet
   *
   * @param {string} password             user password
   * @return {Wallet}     User wallet
   * @private
   * @ignore
   */
  async _getWallet(password) {
    if (!password) {
      throw new TypeError("Need password to decrypt wallet");
    }
    const wallet = await Ethers.Wallet.fromEncryptedWallet(
      this.encryptedWallet,
      password
    );
    wallet.provider = this.dether.provider;
    return wallet;
  }

  /**
   * Get user ethereum address
   * @return {Promise<string>} user ethereum address
   */
  async getAddress() {
    return this.address;
  }

  /**
   * Get user teller info
   * @return {Promise<object>}
   */
  async getInfo() {
    return this.dether.getTeller(this.address);
  }

  /**
   * Get user balance in escrow
   * @return {Promise<string>}
   */
  async getBalance() {
    return this.dether.provider.getBalance(this.address);
  }

  // gas used = 223319
  // gas price average (mainnet) = 25000000000 wei
  // 250000 * 25000000000 = 0.006250000000000000 ETH
  // need 0.006250000000000000 ETH to process this function
  /**
   * Register a sell point
   * @param {object} sellPoint
   * @param {string} sellPoint.lat        latitude min -90 max +90 , 5 decimel
   * @param {string} sellPoint.lng        longitude min -180 max +180 , 5 decimal
   * @param {string} sellPoint.countryId  geographic zone ISO , 2 charactere
   * @param {string} sellPoint.postalCode   postal code 0-16 char
   * @param {string} sellPoint.avatarId      avatar id (0-99)
   * @param {string} sellPoint.currencyId  currency id (0-99) 1:USD 2:EUR 3:YEN
   * @param {string} sellPoint.messenger   16 char max , just the http://t.me/(xxxxxxxxxxxxxxxx)
   * @param {string} sellPoint.rates     rates you want to take as seller of crypto
   * @param {string} sellPoint.buyRates   rates you want to take as a buyer of crypto
   * @param {bool}   sellPoint.buyer      if user want to be a buyer as well
   * @param {string} sellPoint.amount  Amount to put in escrow as a sell point
   * @param {Number} sellPoint.gasPrice   (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param {string} password             user password
   * @return {Promise<object>} Hash tsx
   */
  async addTeller(sellPoint, password) {
    // const secu = validateSellPoint(sellPoint);
    // if (secu.error) throw new TypeError(secu.msg);
    // const secuPass = validatePassword(password);
    // if (secuPass.error) throw new TypeError(secuPass.msg);
    const tsxAmount = Ethers.utils.parseEther(sellPoint.amount.toString());
    const formattedSellPoint = Formatters.tellerToContract(sellPoint);
    const wallet = await this._getWallet(password);

    const overloadedTransferAbi = {
      constant: false,
      inputs: [
        {
          name: "_to",
          type: "address"
        },
        {
          name: "_value",
          type: "uint256"
        },
        {
          name: "_data",
          type: "bytes"
        }
      ],
      name: "transfer",
      outputs: [
        {
          name: "",
          type: "bool"
        }
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function"
    };

    const licencePrice = await this.dether.getLicenceTeller(
      sellPoint.countryId
    );

    const transferMethodTransactionData = web3Abi.encodeFunctionCall(
      overloadedTransferAbi,
      [
        this.dether.contractInstance.address,
        Ethers.utils.parseEther(licencePrice.toString()),
        formattedSellPoint
      ]
    );

    try {
      // send function to add teller
      const nonce = await this.dether.provider.getTransactionCount(
        wallet.address
      );
      const tsxAdd = await wallet.sendTransaction({
        to: this.dether.dthTokenAddress || TICKER[this.dether.network]["DTH"], // eslint-disable-line dot-notation
        data: transferMethodTransactionData,
        gasPrice: sellPoint.gasPrice
          ? Ethers.utils.bigNumberify(sellPoint.gasPrice)
          : Ethers.utils.bigNumberify("20000000000"),
        gasLimit: 500000,
        nonce
      });
      // update nonce to send addfund function
      const customContract = await Contracts.getCustomContract({
        address: this.dether.contractInstance.address,
        wallet,
        password,
        value: tsxAmount,
        nonce: nonce + 1, // get nonce
        gasPrice: sellPoint.gasPrice
          ? Ethers.utils.bigNumberify(sellPoint.gasPrice)
          : Ethers.utils.bigNumberify("20000000000"),
        gasLimit: 110000
      });
      const transactionAddEth = await customContract.addFunds();
      // return addfund fonction to have the amount in history
      return transactionAddEth.hash;
    } catch (e) {
      throw new TypeError(e);
    }
  }

  /**
   * Add Eth into teller sellpoint
   * @param {object} opts
   * @param {number} opts.amount
   * @param {number} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param {string} password
   * @return {string} Hash tsx
   */
  async addEth(opts, password) {
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);
    const { amount } = opts;
    const wallet = await this._getWallet(password);
    const customContract = await Contracts.getCustomContract({
      wallet,
      password,
      address: this.dether.dthCoreAddress,
      value: Ethers.utils.parseEther(amount),
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000"),
      gasLimit: 110000
    });
    const transactionAddEth = await customContract.addFunds();
    return transactionAddEth.hash;
  }

  /**
   * Update Teller
   * @param {object} opts
   * @param {int} opts.currencyId
   * @param {string} opts.messenger
   * @param {int} opts.avatarId
   * @param {int} opts.rates
   * @param {float} opts.amount
   * @param {number} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   */
  async updateTeller(opts, password) {
    // secu pass
    // validate param
    const { currencyId, messenger, avatarId, rates, amount } = opts;
    const wallet = await this._getWallet(password);

    const customContract = await Contracts.getCustomContract({
      wallet,
      password,
      address: this.dether.dthCoreAddress,
      value: Ethers.utils.parseEther(amount.toString()),
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000"),
      gasLimit: 110000
    });
    const formatedUpdate = Formatters.updateToContract(opts);
    const transaction = await customContract.updateTeller(
      ...Object.values(formatedUpdate)
    );

    return transaction.hash;
  }

  /**
   * Send eth from teller escrow
   * @param  {object}  opts
   * @param  {string}  opts.receiver Receiver ethereum address
   * @param  {number}  opts.amount   Amount to send
   * @param  {number} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param  {string}  password      Wallet password
   * @return {Promise<object>} hash tsx
   */
  async sendToBuyer(opts, password) {
    const secu = validateSendCoin(opts);
    if (secu.error) throw new TypeError(secu.msg);
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);

    const { amount, receiver } = opts;

    const wallet = await this._getWallet(password);

    const customContract = await Contracts.getCustomContract({
      wallet,
      password,
      address: this.dether.dthCoreAddress,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000"),
      gasLimit: 300000
    });

    const transaction = await customContract.sellEth(
      add0x(receiver),
      Ethers.utils.parseEther(amount.toString())
    );
    return transaction.hash;
  }

  /**
   * Send eth from escrow to a swap then to buyer
   * @param  {object}  opts
   * @param  {string}  opts.receiver Receiver ethereum address
   * @param  {number}  opts.amount   Amount to send
   * @param  {number}  opts.ticker   Amount to send
   * @param  {number}  opts.buyRate  expected rates
   * @param  {number} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param  {string}  password      Wallet password
   * @return {Promise<object>} hash tsx
   */
  async sendTokenToBuyer(opts, password) {
    const secu = validateSendCoin(opts);
    if (secu.error) throw new TypeError(secu.msg);
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);
    const { amount, receiver } = opts;

    const wallet = await this._getWallet(password);

    // // check if trade are enabled
    const kyberNetworkProxyContractRead = ExternalContracts.getKyberNetworkProxyContract(
      this.dether.provider
    );
    const networkEnabled = await kyberNetworkProxyContractRead.enabled();
    if (!networkEnabled) {
      console.log("Kyber enabled = ", networkEnabled);
      throw new TypeError("Trade not available for the moment.");
    }

    // // check if we dont have surpass gasmax
    let maxGasPrice = await kyberNetworkProxyContractRead.maxGasPrice();
    if (Ethers.utils.bigNumberify(maxGasPrice).lt(opts.gasPrice)) {
      console.log("Gas price is too high. Retry with less");
      throw new TypeError("Gas price is too high. Retry with less");
    }

    // create swap temp wallet
    const tempWallet = new Ethers.Wallet.createRandom();
    tempWallet.provider = this.dether.provider;
    // get the nonce to be able to send 2 tsx in same time
    const _nonce = await wallet.provider.getTransactionCount(wallet.address);
    // send enough gas to the temp wallet to be able to send the token to receiver
    const toSend = Ethers.utils.bigNumberify(opts.gasPrice).mul(380000);
    const tsx1 = await wallet.sendTransaction({
      to: tempWallet.address,
      // value: Ethers.utils.parseEther(toSend)
      value: toSend,
      gasLimit: 25000,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000")
    });

    // sell ETH from contract to swap temp address
    const customContract = await Contracts.getCustomContract({
      wallet,
      password,
      address: this.dether.dthCoreAddress,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000"),
      gasLimit: 300000,
      nonce: _nonce + 1
    });

    const tsx2 = await customContract.sellEth(
      add0x(tempWallet.address),
      Ethers.utils.parseEther(amount.toString())
    );
    console.log("sell ETH function to the temp wallet\n", tsx2);
    await this.dether.provider.waitForTransaction(tsx2.hash); // wait for this tsx to be mined to pass to step 2

    // kyber swap from temp wallet to receiver
    console.log("start to create the swap");
    const buyTokenAddr = ExternalContracts.getTokenContractAddr(
      this.dether.provider,
      opts.ticker
    );
    console.log("build the contract", tempWallet);
    const kyberNetworkProxyContract = ExternalContracts.getKyberNetworkProxyContractToSend(
      {
        wallet: tempWallet,
        value: Ethers.utils.parseEther(amount.toString()),
        gasPrice: opts.gasPrice
          ? Ethers.utils.bigNumberify(opts.gasPrice)
          : Ethers.utils.bigNumberify("20000000000")
      }
    );
    const transaction = await kyberNetworkProxyContract.trade(
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      Ethers.utils.parseEther(amount.toString()),
      buyTokenAddr,
      opts.receiver,
      Ethers.utils.bigNumberify(10).pow(28),
      opts.buyRate,
      "0x0000000000000000000000000000000000000000"
    );
    console.log("tsx final -> \n", transaction);
    // create a refund tsx to the gas who is not used by the account.
    const gasToRefund = Ethers.utils.bigNumberify(opts.gasPrice).mul(70000);
    const refundTsx = await tempWallet.sendTransaction({
      to: wallet.address,
      value: gasToRefund,
      gasLimit: 23000,
      nonce: 1,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000")
    });
    return transaction.hash;
  }

  /**
   * Send eth from escrow to a swap then to buyer in 2 part for better front-end UX
   * @param  {object}  opts
   * @param  {string}  opts.receiver Receiver ethereum address
   * @param  {number}  opts.amount   Amount to send
   * @param  {number}  opts.ticker   Amount to send
   * @param  {number}  opts.buyRate  expected rates
   * @param  {number} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param  {string}  password      Wallet password
   * @return {Promise<object>} hash tsx
   */
  async sendTokenToBuyer_1(opts, password) {
    const secu = validateSendCoin(opts);
    if (secu.error) throw new TypeError(secu.msg);
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);
    console.log("sendTokenToBuyer", opts);
    const { amount, receiver } = opts;

    const wallet = await this._getWallet(password);

    // // check if trade are enabled
    const kyberNetworkProxyContractRead = ExternalContracts.getKyberNetworkProxyContract(
      this.dether.provider
    );
    const networkEnabled = await kyberNetworkProxyContractRead.enabled();
    if (!networkEnabled) {
      console.log("Kyber enabled = ", networkEnabled);
      throw new TypeError("Trade not available for the moment.");
    }

    // // check if we dont have surpass gasmax
    let maxGasPrice = await kyberNetworkProxyContractRead.maxGasPrice();
    if (Ethers.utils.bigNumberify(maxGasPrice).lt(opts.gasPrice)) {
      console.log("Gas price is too high. Retry with less");
      throw new TypeError("Gas price is too high. Retry with less");
    }

    // create swap temp wallet
    const tempWallet = new Ethers.Wallet.createRandom();
    tempWallet.provider = this.dether.provider;
    // const encryptedTempWallet = await tempWallet.encrypt(password);
    // get the nonce to be able to send 2 tsx in same time
    const _nonce = await wallet.provider.getTransactionCount(wallet.address);
    // send enough gas to the temp wallet to be able to send the token to receiver
    // const toSend = "0.01"; // this value should be the amount needed for the gas payment required, need 300000
    const toSend = Ethers.utils.bigNumberify(opts.gasPrice).mul(380000);
    const tsx1 = await wallet.sendTransaction({
      to: tempWallet.address,
      // value: Ethers.utils.parseEther(toSend)
      value: toSend,
      gasLimit: 25000,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000")
    });
    console.log(
      "\n----\nsend ETH for gas to the temp wallet",
      tsx1,
      "\n----\n"
    );
    // sell ETH from contract to swap temp address
    const customContract = await Contracts.getCustomContract({
      wallet,
      password,
      address: this.dether.dthCoreAddress,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000"),
      gasLimit: 300000,
      nonce: _nonce + 1
    });

    const tsx2 = await customContract.sellEth(
      add0x(tempWallet.address),
      Ethers.utils.parseEther(amount.toString())
    );

    const ret = {
      hash: tsx2.hash,
      privKey: tempWallet.privateKey
    };
    return ret;
  }

  /**
   * Send eth from escrow to a swap then to buyer in 2 part for better front-end UX
   * @param  {object}  opts
   * @param  {string}  opts.receiver Receiver ethereum address
   * @param  {obj}     opts.privKey privkey temp swap wallet
   * @param  {number}  opts.amount   Amount to send
   * @param  {number}  opts.ticker   Amount to send
   * @param  {number}  opts.refundAddress orginal teller address
   * @param  {number}  opts.buyRate  expected rates
   * @param  {number} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param  {string}  password      Wallet password
   * @return {Promise<object>} hash tsx
   */
  async sendTokenToBuyer_2(opts, password) {
    const secu = validateSendCoin(opts);
    if (secu.error) throw new TypeError(secu.msg);

    const { amount, receiver, privKey } = opts;

    // rebuild the wallet
    const tempWallet = new Ethers.Wallet(privKey);
    tempWallet.provider = this.dether.provider;

    const kyberNetworkProxyContract = ExternalContracts.getKyberNetworkProxyContractToSend(
      {
        wallet: tempWallet,
        value: Ethers.utils.parseEther(amount.toString()),
        gasPrice: opts.gasPrice
          ? Ethers.utils.bigNumberify(opts.gasPrice)
          : Ethers.utils.bigNumberify("20000000000")
      }
    );
    const buyTokenAddr = ExternalContracts.getTokenContractAddr(
      this.dether.provider,
      opts.ticker
    );

    const transaction = await kyberNetworkProxyContract.trade(
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee) OK
      Ethers.utils.parseEther(amount.toString()), // OK
      buyTokenAddr, //ERC20 destToken OK
      opts.receiver, //address destAddress
      Ethers.utils.bigNumberify(10).pow(28), //uint maxDestAmount
      // Ethers.utils.bigNumberify(opts.buyRate), //uint minConversionRate
      opts.buyRate, //uint minConversionRate
      "0x0000000000000000000000000000000000000000" //uint walletId
    );

    return transaction.hash;
  }

  /**
 * Delete sell point, this function withdraw automatically balance escrow to owner and delete all info
 * @param  {string} password  Wallet password
 * @param  {string}  opts.refundAddress original teller ethereum address
 * @param  {obj}     opts.privKey privkey temp swap wallet
 * @param {number} opts.gasPrice  gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
 * @return {Promise<object>}  Transaction
 */
  async postSellTokenRefund(opts, password) {

    const { refundAddress, privKey } = opts;

    // rebuild the wallet
    const tempWallet = new Ethers.Wallet(privKey);
    tempWallet.provider = this.dether.provider;

    const toRefund = await this.dether.provider.getBalance(tempWallet.address)

    const toSend = Ethers.utils.bigNumberify(opts.gasPrice).mul(22100);

    const finalValue = Ethers.utils.bigNumberify(toRefund).sub(toSend);

    const tsx = await tempWallet.sendTransaction({
      to: refundAddress,
      // value: Ethers.utils.parseEther(toSend)
      value: finalValue,
      gasLimit: 22000,
      nonce: 1,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000")
    });
    return tsx.hash;
  }

  /**
   * Delete sell point, this function withdraw automatically balance escrow to owner and delete all info
   * @param  {string} password  Wallet password
   * @param {number} opts.gasPrice  gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @return {Promise<object>}  Transaction
   */
  async deleteSellPoint(opts, password) {
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);

    const wallet = await this._getWallet(password);

    const customContract = await Contracts.getCustomContract({
      wallet,
      password,
      address: this.dether.dthCoreAddress,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000"),
      gasLimit: 200000
    });

    const transaction = await customContract.deleteTeller();
    // const minedTsx = await this.dether.provider.waitForTransaction(transaction.hash);
    return transaction.hash;
  }

  /**
   * Delete sell point, this function withdraw automatically balance escrow to owner and delete all info
   * msg.sender should be dether.TELLERMODERATOR
   * @param {Object} opts
   * @param {string} opts.toDelete User addr
   * @param {Number} opts.nonce nonceToAdd
   * @param {number} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param  {string} password  Wallet password
   * @return {Promise<object>}  Transaction
   */
  async deleteSellPointModerator(opts, password) {
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);

    const wallet = await this._getWallet(password);

    const customContract = await Contracts.getCustomContract({
      wallet,
      password,
      address: this.dether.dthCoreAddress,
      nonce: opts.nonce,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000")
    });
    const transaction = await customContract.deleteTellerMods(opts.toDelete);
    // const minedTsx = await this.dether.provider.waitForTransaction(transaction.hash);
    return transaction.hash;
  }

  // gas used = 26497
  // gas price average (mainnet) = 25000000000 wei
  // 50000 * 25000000000 = 0.001250000000000000 ETH
  // need 0.001250000000000000 ETH to process this function
  /**
   * Turn Offline SellPoint withdraw automatically balance escrow to owner but keep info
   * @param  {string} password  Wallet password
   * @param {number} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @return {Promise<object>}  Transaction
   */
  async turnOfflineSellPoint(opts, password) {
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);

    const wallet = await this._getWallet(password);

    const customContract = await Contracts.getCustomContract({
      wallet,
      password,
      address: this.dether.dthCoreAddress,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000")
    });

    const transaction = await customContract.switchTellerOffline();
    const minedTsx = await this.dether.provider.waitForTransaction(
      transaction.hash
    );
    return minedTsx;
  }

  /**
   * Send ETH OR ERC21 TOKEN
   * @param  {object}  opts
   * @param  {string}  opts.token Ticker of the token
   * @param  {string}  opts.amount value to send
   * @param  {string}  opts.receiverAddress address to send
   * @param  {string}  opts.nonce nonce for the transaction
   * @param  {Number}  opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param  {string} password  Wallet password
   * @return {Promise<object>}  Transaction
   */
  async sendToken(opts, password) {
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);
    // verify all param
    const wallet = await this._getWallet(password);
    const nonce = opts.nonce
      ? opts.nonce
      : await this.dether.provider.getTransactionCount(wallet.address);
    if (opts.token === "ETH") {
      const result = await wallet.send(
        opts.receiverAddress,
        Ethers.utils.parseEther(opts.amount),
        {
          gasPrice: opts.gasPrice
            ? Ethers.utils.bigNumberify(opts.gasPrice)
            : Ethers.utils.bigNumberify("20000000000"),
          gasLimit: 21000,
          nonce
        }
      );
      return result.hash;
    } else if (opts.token === "DTH") {
      // check if we passed in a custom DetherToken contract address
      const tokenAddress =
        this.dether.dthTokenAddress || TICKER[this.dether.network][opts.token];
      // const nonce = await this.dether.provider.getTransactionCount(wallet.address);
      const erc20 = await Contracts.getSignedErc20Contract({
        wallet,
        password,
        address: tokenAddress,
        nonce,
        gasPrice: opts.gasPrice
          ? Ethers.utils.bigNumberify(opts.gasPrice)
          : Ethers.utils.bigNumberify("20000000000"),
        gasLimit: 130000
      });
      const tsx = await erc20.transfer(
        opts.receiverAddress,
        Ethers.utils.parseEther(opts.amount)
      );
      return tsx.hash;
    } else if (TICKER[this.dether.network][opts.token]) {
      // it's not DTH token but another token
      const erc20 = await Contracts.getSignedErc20Contract({
        wallet,
        password,
        address: TICKER[this.dether.network][opts.token],
        gasPrice: opts.gasPrice
          ? Ethers.utils.bigNumberify(opts.gasPrice)
          : Ethers.utils.bigNumberify("20000000000"),
        gasLimit: 130000,
        nonce
        // nonce: await this.dether.provider.getTransactionCount(wallet.address),
      });
      const tsx = await erc20.transfer(
        opts.receiverAddress,
        Ethers.utils.parseEther(opts.amount)
      );
      return tsx.hash;
    }
    throw new TypeError("Account need more gas");
    // return opts.token;
  }

  /**
   * Certify New User, this function whitelist by sms new user, USER SHOULD BE SMS.DELEGATE
   * @param  {object}  opts
   * @param  {string}  opts.user ethereum address
   * @param {string} opts.nonce
   * @param  {string} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param  {string} password  Wallet password
   * @return {Promise<object>}  Transaction
   */
  async certifyNewUser(opts, password) {
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);

    const wallet = await this._getWallet(password);

    const customContract = await Contracts.getSmsContract({
      wallet,
      password,
      address: this.dether.dthSmsAddress, // can be undefined
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000"),
      nonce: opts.nonce
    });
    const transaction = await customContract.certify(opts.user);
    // const minedTsx = await this.dether.provider.waitForTransaction(transaction.hash);
    return transaction.hash;
  }

  /**
   * Revoke User, this function revoke user, USER SHOULD BE SMS.DELEGATE
   * @param  {object}  opts
   * @param  {string}  opts.user ethereum address
   * @param {string} opts.nonce
   * @param  {string} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param  {string} password  Wallet password
   * @return {Promise<object>}  Transaction
   */
  async revokeUser(opts, password) {
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);

    const wallet = await this._getWallet(password);

    const customContract = await Contracts.getSmsContract({
      wallet,
      password,
      address: this.dether.dthSmsAddress,
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000"),
      nonce: opts.nonce
    });
    const transaction = await customContract.revoke(opts.user);
    // const minedTsx = await this.dether.provider.waitForTransaction(transaction.hash);
    return transaction.hash;
  }

  /**
   * exchange
   * @param {object} opts
   * @param {string} opts.sellToken sell ticker
   * @param {string} opts.buyToken buy ticker
   * @param {float}  opts.sellAmount sell value in ETH equivalent (18 decimal)
   * @param {float}  opts.buyAmount amount we get for selling sellAmount of sellToken,
   *                                we retrieve this from detherJs.getEstimation()
   * @param {string} opts.buyRate buy rate returned by kyber contract getExpectedRate function
   * @param {password} password
   * @return {string} tsx hash - transaction is mined
   */
  async exchange(
    { sellToken, buyToken, sellAmount, buyAmount, gasPrice, buyRate },
    password
  ) {
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);

    if (
      !["kovan", "mainnet", "rinkeby", "ropsten"].includes(this.dether.network)
    ) {
      throw new TypeError("only works on kovan, ropsten, rinkeby and mainnet");
    }
    // whitelist accepted trading pairs
    const acceptedPair = ALLOWED_EXCHANGE_PAIRS.some(pair => {
      const [sell, buy] = pair.pair.split("-");
      return (
        (sell === sellToken && buy === buyToken) ||
        (sell === buyToken && buy === sellToken)
      );
    });
    if (!acceptedPair) {
      throw new TypeError("Trading pair not implemented");
    }
    if (!sellAmount || typeof sellAmount !== "number") {
      throw new TypeError("sellAmount should be a positive number");
    }
    if (!buyAmount || typeof buyAmount !== "number") {
      throw new TypeError("buyAmount should be a positive number");
    }

    try {
      const tsx = await exchangeTokens({
        sellToken,
        buyToken,
        sellAmount,
        buyAmount, // only needed with AirSwap
        gasPrice,
        wallet: await this._getWallet(password),
        buyRate // only needed with Kyber
      });
      if (tsx && tsx.hash) {
        return tsx.hash;
      }
      // TODO remove and handle error result in front
      // return '0x0000000000000000000000000000000000000000000000000000000000000000';
      throw new TypeError("Unknow error, retry later");
    } catch (e) {
      throw new TypeError(e);
    }
  }

  /**
   * Revoke User, this function revoke user, USER SHOULD BE SMS.DELEGATE
   * @param  {object}  opts
   * @param  {string} opts.ticker (optional) token address to allow
   * @param  {string} opts.gasPrice (optional) gasprice you want to use in the tsx in WEI ex: 20000000000 for 20 GWEI
   * @param  {string} password  Wallet password
   * @return {Promise<object>}  Transaction hash
   */
  async addAirswapAllowance(opts, password) {
    const secuPass = validatePassword(password);
    if (secuPass.error) throw new TypeError(secuPass.msg);

    const wallet = await this._getWallet(password);

    const payToken = await Contracts.getSignedErc20Contract({
      wallet,
      password,
      address: TICKER[this.dether.network][opts.ticker],
      gasPrice: opts.gasPrice
        ? Ethers.utils.bigNumberify(opts.gasPrice)
        : Ethers.utils.bigNumberify("20000000000"),
      gasLimit: 115000
      // nonce: await this.dether.provider.getTransactionCount(wallet.address),
    });

    // const payToken = ExternalContracts.getTokenContract(wallet, opts.ticker, opts.gasPrice);
    const sentTsx = await payToken.approve(
      ExternalContracts.getAirsSwapExchangeContractAddr(wallet.provider),
      getMaxUint256Value()
    );
    return sentTsx.hash;
  }
}

export default DetherUser;
