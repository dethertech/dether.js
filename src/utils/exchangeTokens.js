/* eslint-disable max-len, object-curly-newline, padded-blocks, function-paren-newline */
import uuid from 'uuid';
import WebSocket from 'isomorphic-ws';
import Ethers from 'ethers';
import BigNumber from 'bignumber.js';
import xhr from 'xhr-request';

import { AIRSWAP_WEBSOCKET, CRYPTOCOMPARE_URL, ALLOWED_EXCHANGE_PAIRS, KYBER_ETH_TOKEN_ADDR } from '../constants/appConstants';

import {
  toWei,
  // getMethodSig,
  getMaxUint256Value,
  getNetworkName,
} from './eth';

import { getChainId } from './providers';

// import Formatters from './formatters';

import {
  getTokenContract,
  getTokenContractAddr,
  // getMakerOtcContractAddr,
  // getMakerProxyRegistryContract,
  // getDsProxyContract,
  // getOasisProxyCreateExecuteContract,
  // getMakerProxyRegistryContractAddr,
  // getOasisProxyCreateExecuteContractAddr,
  // getOasisDirectProxyContractAddr,
  getAirsSwapExchangeContract,
  getAirsSwapExchangeContractAddr,
  getKyberNetworkProxyContract,
  getKyberNetworkProxyContractAddr,
  getKyberNetworkProxyContractToSend,
} from './externalContracts';

//
// OasisDex
//
//
// /**
//  * create ether.js contract instance of Oasis ProxyCreateExecute contract on chain of wallet.provider
//  * NOTE: will pre-set the gasPrice + eth to send
//  *
//  * @param {Wallet} wallet - wallet to send transaction from
//  * @param {Number} [ethAmount=0] - optional amount of eth to send
//  * @return {Contract} contract instance
//  */
// const loadProxyCreateExecuteContract = (wallet, ethAmount = 0) => (
//   getOasisProxyCreateExecuteContract({
//     wallet,
//     value: toWei(ethAmount),
//     gasPrice: 10000000000, // 10 gwei
//   })
// );
//
// /**
//  * create ether.js contract instance of DsProxy contract on chain of wallet.provider
//  * NOTE: contract will be created dynamically by proxyCreateExecute, so we need to
//  *       manually pass in the contractAddr of the DsProxy contract we want to load
//  * NOTE: will pre-set the gasPrice + eth to send
//  *
//  * @param {String} contractAddr - address of the DsProxy contract
//  * @param {Wallet} wallet - wallet to send transaction from
//  * @param {Number} [ethAmount=0] - optionalamount of eth to send
//  * @return {Contract} contract instance
//  */
// const loadDsProxyContract = (contractAddr, wallet, ethAmount = 0) => (
//   getDsProxyContract({
//     contractAddr,
//     wallet,
//     value: toWei(ethAmount),
//     gasPrice: 10000000000, // 1- gwei
//   })
// );
//
// /**
//  * create ether.js contract instance of Maker ProxyRegistry contract on chain of wallet.provider
//  *
//  * @param {Object} provider - ether.js provider object
//  * @return {Contract} contract instance
//  */
// const loadProxyRegistryContract = provider => (
//   getMakerProxyRegistryContract(
//     provider,
//   )
// );
//
// /**
//  * generate calldata to pass to the DsProxy when calling OasisDirectProxy methods (e.g. sellAllAmountPayEth)
//  *
//  * @param {Object} opts - options
//  * @param {Object} opts. - options
//  */
// const createCalldata = (provider, { sellToken, buyToken, sellAmount, buyAmount }) => {
//   const otcBytes32 = Formatters.addressToBytes32(getMakerOtcContractAddr(provider));
//   const fromAddrBytes32 = Formatters.addressToBytes32(getTokenContractAddr(provider, sellToken));
//   const toAddrBytes32 = Formatters.addressToBytes32(getTokenContractAddr(provider, buyToken));
//   const limitBytes32 = Formatters.toBytes32(toWei(buyAmount));
//
//   let methodSig;
//   let calldata;
//
//   if (sellToken === 'ETH') {
//     // args: OtcInterface otc, TokenInterface wethToken, TokenInterface buyToken, uint minBuyAmt
//     methodSig = getMethodSig('sellAllAmountPayEth(address,address,address,uint256)');
//     calldata = methodSig + otcBytes32 + fromAddrBytes32 + toAddrBytes32 + limitBytes32;
//
//   } else if (buyToken === 'ETH') {
//     // we need to add payAmt (amount of sellToken we are selling)
//     const payAmtBytes32 = Formatters.toBytes32(toWei(sellAmount));
//
//     // args: OtcInterface otc, TokenInterface payToken, uint payAmt, TokenInterface wethToken, uint minBuyAmt
//     methodSig = getMethodSig('sellAllAmountBuyEth(address,address,uint256,address,uint256)');
//     calldata = methodSig + otcBytes32 + fromAddrBytes32 + payAmtBytes32 + toAddrBytes32 + limitBytes32;
//   }
//
//   return calldata;
// };

