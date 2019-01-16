/* eslint-disable */
// import DetherJS from 'detherjs';
// import DetherInterfaceJson from 'dethercontract/contracts/DetherInterface.json';
// import DetherTellerStorageJson from 'dethercontract/contracts/DetherTellerStorage.json';
// import DetherSmsJson from 'dethercontract/contracts/SmsCertifier.json';
// import Dth from 'dethercontract/contracts/DetherToken.json';

const DetherJS = require("../src/index");

const web3Abi = require("web3-eth-abi");
const Web3 = require("web3");
const SignerProvider = require("ethjs-provider-signer");
const sign = require("ethjs-signer").sign;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const add0x = input => {
  if (typeof input !== "string") {
    return input;
  } else if (input.length < 2 || input.slice(0, 2) !== "0x") {
    return `0x${input}`;
  }
  return input;
};

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

const toNBytes = (str, n) => {
  let buffer = "";
  for (let i = 0; i < n; i += 1) {
    buffer += str[i] ? str[i].charCodeAt(0).toString(16) : "00";
  }
  return buffer;
};

const mockpoint = {
  teller1: {
    lat: "48.87167",
    lng: "2.31099",
    countryId: "FR",
    postalCode: "75008",
    avatarId: "04",
    currencyId: "2",
    messenger: "mehdi_dether",
    rates: 30,
    buyer: true,
    buyRates: 10
  },
  teller2: {
    lat: "48.93691",
    lng: "2.44612",
    countryId: "FR",
    postalCode: "75009",
    avatarId: "01",
    currencyId: "2",
    messenger: "teller2",
    rates: 30,
    buyer: true,
    buyRates: 10
  },
  teller3: {
    lat: "48.88817",
    lng: "2.42741",
    countryId: "FR",
    postalCode: "75009",
    avatarId: "03",
    currencyId: "2",
    messenger: "teller3",
    rates: 30,
    buyer: true,
    buyRates: 10
  },
  teller4: {
    lat: "48.86849",
    lng: "2.30473",
    countryId: "FR",
    postalCode: "75009",
    avatarId: "02",
    currencyId: "2",
    messenger: "teller1",
    rates: 30,
    buyer: true,
    buyRates: 10
  },
  teller5: {
    lat: "48.86301",
    lng: "2.31993",
    countryId: "FR",
    postalCode: "75009",
    avatarId: "05",
    currencyId: "2",
    messenger: "teller2",
    rates: 30,
    buyer: true,
    buyRates: 10
  },
  teller6: {
    lat: "48.86747",
    lng: "2.34092",
    countryId: "FR",
    postalCode: "75009",
    avatarId: "06",
    currencyId: "2",
    messenger: "teller3",
    rates: 30,
    buyer: true,
    buyRates: 10
  },
  shop1: {
    lat: "48.86528",
    lng: "2.30423",
    countryId: "FR",
    postalCode: "75016",
    cat: "restaurant",
    name: "Au bon chaillot",
    description: "A la bonne franquette",
    opening: "qNqNqNqNqN00"
  },
  shop2: {
    lat: "48.86977",
    lng: "2.30944",
    countryId: "FR",
    postalCode: "75008",
    cat: "sport",
    name: "ADIDAS",
    description: "My cryptos, my ADIDAS!",
    opening: "qNqNqNqNqN00"
  },
  shop3: {
    lat: "48.87179",
    lng: "2.33202",
    countryId: "FR",
    postalCode: "75009",
    cat: "art",
    name: "Opera garnier",
    description: "Pay your opera in ETH",
    opening: "qNqNqNqNqN00"
  },
  shop4: {
    lat: "48.86235",
    lng: "2.34634",
    countryId: "FR",
    postalCode: "75001",
    cat: "commerce",
    name: "forum des halles",
    description: "Pay in ETH in forum des halles",
    opening: "qNqNqNqNqN00"
  },
  shop5: {
    lat: "48.86762",
    lng: "2.34995",
    countryId: "FR",
    postalCode: "75002",
    cat: "crypto",
    name: "La maison du bitcoin",
    description: "Buy or sell your crypto",
    opening: "qNqNqNqNqN00"
  },
  shop6: {
    lat: "48.83342",
    lng: "2.38751",
    countryId: "FR",
    postalCode: "75012",
    cat: "restaurant",
    name: "Five Guys",
    description: "Enjoy your burger, pay in ETH!",
    opening: "qNqNqNqNqN00"
  }
};

