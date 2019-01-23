/* eslint-disable */

const DetherJS = require("../src/index");
const axios = require("axios");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/*
 * In this version of Dether, each teller present on the map need to have at least
 * one phone number verified.
 * As of today dether runs his own phone number verification
 * In this example you will see how to request a phone number verification from dether services,
 * and add a teller on the map. (in an open country)
 */
(async () => {
  console.log("DetherJS example");

  const network = "kovan";

  // info address
  const privateKeyMaster = "PRIV_KEY";
  const phoneNumber = "+447520010101"; // phone to verify

  // info Point of sales
  const tellerToAdd = {
    lat: "48.08993",
    lng: "11.48037",
    countryId: "DE",
    postalCode: "81475",
    avatarId: "04",
    currencyId: "2",
    messenger: "messenger",
    rates: 30,
    buyer: true,
    buyRates: 10,
    amount: 0.1
  };
  // instanciation of a dether object
  const dether = new DetherJS({
    network
  });

  //
  const userPassword = "1234";
  const userWallet = new DetherJS.Ethers.Wallet(privateKeyMaster);
  const encryptedWallet = await userWallet.encrypt(userPassword);
  const detherUser = await dether.getUser(encryptedWallet);
  userWallet.provider = dether.provider;

  /*
   * before being able to add your teller inside the contract you need to request a phone number verification
   * from a verifier delegat (Dether is currently the only delegate)
   */

  // request a dether number verification to enable adding this ETH address as a seller on the map
  // BE phone number format
  const ethAddress = userWallet.address; // eth address to verify

  const apiUrl = `https://kyc-${network}.herokuapp.com`;
  let res;
  console.log("REQUEST CODE POST");

  try {
    res = await axios.post(`${apiUrl}/sms`, {
      phoneNumber,
      ethAddress,
      type: "TELLER"
    });
    console.log("res data", res);
  } catch (e) {
    console.log("error", e.response.data);
  }

  // once you get the code on the phone, you need to POST it on the API
  const code = "4242"; // in kovan its the same code everytime
  console.log("SEND VERIF CODE");
  try {
    res = await axios.post(`${apiUrl}/sms/verif`, {
      phoneNumber,
      code,
      type: "TELLER"
    });
    console.log("res data", res);
  } catch (e) {
    console.log("error", e.response.data);
  }

  // verify that the address is certified inside the smart contract
  await delay(3000); // you may need to wait a bit before its mined

  console.log(await dether.isCertified(ethAddress));

  /*
   * Now you can add teller inside the contract, for doing so you'll need some DTH
   */

  // 1. verify how much DTH you need to add your teller inside the country you want
  const licenceAmount = await dether.getLicenceTeller(tellerToAdd.countryId); // DE for germany
  console.log(
    `You need to stake ${licenceAmount}DTH to create a point of sales`
  );
  // If you dont have yet DTH, you can easily get some in KYBER for mainnet,
  // For kovan ask in our dev channel

  // 3. Add your teller inside the smart contract
  tellerToAdd.gasPrice = 20000000000;
  const hash = await detherUser.addTeller(tellerToAdd, userPassword);
  console.log("tsx", hash);
  // In the addTeller tsx, we wrap 2 tsx, the first one is the registration of the sale point,
  // the sencond is adding funds inside the point of sales.
  // The amount specify in the teller object will be automatically added in the point of sales
  // The amount of DTH requiring for the licence price will be automatically taken from the account

  // 4. verify that your are in the contract
  await delay(3000); // you may need to wait a bit before being able to load the data from the contract
  const verifTeller = await dether.getTeller(userWallet.address);
  console.log("teller info", verifTeller);
})().catch(console.error);