//
//
// AirSwap
//
//

const loadAirsSwapExchangeContract = (wallet, weiAmount, gasPrice, nonce) => (
  getAirsSwapExchangeContract({
    wallet,
    value: weiAmount,
    gasPrice, // 10 gwei
    nonce,
  })
);

const createFindIntentsReq = (indexerAddr, takerAddr, payToken, buyToken) => ({
  sender: takerAddr.toLowerCase(),
  receiver: indexerAddr,
  message: {
    id: uuid.v4().replace(/-/g, ''),
    jsonrpc: '2.0',
    method: 'findIntents',
    params: {
      makerTokens: [buyToken],
      takerTokens: [payToken],
      role: [],
    },
  },
});

const createGetOrderReq = (takerAddr, makerAddr, payToken, buyToken, buyTokenAmount, sellTokenAmount) => ({
  sender: takerAddr.toLowerCase(),
  receiver: makerAddr.toLowerCase(),
  message: {
    id: uuid.v4().replace(/-/g, ''),
    jsonrpc: '2.0',
    method: 'getOrder',
    params: {
      // makerAmount: toWei(buyTokenAmount).toString(),
      takerAmount: toWei(sellTokenAmount).toString(),
      makerToken: buyToken,
      takerToken: payToken,
      takerAddress: takerAddr.toLowerCase(),
    },
  },
});

const parseMsg = (inputMsg, possibleCallIds) => {
  let msg;
  try {
    msg = JSON.parse(inputMsg);
  } catch (err) {
    throw new Error('failed parsing json findIntents response msg.data');
  }

  try {
    msg.message = JSON.parse(msg.message);
  } catch (err) {
    throw new Error('failed parsing json response msg.data.message');
  }

  if (!possibleCallIds.includes(msg.message.id)) {
    throw new Error('response id does not match req id');
  }

  return msg;
};

const sellEthForERC20 = async (wallet, gasPrice, signedOrder) => {
  console.log('sellETHforERC20 signedorder', signedOrder);
  const airswapExchange = loadAirsSwapExchangeContract(wallet, Ethers.utils.bigNumberify(signedOrder.takerAmount.toString()), gasPrice);
  let fillTsx;
  if (signedOrder.sig) {
    fillTsx = await airswapExchange.functions['fill(address,uint256,address,address,uint256,address,uint256,uint256,uint8,bytes32,bytes32)'](
      signedOrder.makerAddress,
      Ethers.utils.bigNumberify(signedOrder.makerAmount),
      signedOrder.makerToken,
      signedOrder.takerAddress,
      Ethers.utils.bigNumberify(signedOrder.takerAmount),
      signedOrder.takerToken,
      Ethers.utils.bigNumberify(parseInt(signedOrder.expiration).toString()), // quick fix to avoid float
      Ethers.utils.bigNumberify(signedOrder.nonce),
      Ethers.utils.bigNumberify(signedOrder.sig.v.toString(10)),
      signedOrder.sig.r,
      signedOrder.sig.s,
    );
  } else {
    fillTsx = await airswapExchange.functions['fill(address,uint256,address,address,uint256,address,uint256,uint256,uint8,bytes32,bytes32)'](
      signedOrder.makerAddress,
      Ethers.utils.bigNumberify(signedOrder.makerAmount),
      signedOrder.makerToken,
      signedOrder.takerAddress,
      Ethers.utils.bigNumberify(signedOrder.takerAmount),
      signedOrder.takerToken,
      Ethers.utils.bigNumberify(parseInt(signedOrder.expiration).toString()), // quick fix to avoid float
      Ethers.utils.bigNumberify(signedOrder.nonce),
      Ethers.utils.bigNumberify(signedOrder.v.toString(10)),
      signedOrder.r,
      signedOrder.s,
    );
  }
  console.log('After fills tsx airswapExchange', fillTsx);
  console.log('fill tsx', JSON.stringify(fillTsx, null, 4));

  return fillTsx;
};

