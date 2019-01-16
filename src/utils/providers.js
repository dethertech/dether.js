import Ethers from 'ethers';

/**
 * Retrieve ethereum provider
 * Only network is needed
 *
 * @param {object}  opts
 * @param {String}  opts.network       Name of network ('homestead', 'ropsten', 'rinkeby', 'kovan')
 * @param {?String} opts.rpcURL       JSON RPC provider URL
 * @param {?String} opts.infuraKey    INFURA API Key
 * @param {?String} opts.etherscanKey Etherscan API Key
 * @return {Provider}
 * @ignore
 */
const getProvider = (opts) => {
  // when using ganache, there is no network name, only an rpcURL
  // if (!opts.network) throw new TypeError('Unable to get provider, need network');
  const providers = [];

  if (opts.rpcURL) {
    providers.push(new Ethers.providers.JsonRpcProvider(opts.rpcURL, opts.network));
    if (opts.rcpURL2) {
      providers.push(new Ethers.providers.JsonRpcProvider(opts.rpcURL2, opts.network));
    }
  }
  // if (opts.etherscanKey) {
  //   providers.push(new Ethers.providers.EtherscanProvider(opts.network, opts.etherscanKey));
  // }
  // if (opts.infuraKey) {
  //   providers.push(new Ethers.providers.InfuraProvider(opts.network, opts.infuraKey));
  // }
  if (['kovan', 'ropsten', 'rinkeby', 'homestead', 'mainnet'].includes(opts.network)) {
    if (opts.network === 'mainnet') {
      providers.push(Ethers.providers.getDefaultProvider('homestead'));
    }
    else {
      providers.push(Ethers.providers.getDefaultProvider(opts.network));
    }
  }
  return new Ethers.providers.FallbackProvider(providers);
};

/**
 * return the chainId from the given provider
 *
 * @param {Object} provider - ether.js provider object
 * @return {Number} the chainId of the given provider
 */
export const getChainId = provider => {
  const chainId = provider.provider ? provider.provider.chainId : provider.chainId;
  if (!chainId) throw new Error('No chain id found');
  return chainId;
};

export default {
  getProvider,
};
