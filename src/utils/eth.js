import Ethers from 'ethers';
import utf8 from 'utf8';

/**
 * Test if addr is ethereum address
 * @param  {string}  addr eth address
 * @return {Boolean}
 */
export const isAddr = addr => /^(0x)?[0-9a-f]{40}$/i.test(addr) || /^(0x)?[0-9a-f]{64}$/i.test(addr);

/**
 * Return formated address ethereum
 * @param {string} input address ethereum
 * @return {string}      formated address ethereum or false
 */
export const add0x = (input) => {
  if (!input || typeof (input) !== typeof '' || !isAddr(input)) {
    throw new Error('Invalid address');
  }
  return input.slice(0, 2) !== '0x' ? `0x${input}` : input;
};

/**
 * @ignore
 * Return formated hexa string
 * @param  {string} hex encoded string
 * @return {string}     decoded string
 */
export const toUtf8 = (hex) => {
  if (!hex || typeof hex !== 'string') throw new Error('Invalid args');

  let str = '';

  for (let i = hex.substring(0, 2) === '0x' ? 2 : 0;
    i < hex.length; i += 2) {
      const code = parseInt(hex.substr(i, 2), 16);
      if (code === 0) break;
      str += String.fromCharCode(code);
  }

  try {
    return utf8.decode(str);
  } catch (e) {
    return '';
  }
};

/**
 * returns network name corresponding to given chainId, e.g. 42 -> kovan
 *
 * @param {Number} chainId - chainId
 * @return {String} the corresponding network name
 */
export const getNetworkName = chainId => {
  const networkName = Object.keys(Ethers.networks).find(networkName_ => Ethers.networks[networkName_].chainId === chainId); // eslint-disable-line max-len
  return networkName === 'homestead' ? 'mainnet' : networkName;
};

/**
 * convert eth to wei as BigNumber (or any other token with 18 decimals)
 *
 * @param {BigNumber|Number|String} val - val to convert to wei
 * @return {BigNumber} wei as BigNumber
 */
export const toWei = val => (
  Ethers.utils.parseEther(val.toString())
);

/**
 * generate the method signature of a method string
 *
 * @param {String} method - method, e.g.
 */
export const getMethodSig = method => (
  Ethers.utils.keccak256(Ethers.utils.toUtf8Bytes(method)).substring(0, 10)
);

/**
 * return the max uint256 value, which is 2^256 - 1
 *
 * @return {BigNumber} max uint256 value as a BigNumber
 */
export const getMaxUint256Value = () => (
  Ethers.utils.bigNumberify(2).pow(256).sub(1)
);