const sellERC20ForEth = async (wallet, sellToken, gasPrice, signedOrder, nonce) => {
    console.log('sellERC20FORETH signedorder', signedOrder);
  // nonce could come from the approve() call we previously did,
  // or there could be no nonce passed in if we didnt do approve() beforehand
  const airswapExchange = loadAirsSwapExchangeContract(wallet, 0, gasPrice, nonce);
  if (!nonce) {
    nonce = await wallet.provider.getTransactionCount(wallet.address);
  }
  if (signedOrder.sig) {
    await airswapExchange.functions['fill(address,uint256,address,address,uint256,address,uint256,uint256,uint8,bytes32,bytes32)'](
      signedOrder.makerAddress,
      Ethers.utils.bigNumberify(signedOrder.makerAmount),
      signedOrder.makerToken,
      signedOrder.takerAddress,
      Ethers.utils.bigNumberify(signedOrder.takerAmount),
      signedOrder.takerToken,
      Ethers.utils.bigNumberify(parseInt(signedOrder.expiration).toString()), // quick fix to avoid float
      Ethers.utils.bigNumberify(signedOrder.nonce),
      Ethers.utils.bigNumberify(signedOrder.sig.v.toString(10)),
      signedOrder.sig.r,
      signedOrder.sig.s,
    );
  } else {
    await airswapExchange.functions['fill(address,uint256,address,address,uint256,address,uint256,uint256,uint8,bytes32,bytes32)'](
      signedOrder.makerAddress,
      Ethers.utils.bigNumberify(signedOrder.makerAmount),
      signedOrder.makerToken,
      signedOrder.takerAddress,
      Ethers.utils.bigNumberify(signedOrder.takerAmount),
      signedOrder.takerToken,
      Ethers.utils.bigNumberify(parseInt(signedOrder.expiration).toString()), // quick fix to avoid float
      Ethers.utils.bigNumberify(signedOrder.nonce),
      Ethers.utils.bigNumberify(signedOrder.v.toString(10)),
      signedOrder.r,
      signedOrder.s,
    );
  }
  // console.log('fill tsx', JSON.stringify(fillTsx, null, 4));

  const weth = getTokenContract(wallet, 'ETH', gasPrice, 0, nonce + 1);

  const withdrawTsx = await weth.withdraw(Ethers.utils.bigNumberify(signedOrder.makerAmount));

  return withdrawTsx;
};

