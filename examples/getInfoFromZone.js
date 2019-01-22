/* eslint-disable */

const DetherJS = require("../src/index");

const web3Abi = require("web3-eth-abi");
const Web3 = require("web3");
const SignerProvider = require("ethjs-provider-signer");
const sign = require("ethjs-signer").sign;

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// The dether point are stored inside zone in the smart contract, zone are define with
// a mapping country => postalCode, so te get the tellers or shop present in your area you
// just need the country code (ISO2 format) and the postal code

(async () => {
  console.log("DetherJS example");

  // instanciation of a dether object
  const dether = new DetherJS({
    network: "mainnet"
  });

  // Get all teller present in an area (Country and postal code)
  let opts = {
    countryId: "DE", // CZ for Czech republic
    postalCode: "81475" // postal code
  };

  try {
    const tellersInZone = await dether.getZoneTeller(opts); // you get an array of address
    console.log("teller addresses in zone", tellersInZone);
    // you need to loop over the object the get all info
    asyncForEach(tellersInZone, async teller => {
      console.log("teller => ", await dether.getTeller(teller));
    });
  } catch (e) {
    console.log(e);
  }

  // get all shop present in an area (Country and postal code)
  opts = {
    countryId: "PT", // TR for turkey
    postalCode: "1050-010" // postal code
  };

  try {
    const shopInZone = await dether.getZoneShop(opts); // you get an array of address
    console.log("shop addresses in zone", shopInZone);
    // you need to loop over the object the get all info
    asyncForEach(shopInZone, async shop => {
      console.log("shop => ", await dether.getShop(shop));
    });
  } catch (e) {
    console.log(e);
  }
})().catch(console.error);
