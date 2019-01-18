const DetherJS = require("../src/index");

// const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('DetherJS SELLALL kyber example');

    },
    {
      manualInitContracts: false
    }
  );

  const privateKeyMaster = "PRIV_KEY";

  const userPassword = "1234";
  const masterWallet = new DetherJS.Ethers.Wallet(privateKeyMaster);
  const encryptedWallet = await masterWallet.encrypt(userPassword);
  const masterUser = await dether.getUser(encryptedWallet);
  masterWallet.provider = dether.provider;

  const sellToken = "ETH";
  const buyToken = "DAI";
  const sellAmount = 0.001;
  const dest = "ADDRESS"; // receiver (buyer)
  const { buyAmount, buyRate } = await dether.getEstimation({
    sellToken,
    buyToken,
    sellAmount
  });
  console.log(
    `estimated we get ${buyAmount.toString()} ${buyToken} for ${sellAmount} ${sellToken}`
  );
  if (buyRate) {
    console.log(`buyRate = ${buyRate.toString()}`);
  }

  // in 2 times
  let part1 = await masterUser.sendTokenToBuyer_1(
    {
      receiver: dest,
      amount: sellAmount,
      ticker: buyToken,
      buyRate,
      gasPrice: 40000000000
    },
    userPassword
  );
  await dether.provider.waitForTransaction(part1.hash);

  let part2 = await masterUser.sendTokenToBuyer_2(
    {
      receiver: dest,
      privKey: part1.privKey,
      amount: sellAmount,
      ticker: buyToken,
      refundAddress: masterWallet.address,
      buyRate,
      gasPrice: 40000000000
    },
    userPassword
  );
  console.log("part 2", part2);
})().catch(console.error);