const getBestSignedOrder = (sellAmount, buyAmount, signedOrders) => {
  const bestSignedOrder = signedOrders.reduce((bestOrder, signedOrder) => {
    const takerAmount = new BigNumber(signedOrder.takerAmount);
    const makerAmount = new BigNumber(signedOrder.makerAmount);
    const rate = takerAmount.div(makerAmount);

   // verify takerAmount(=sellAmount) is not more than 2% cryptocompare rates
   const proposedSellAmount = new BigNumber(signedOrder.takerAmount);
   const estimatedSellAmount = new BigNumber(Ethers.utils.parseEther(sellAmount.toString()).toString(10));

   // verify makerAmount(=buyAmount) is not more than 2% cryptocompare rates
   const proposedBuyAmount = new BigNumber(signedOrder.makerAmount);
   const estimatedBuyAmount = new BigNumber(Ethers.utils.parseEther(buyAmount.toString()).toString(10));

   // console.log('math of 2% check', {
   //   'proposed SellAmount': proposedSellAmount.toString(),
   //   // proposedSellAmount,
   //   'estimated SellAmount': estimatedSellAmount.toString(),
   //   // estimatedSellAmount,
   //   '98  EstSellAmountStr': estimatedSellAmount.div(100).times(98).toString(),
   //   // ninetyEightEstSellAmount: estimatedSellAmount.div(100).times(98),
   //   '102 EstSellAmountStr': estimatedSellAmount.div(100).times(102).toString(),
   //   // oneHunTwoEightEstSellAmount: estimatedSellAmount.div(100).times(102),
   //
   //   'proposed BuyAmount': proposedBuyAmount.toString(),
   //   // proposedBuyAmount,
   //   'estimated BuyAmount': estimatedBuyAmount.toString(),
   //   // estimatedBuyAmount,
   //   '98  EstBuyAmountStr': estimatedBuyAmount.div(100).times(98).toString(),
   //   // ninetyEightEstBuyAmount: estimatedBuyAmount.div(100).times(98),
   //   '102 EstBuyAmountStr': estimatedBuyAmount.div(100).times(102).toString(),
   //   // oneHunTwoEightEstBuyAmount: estimatedBuyAmount.div(100).times(102),
   //   'one': proposedSellAmount.lt(estimatedSellAmount.div(100).times(98)),
   //   'two': proposedSellAmount.gt(estimatedSellAmount.div(100).times(102)),
   //   'three': proposedBuyAmount.lt(estimatedBuyAmount.div(100).times(98)),
   //   'four': proposedBuyAmount.gt(estimatedBuyAmount.div(100).times(102)),
   // });

   // min 85% of estimated sellAmount/buyAmount
   // max 115% of estimated sellAmount/buyAmount

   // if (proposedSellAmount.lt(estimatedSellAmount.div(100).times(85)) ||
   //     proposedSellAmount.gt(estimatedSellAmount.div(100).times(115)) ||
   //     proposedBuyAmount.lt(estimatedBuyAmount.div(100).times(85)) ||
   //     proposedBuyAmount.gt(estimatedBuyAmount.div(100).times(115))
   // ) {
   //   console.log('failed min/max slippage checks');
   //   // atleast 1 of the above checks failed
   //   return bestOrder;
   // }

   // if the new found order has a better rate, set that order as bestOrder
   return (rate.lte(bestOrder.rate)) ? bestOrder : {
     rate,
     signedOrder,
    };
  }, { rate: new BigNumber(0) });
  console.log({ bestSignedOrder: { rate: bestSignedOrder.rate.toString(), signedOrder: bestSignedOrder.signedOrder } });
  if (bestSignedOrder.rate.eq(0)) {
    // found no acceptable offers
    return null;
  }

  return bestSignedOrder.signedOrder;
};

// executed when we've received a response from all makers or the timeout has exceeded
// and we just take whatever getOrder results we received before timeout
const execBestOrder = (wallet, gasPrice, sellToken, buyToken, sellAmount, buyAmount, getOrderResults, nonce) => new Promise((resolve, reject) => {
  console.log('exec best order => with nonce => ', nonce ? nonce : 'no nonce');
  // console.log('get order results ', getOrderResults);
  if (!getOrderResults.length) {
    // received no getOrder responses
    reject(new Error('Trade not possible now, retry later'));
  }
  // console.log(JSON.stringify({ execBestOrder: { sellAmount, buyAmount, getOrderResults } }, null, 4));
  const bestSignedOrder = getBestSignedOrder(sellAmount, buyAmount, getOrderResults);
  console.log('After Tsx ', bestSignedOrder);
  if (!bestSignedOrder) {
    // found no acceptable order (either exceeds +/- 2% of estimation
    return resolve();
  }

  if (sellToken === 'ETH') {
    sellEthForERC20(wallet, gasPrice, bestSignedOrder).then(resolve).catch(reject);
  } else if (buyToken === 'ETH') {
    sellERC20ForEth(wallet, sellToken, gasPrice, bestSignedOrder, nonce).then(resolve).catch(reject);
  } else {
    reject(new Error('unsupported trade pair'));
  }
});

// airswap expects data.message to also be JSON stringified, so its json stringify inside json stringify
const preparePayload = data => (
  JSON.stringify(Object.assign({}, data, { message: JSON.stringify(data.message) }))
);

const setAllowanceIfNeeded = async (wallet, sellToken, gasPrice, allowanceRecipient) => {
  const payToken = getTokenContract(wallet, sellToken, gasPrice);
  const allowance = await payToken.allowance(wallet.address, allowanceRecipient);

  // if allowance has decreased bewlo half of max uint256 value, re-set allownace to max uint256
  if (allowance.lt(getMaxUint256Value().div(2))) {
    console.log('found no set allowance, gonna set it');
    const tsxCount = await wallet.provider.getTransactionCount(wallet.address);
    const sentTsx = await payToken.approve(allowanceRecipient, getMaxUint256Value());
    console.log('sent approve tsx', sentTsx);
    // NOTE: this could take minutes, maybe we should just sent it and then go on
    // hoping that makers also check transactions not yet mined!
    const minedTsx = await sentTsx.wait();
    console.log('mined approve tsx', minedTsx);
    console.log(`successfully set allowance for sellToken ${sellToken}`);
    return tsxCount; // used to set correct nonce in fill() call later on
  }
  console.log('allowance was already set');
  return null;
};