const convertBase = (function() {
  function convertBase(baseFrom, baseTo) {
    return function(num) {
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
})();

const getSignedWeb3 = ({ privateKey, address }) => {
  const provider = new SignerProvider("https://kovan.infura.io", {
    signTransaction: (rawTx, cb) => cb(null, sign(rawTx, privateKey)),
    accounts: cb => cb(null, address)
  });
  return new Web3(provider);
};

const intTo4bytes = function(intvalue) {
  const hexvalue = convertBase.dec2hex(intvalue);
  let result = hexvalue;
  for (let i = 0; i + hexvalue.length < 8; i++) {
    result = "0" + result;
  }
  return result;
};

const intTo5bytes = intvalue => {
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

const intTo2bytes = function(intvalue) {
  const hexvalue = convertBase.dec2hex(intvalue);
  let result = hexvalue;
  for (let i = 0; i + hexvalue.length < 4; i++) {
    result = "0" + result;
  }
  return result;
};

const intTobytes = function(intvalue) {
  const hexvalue = convertBase.dec2hex(intvalue);
  let result = hexvalue;
  for (let i = 0; i + hexvalue.length < 2; i++) {
    result = "0" + result;
  }
  return result;
};

const shopToContract = rawshop => {
  const lat = intTo5bytes(parseFloat(rawshop.lat) * 100000);
  const lng = intTo5bytes(parseFloat(rawshop.lng) * 100000);

  const hexshopGeo = `0x31${lat}${lng}`;
  const hexShopAddr = `${toNBytes(rawshop.countryId, 2)}${toNBytes(
    rawshop.postalCode,
    16
  )}`;
  const hexShopId = `${toNBytes(rawshop.cat, 16)}${toNBytes(rawshop.name, 16)}`;
  const hexShopDesc = `${toNBytes(rawshop.description, 32)}${toNBytes(
    rawshop.opening,
    16
  )}`;

  const hexShop = `${hexshopGeo}${hexShopAddr}${hexShopId}${hexShopDesc}`;
  return hexShop;
};

(async () => {
  console.log("DetherJS example");

  const dether = new DetherJS({
    network: "kovan"
  });

  // instanciate delegate
  // this user should be delegate in certifier contract to be able to ceetify new user
  const privateKeyMaster = "PRIV_KEY";

  //
  const userPassword = "1234";
  const masterWallet = new DetherJS.Ethers.Wallet(privateKeyMaster);
  const encryptedWallet = await masterWallet.encrypt(userPassword);
  const masterUser = await dether.getUser(encryptedWallet);
  masterWallet.provider = dether.provider;
  //
  const wallet1 = new DetherJS.Ethers.Wallet.createRandom();
  console.log("wallet1 => ", wallet1);
  const encryptedWallet1 = await wallet1.encrypt(userPassword);
  const user1 = await dether.getUser(encryptedWallet1);
  wallet1.provider = dether.provider;
  //
  const wallet2 = new DetherJS.Ethers.Wallet.createRandom();
  console.log("wallet2 => ", wallet2.privateKey);
  const encryptedWallet2 = await wallet2.encrypt(userPassword);
  const user2 = await dether.getUser(encryptedWallet2);
  wallet2.provider = dether.provider;

  console.log("send ETH --");

  // // send him ETH
  let tsx = await masterWallet.sendTransaction({
    to: wallet1.address,
    value: DetherJS.Ethers.utils.parseEther("1")
  });
  await dether.provider.waitForTransaction(tsx.hash);
  console.log(" send tsx", tsx);
  tsx = await masterWallet.sendTransaction({
    to: wallet2.address,
    value: DetherJS.Ethers.utils.parseEther("1")
  });
  await dether.provider.waitForTransaction(tsx.hash);

  console.log("certify --");
  // // -----> certify
  tsx = await masterUser.certifyNewUser(
    { user: wallet1.address },
    userPassword
  );
  console.log("tsx hash", tsx);
  await dether.provider.waitForTransaction(tsx);
  tsx = await masterUser.certifyNewUser(
    { user: wallet2.address },
    userPassword
  );
  await dether.provider.waitForTransaction(tsx);

  console.log("send DTH --");

  // // -----> aend him DTH
  tsx = await masterUser.sendToken(
    {
      token: "DTH",
      amount: "30",
      receiverAddress: wallet1.address,
      gasPrice: "30"
    },
    userPassword
  );
  await dether.provider.waitForTransaction(tsx);

  tsx = await masterUser.sendToken(
    {
      token: "DTH",
      amount: "30",
      receiverAddress: wallet2.address,
      gasPrice: "30"
    },
    userPassword
  );
  await dether.provider.waitForTransaction(tsx);

  console.log("teller -->");
  let sellPoint = mockpoint.teller1;
  sellPoint.amount = "0.5";
  tsx = await user1.addTeller(sellPoint, userPassword);
  await dether.provider.waitForTransaction(tsx);
  console.log("tsx add teller", tsx);

  sellPoint = mockpoint.teller2;
  sellPoint.amount = "0.5";
  tsx = await user2.addTeller(sellPoint, userPassword);

  await dether.provider.waitForTransaction(tsx);
  console.log("tsx", tsx);
})().catch(console.error);
