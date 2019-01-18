import Ethers from 'ethers-cordova';

import { COORD_PRECISION } from '../constants/appConstants';
import { toUtf8 } from './eth';
import { validateSellPoint, validateShop } from './validation';

// /**
//  * @ignore
//  */
const convertBase = function () {
    function convertBase(baseFrom, baseTo) {
        return function (num) {
            return parseInt(num, baseFrom).toString(baseTo);
        };
    }
    // binary to decimal
    convertBase.bin2dec = convertBase(2, 10);
    // binary to hexadecimal
    convertBase.bin2hex = convertBase(2, 16);
    // decimal to binary
    convertBase.dec2bin = convertBase(10, 2);
    // decimal to hexadecimal
    convertBase.dec2hex = convertBase(10, 16);
    // hexadecimal to binary
    convertBase.hex2bin = convertBase(16, 2);
    // hexadecimal to decimal
    convertBase.hex2dec = convertBase(16, 10);
    return convertBase;
}();

const intTo5bytes = (intvalue) => {
  let hexvalue;
  let result;
  if (intvalue < 0) {
    const newvalue = -intvalue;
    hexvalue = convertBase.dec2hex(newvalue);
    result = hexvalue;
    for (let i = 0; i + hexvalue.length < 8; i += 1) {
      result = `0${result}`;
    }
    result = `01${result}`;
  } else {
    hexvalue = convertBase.dec2hex(intvalue);
    result = hexvalue;
    for (let i = 0; i + hexvalue.length < 8; i += 1) {
      result = `0${result}`;
    }
    result = `00${result}`;
  }
  return result;
};

const updateToContract = (rawUpdate) => {
  try {
    return {
      currencyId: parseInt(rawUpdate.currencyId, 10),
      messenger: `0x${toNBytes(rawUpdate.messenger, 16)}`,
      avatarId: parseInt(rawUpdate.avatarId, 10),
      rates: parseInt(parseFloat(rawUpdate.rates, 10) * 10, 10),
      online: true,
    }
  } catch(e) {
    throw new TypeError(`Invalid update profile`);
  }
}

const intTo2bytes = (intvalue) => {
  const hexvalue = convertBase.dec2hex(intvalue);
  let result = hexvalue;
  for (let i = 0; i + hexvalue.length< 4; i++) {
    result = '0' + result;
  }
  return result;
};

const intTobytes = function (intvalue) {
  const hexvalue = convertBase.dec2hex(intvalue);
  let result = hexvalue;
  for (let i = 0; i + hexvalue.length< 2; i++) {
    result = '0' + result;
  }
  return result;
};

const toNBytes = (str, n) => {
  let buffer = '';
  for (let i = 0; i < n; i += 1) {
    buffer += str[i] ? str[i].charCodeAt(0).toString(16) : '00';
  }
  return buffer;
};

/**
 * @ignore
 */
const messengerToContract = (messenger) => {
  return `0x${toNBytes(messenger, 16)}`;
};

/**
 * @ignore
 */
const tellerToContract = (rawteller) => {
  //   const validation = validateSellPoint(rawSellPoint);
  //   if (validation.error) throw new TypeError(validation.msg);
  try {
    const lat = intTo5bytes(parseFloat(rawteller.lat) * 100000);
    const lng = intTo5bytes(parseFloat(rawteller.lng) * 100000);
    const currency = intTobytes(parseInt(rawteller.currencyId));
    const avatar = intTobytes(parseInt(rawteller.avatarId));
    const rates = intTo2bytes(parseFloat(rawteller.rates) * 10);
    const buyer = rawteller.buyer ? '01' : '00';
    const buyRates = intTo2bytes(parseFloat(rawteller.buyRates) * 10);
    const hexteller = `0x32${lat}${lng}${toNBytes(rawteller.countryId, 2)}${toNBytes(rawteller.postalCode, 16)}${avatar}${currency}${toNBytes(rawteller.messenger, 16)}${rates}${buyer}${buyRates}`;
    return hexteller;
  } catch (e) {
    throw new TypeError(`Invalid teller profile: ${e.message}`);
  }
};

const shopFromContract = (rawShop) => {
    const validation = validateShop(rawShop);
      if (validation.error) throw new TypeError(validation.msg);

    try {
      return {
        lat: rawShop.lat / 100000,
        lng: rawShop.lng / 100000,
        countryId: Ethers.utils.toUtf8String(rawShop.countryId).replace(/\0/g, ''),
        postalCode: Ethers.utils.toUtf8String(rawShop.postalCode).replace(/\0/g, ''),
        cat: Ethers.utils.toUtf8String(rawShop.cat).replace(/\0/g, ''),
        name: Ethers.utils.toUtf8String(rawShop.name).replace(/\0/g, ''),
        description: Ethers.utils.toUtf8String(rawShop.description).replace(/\0/g, ''),
        opening: Ethers.utils.toUtf8String(rawShop.opening).replace(/\0/g, ''),
      };
    } catch (e) {
        throw new TypeError(`Invalid shop profile: ${e.message}`);
    }
};

const reputFromContract = (rawReput) => {
  try {
    return {
      buyVolume: Ethers.utils.formatEther(rawReput[0], 'ether'),
      sellVolume: Ethers.utils.formatEther(rawReput[1], 'ether'),
      numTrade: rawReput[2].toNumber(),
    };
  } catch (e) {
    throw new TypeError(`Invalid reput: ${e.message}`);
  }
};

const tellerFromContract = (rawTeller) => {
    // const validation = validateShop(rawShop);
      // if (validation.error) throw new TypeError(validation.msg);
    try {
      return {
        lat: rawTeller[0] / 100000,
        lng: rawTeller[1] / 100000,
        countryId: Ethers.utils.toUtf8String(rawTeller[2]).replace(/\0/g, ''),
        postalCode: Ethers.utils.toUtf8String(rawTeller[3]).replace(/\0/g, ''),
        currencyId: rawTeller[4],
        messenger: Ethers.utils.toUtf8String(rawTeller[5]).replace(/\0/g, ''),
        avatarId: rawTeller[6],
        rates: rawTeller[7] / 10,
        balance: Ethers.utils.formatEther(rawTeller[8], 'ether'),
        online: rawTeller[9],
        buyer: rawTeller[10] ? rawTeller[10] : rawTeller[10],
        buyRates: rawTeller[11] ? rawTeller[11] / 10 : 2,
      };
    } catch (e) {
        throw new TypeError(`Invalid teller profile: ${e.message}`);
    }
};

const padLeft = (string, chars, sign) => (
  new Array(chars - string.length + 1).join(sign || '0') + string // eslint-disable-line no-mixed-operators
);

const toBytes32 = (x, prefix = false) => {
  let y = Ethers.utils.hexlify(x);
  y = y.replace('0x', '');
  y = padLeft(y, 64);
  if (prefix) y = `0x${y}`;
  return y;
};

const toBytes32Hex = x => (
  `0x${toNBytes(x, x.length)}`
);

const addressToBytes32 = (x, prefix = false) => {
  let y = x.replace('0x', '');
  y = padLeft(y, 64);
  if (prefix) y = `0x${y}`;
  return y;
};

const formatEther = val => (
  Ethers.utils.formatEther(val.toString())
);

const toBigNumber = val => (
  Ethers.utils.bigNumberify(val)
);

export default {
  toNBytes,
  updateToContract,
  reputFromContract,
  messengerToContract,
  tellerToContract,
  tellerFromContract,
  shopFromContract,
  toBytes32,
  addressToBytes32,
  formatEther,
  toBigNumber,
  toBytes32Hex,
};