export const getExchangeType = (sellToken, buyToken) => {
  const result = ALLOWED_EXCHANGE_PAIRS.find((pair) => {
    const [sell, buy] = pair.pair.split('-');
    return (sell === sellToken && buy === buyToken) ||
           (sell === buyToken && buy === sellToken);
  });
  return result.exchange;
};

const exchangeTokensKyber = async ({ wallet, sellToken, sellAmount, buyToken, gasPrice, buyRate }) => { // eslint-disable-line
  const sellAmountWei = toWei(sellAmount);
  if (sellToken === 'ETH') {
    const buyTokenAddr = getTokenContractAddr(wallet.provider, buyToken);
    const kyberNetworkProxyContract = getKyberNetworkProxyContractToSend({ wallet, value: sellAmountWei, gasPrice });
    const tx = await kyberNetworkProxyContract.swapEtherToToken(buyTokenAddr, buyRate);
    return tx;
  } else if (buyToken === 'ETH') {
    await setAllowanceIfNeeded(wallet, sellToken, gasPrice, getKyberNetworkProxyContractAddr(wallet.provider));
    const sellTokenAddr = getTokenContractAddr(wallet.provider, sellToken);
    const kyberNetworkProxyContract = getKyberNetworkProxyContractToSend({ wallet, gasPrice });
    const tx = await kyberNetworkProxyContract.swapTokenToEther(sellTokenAddr, sellAmountWei, buyRate);
    return tx;
  }
};

/**
 * exchange sellAmount of sellToken for buyAmount of buyToken
 *
 * @param {Object} opts - options object
 * @param {String} opts.sellToken - symbol of sellToken
 * @param {Number} opts.sellAmount - amount of sellToken
 * @param {String} opts.buyToken - symbol of buyToken
 * @param {Number} opts.buyAmount - amount of buyToken
 * @param {Wallet} opts.wallet - unlocked wallet of the user
 * @return {Object} receipt of the exchange transaction
 */
export const exchangeTokens = ({ wallet, sellToken, sellAmount, buyToken, buyAmount, gasPrice, buyRate }) => new Promise((resolve, reject) => { // eslint-disable-line
  const exchangeType = getExchangeType(sellToken, buyToken);
  if (exchangeType === 'kyber') {
    if (!buyRate) {
      return reject(new Error('missing buyRate argument'));
    }
    return exchangeTokensKyber({ wallet, sellToken, sellAmount, buyToken, buyAmount, gasPrice, buyRate }).then(resolve).catch(reject);
  }
  const INDEXER_ADDRESS = '0x0000000000000000000000000000000000000000';
  const AIRSWAP_WS_TIMEOUT = 5000; // 5 seconds
  const networkName = getNetworkName(getChainId(wallet.provider));
  const WS_SERVER_URL = AIRSWAP_WEBSOCKET[networkName];
  if (!WS_SERVER_URL) {
    return reject(new Error(`did not find an airswap websocket url for network '${networkName}'`));
  }
  // required when using native ETH to buy
  const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

  // since we are using a websocket during most of the exchange phases,
  // we create a state-machine to keep track of where we are in the process
  const AirswapStates = Object.freeze({
    Start: 0,
    RcvChallenge: 1,
    RcvChallengeOk: 2,
    RcvFindIntentsRes: 3,
    RcvGetOrderRes: 4,
    WsDone: 5,
  });

  let tsxCount; // only used when setting allowance!
  let findIntentsCallId;
  let getOrderCallIds = [];
  const getOrderResults = [];
  const sellTokenAddr = sellToken === 'ETH' ? ETH_ADDRESS : getTokenContractAddr(wallet.provider, sellToken);
  const buyTokenAddr = getTokenContractAddr(wallet.provider, buyToken);

  // current state
  let state = AirswapStates.Start;

  const client = new WebSocket(WS_SERVER_URL);

  let currentTimeout = null;

  client.onerror = (err) => {
    if (currentTimeout) clearTimeout(currentTimeout);
    client.close();
    reject(err);
  };

  client.onopen = () => { // eslint-disable-line
    console.log('+++ opened websocket to airswap');
    if (state !== AirswapStates.Start) {
      client.close();
      return reject(new Error(`state '${state}' should have been '${AirswapStates.Start}'`));
    }

    state = AirswapStates.RcvChallenge;
  };

  client.onclose = () => {
    if (currentTimeout) clearTimeout(currentTimeout);
    console.log('--- closed websocket to airswap');
  };

  client.onmessage = (msg) => { // eslint-disable-line
    try {
      if (!msg.data) {
        throw new Error('no msg.data');
      }

      msg = msg.data;

      switch (state) {

        case AirswapStates.RcvChallenge: {
          console.log('<<< rcvd auth challenge');
          client.send(wallet.signMessage(msg));
          currentTimeout = setTimeout(() => {
            client.close();
            resolve();
          }, AIRSWAP_WS_TIMEOUT);
          console.log('>>> sent auth challenge solution');
          state = AirswapStates.RcvChallengeOk;
          break;
        }

        case AirswapStates.RcvChallengeOk: {
          if (currentTimeout) clearTimeout(currentTimeout);
          if (msg !== 'ok') {
            client.close();
            // throw new Error(`challenge response (${msg}) should've been 'ok'`);
            return reject(new Error(`challenge response (${msg}) not ok`));
          }

          console.log('<<< rcvd auth challenge solution ok');
          const data = createFindIntentsReq(INDEXER_ADDRESS, wallet.address, sellTokenAddr.toLowerCase(), buyTokenAddr.toLowerCase());
          console.log('\n\n\nfindIntents payload', JSON.stringify(data, null, 4), '\n');
          findIntentsCallId = data.message.id;
          state = AirswapStates.RcvFindIntentsRes;

          client.send(preparePayload(data));
          currentTimeout = setTimeout(() => {
            client.close();
            resolve();
          }, AIRSWAP_WS_TIMEOUT);
          console.log(`>>> sent findIntent :: buy ${buyToken} with ${sellToken} | callId ${findIntentsCallId} `);
          break;
        }

        case AirswapStates.RcvFindIntentsRes: {
          if (currentTimeout) clearTimeout(currentTimeout);
          msg = parseMsg(msg, findIntentsCallId);
          findIntentsCallId = null;
          console.log(`<<< rcvd findIntent response :: buy ${buyToken} with ${sellToken}`);
          console.log('\n\n\nfindIntents response', JSON.stringify(msg, null, 4), '\n');

          if (!msg.message.result.length) {
            console.log('vvv there are no makers selling this token');
            client.close();
            // there is not a single Maker seeling this token
            return reject(new Error('Trade not possible now, retry later'));
          }

          const makerAddresses = msg.message.result.map(mkr => mkr.address);

          const makerData = [];

          // create airswap jsonrpc payload
          makerAddresses.forEach((makerAddr) => {
            const data = createGetOrderReq(wallet.address, makerAddr, sellTokenAddr, buyTokenAddr, buyAmount, sellAmount);
            makerData.push(data);
            console.log('\ngetOrder payload', JSON.stringify(data, null, 4), '\n');
            getOrderCallIds.push(data.message.id);
          });

          state = AirswapStates.RcvGetOrderRes;

          // we need to approve the AirSwap contract to transfer ERC20 sellToken on behalf of the user
          if (sellToken !== 'ETH') {
            console.log('starting allowance check');
            setAllowanceIfNeeded(wallet, sellToken, gasPrice, getAirsSwapExchangeContractAddr(wallet.provider)).then((tsxCount_) => {
              // need to pass to-be-set nonce into fill() and withdraw()
              tsxCount = tsxCount_;
              state = AirswapStates.RcvGetOrderRes;
              currentTimeout = setTimeout(() => {
                client.close();
                console.log('exec tsx 1');
                execBestOrder(wallet, gasPrice, sellToken, buyToken, sellAmount, buyAmount, getOrderResults, tsxCount !== null && (tsxCount + 1)).then(resolve).catch(reject);

              }, AIRSWAP_WS_TIMEOUT);
              makerData.forEach((data, idx) => {
                client.send(preparePayload(data));
                console.log(`>>> sent getOrder to maker at ${makerAddresses[idx]}`);
              });
            }).catch((err) => {
              client.close();
              reject(err);
            });
          } else {
            currentTimeout = setTimeout(() => {
              client.close();
              execBestOrder(wallet, gasPrice, sellToken, buyToken, sellAmount, buyAmount, getOrderResults)
                .then(resolve).catch(reject);
            }, AIRSWAP_WS_TIMEOUT);
            makerData.forEach((data, idx) => {
              client.send(preparePayload(data));
              console.log(`>>> sent getOrder to maker at ${makerAddresses[idx]}`);
            });
          }
          break;
        }

        case AirswapStates.RcvGetOrderRes: {
          try {
            msg = parseMsg(msg, getOrderCallIds);
          } catch (err) {
            // we will most likely have multiple getOrder responses coming in,
            // if 1 of them gives an error, don't quit this entire function, just ignore the failed
            // response and work with the other (valid) responses we received
            console.log('maker getOrder response error, we ignore it it');
            break;
          }
          getOrderCallIds = getOrderCallIds.filter(callId => callId !== msg.message.id);
          console.log(`<<< rcvd getOrder from maker at ${msg.sender} response :: buy ${buyToken} with ${sellToken}`);
          // console.log('\n\n\ngetOrder response', JSON.stringify(msg, null, 4), '\n\n');

          // just ignore makers that return an error
          console.log('##### message response', msg);
          if (!msg.message.error && !msg.message.result.response) {
            console.log('##### message response clear', msg);
            getOrderResults.push(msg.message.result);
          }
          // console.log(JSON.stringify({ received_from_maker: msg }, null, 4));

          if (!getOrderCallIds.length) {
            if (currentTimeout) clearTimeout(currentTimeout);
            // we've received a response from every maker
            client.close();
            state = AirswapStates.WsDone;
            console.log("#### before exec");
            // try and execute the best order onchain, could error(=reject)
            console.log('exec tsx 2');
            execBestOrder(wallet, gasPrice, sellToken, buyToken, sellAmount, buyAmount, getOrderResults)
              .then(resolve)
              .catch(reject);
          }
          break;
        }

        case AirswapStates.WsDone: {
          // should not happen
          throw new Error('received airswap websocket response but already done with websocket');
        }

        default:
          throw new Error(`unknown State (${state}) when received msg`);
      }
    } catch (err) {
      client.close();
      return reject(err);
    }
  };
});

// used to get bitfinex
const getRequest = url => new Promise((resolve, reject) => {
  xhr(url, { json: true }, (err, res) => (
    err ? reject(err) : resolve(res)
  ));
});

export const getRateEstimation = async ({ provider, sellToken, buyToken, sellAmount }) => { // eslint-disable-line
  const exchangeType = getExchangeType(sellToken, buyToken);
  if (exchangeType === 'kyber') {
    const sellAmountWei = toWei(sellAmount);
    const kyberNetworkProxyContract = getKyberNetworkProxyContract(provider);
    const sellTokenAddr = sellToken === 'ETH' ? KYBER_ETH_TOKEN_ADDR : getTokenContractAddr(provider, sellToken);
    const buyTokenAddr = buyToken === 'ETH' ? KYBER_ETH_TOKEN_ADDR : getTokenContractAddr(provider, buyToken);
    const result = await kyberNetworkProxyContract.getExpectedRate(sellTokenAddr, buyTokenAddr, sellAmountWei);
    const expectedRate = result[0];
    if (expectedRate.eq(0)) {
      return { buyAmount: 0, buyRate: '0' };
    }
    // const slippageRate = result[1];
    const rateBN = new BigNumber(Ethers.utils.formatEther(expectedRate));
    const sellAmountBN = new BigNumber(Ethers.utils.formatEther(sellAmountWei));
    const buyAmountBN = sellAmountBN.times(rateBN);
    return { buyAmount: parseFloat(buyAmountBN), buyRate: expectedRate.toString() };
  } else if (exchangeType === 'airswap') {
    const sellAmountBN = new BigNumber(sellAmount.toString());
    const res = await getRequest(`${CRYPTOCOMPARE_URL}data/price?fsym=${sellToken}&tsyms=${buyToken}`);
    const rateBN = new BigNumber(res[buyToken]);
    const customRateBN = sellAmountBN.times(rateBN);
    return { buyAmount: parseFloat(customRateBN) };
  }
};
