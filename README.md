# DetherJS

DetherJS is Javascript SDK to easily interact with [DetherContracts](https://github.com/dethertech/detherContracts)

It provides wrappers for all the public methods of the contract and formats values in and out.

## Table of Contents

- [Install](#install)
- [Docs](#doc)
- [Usage](#usage)
- [Dev](#dev)
- [Test](#test)
- [Example](#example)
- [Build doc](#build-doc)
- [Dependencies](#dependencies)
- [Bugs](#bugs)
- [Donation](#donation)

## Install

Use NPM to get the package

```
npm install --save detherjs

yarn add detherjs
```

## Docs

Extensive documentation of all the methods can be found on the [API documentation](https://dethertech.github.io/dether.js)

## Usage

You can find more examples of method usage in [examples/usage.js](https://github.com/dethertech/dether.js/blob/master/examples/usage.js)

### Instanciate a new DetherJS instance

```javascript
import DetherJS from "dether.js";

const detherjs = new DetherJS({
  network: "ropsten",
  rpcURL: "http://localhost:8545",
  etherscanKey: "etherscan"
});
```

#### Inputs

- `network`: Network
- `rpcURL`: Provider URL
- `etherscanKey`: Etherscan key

#### Return value

New instance of DetherJS

### Get Teller

```javascript
const addr = '0xab5801a7d398351b8be11c439e05c5b3259aec9b';

try {
  cont teller = await detherjs.getTeller(addr)
} catch () {
  console.log(e);
}
```

#### Inputs

- `addr`: Ethereum address

#### Return value

```javascript
{
  lat: 1, // Latitude
  lng: 2, // Longitude
  countryId: 'FR', // Country ID
  postalCode: 75019,
  escrowBalance: 0.01, // Escrow balance
  rates: 20, // Fees
  volumeTrade: 0, // Volume of Trade
  nbTrade: 0, // Number of trade
  currencyId: 1, // Currency id (1 === 'USD')
  avatarId: 1, // Avatar ID
  messengerAddr1: 'bobychou', // Telegram username
  messengerAddr2: 'bobychou', // Telegram username
  ethAddress: '0x085b30734fD4f48369D53225b410d7D04b2d9011', // Ethereum address
}
```

### Get all tellers

```javascript
try {
  const allTellers = await detherjs.getAllTellers();
  console.log(allTellers);
} catch (e) {
  console.log(e);
}
```

#### Inputs

`getAllTellers` can receive an array of addresses

- `addrs`: Array of ethereum addresses

#### Return value

Array of tellers

### Get Tellers In Zone

```Javascript
try {
  const tellersInZone = await detherjs.getTellersInZone();
} catch (e) {
  console.log(e);
}
```

#### Inputs

`getTellersInZone` can receive an array of zones ID

- `zones`: Array of zones ID

#### Return value

Array of tellers

### Get Teller Balance

```javascript
const addr = "0xab5801a7d398351b8be11c439e05c5b3259aec9b";

try {
  const balance = await detherjs.getTellerBalance(addr);
} catch (e) {
  console.log(e);
}
```

#### Inputs

- `addr`: Ethereum address

#### Return value

Receive escrow balance of teller

### Instanciate User methods

```Javascript
const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
const userPassword = '1234';

const wallet = new DetherJS.Ethers.Wallet(privateKey);
const encryptedWallet = await wallet.encrypt(userPassword);

const User = await dether.getUser(encryptedWallet);
```

### Add Sell Point

```javascript
const password = "123456789";

const data = {
  lat: 1.12,
  lng: 2.21,
  countryId: "FR",
  postalCode: 75019,
  rates: 20.2,
  avatar: 1,
  currency: 2,
  messengerAddr1: "telegram",
  messengerAddr2: "toshi",
  amount: 0.1
};

try {
  const hash = await User.addSellPoint(data, password);
} catch (e) {
  console.log(e);
}
```

#### Inputs

- `lat`: Latitude
- `lng`: Longitude
- `countryId`: Country ID
- `postalCode`: Postal code
- `rates`: Teller Fees
- `avatar`: Avatar ID
- `currency`: Currency id (1 === 'USD')
- `messengerAddr1`: Telegram username
- `messengerAddr2`: Toshi username
- `username`: Username
- `amount`: Escrow balance
- `password`: Password to decrypt the wallet

#### Return value

Return receipt of transaction

### Get Info

```javascript
try {
  const info = User.getInfo();
} catch (e) {
  console.log(e);
}
```

#### Return value

Return teller info if you are teller

### Get Balance

```Javascript
try {
  const info = User.getBalance();
} catch (e) {
  console.log(e);
}
```

#### Return value

Return your balance if you are teller

### Send To Buyer

```Javascript
const password = '123456789';

const opts = {
  amount: 0.005,
  receiver: '0x609A999030cEf75FA04274e5Ac5b8401210910Fe',
};

try {
  const sendCoinTransaction = await User.sendToBuyer(opts, password);
} catch (e) {
  console.log(e);
}
```

#### Inputs

- `password`: Password to decrypt the wallet
- `amount`: Amount to send
- `receiver`: Receiver's ethereum address

#### Return value

Return receipt of transaction

### Delete Sell Point

```javascript
const password = "123456789";

try {
  const hash = await User.deleteSellPoint(password);
} catch (e) {
  console.log(e);
}
```

#### Inputs

- `password`: Password to decrypt the wallet

#### Return value

Return receipt of transaction

## Dev

```
git clone https://github.com/dethertech/dether.js.git
cd dether.js
yarn
```

## Test

There are two types of tests, tests that use stubs/mocks, and tests that first deploy
all contracts on a given chain and then execute using the deployed contracts instead of stubs/mocks.

### Stub/mock tests

```
yarn test
```

### Onchain tests

There are spec files ending in `.onchain.js`. These files will deploy the Dether
contracts on a given chain and run the tests inside the `.onchain.js` file.
To set this up create a copy of `test/.env.sample` and name it `.env`. Update values
accordingly.

#### Example: local with ganache-cli

1. start up ganache and copy one of the private keys generated
2. set the `test/.env` file content to

```
RPC_URL=http://localhost:8545/
DEPLOY_PRIVKEY=<private key from step 1, prefixed with 0x>
```

3. run `npm run test-onchain`

#### Example: kovan

1. copy the private key of the account (which has sufficient ETH) that you want to use to deploy on the kovan network
2. set the `.env` file content to

```
NETWORK=kovan
DEPLOY_PRIVKEY=<private key from step 1, prefixed with 0x>
```

3. now run `npm run test-onchain`

## Example

```
yarn run example
```

## Build doc

```
yarn run esdoc
yarn run publish:esdoc
```

## Dependencies

- [dethercontract](https://github.com/dethertech/dethercontracts.git)
- [ethers.js](https://github.com/ethers-io/ethers.js)
- [babel-polyfill](https://github.com/babel/babel/tree/master/packages/babel-polyfill)
- [utf8](https://github.com/mathiasbynens/utf8.js)

## Bugs

When you find issues, please report them:

- web: [https://github.com/dethertech/dether.js/issues](https://github.com/dethertech/dether.js/issues)

## Donation

- [Ethereum Foundation](https://ethereum.org/donate)
- [Etherscan](https://etherscan.io/address/0x71c7656ec7ab88b098defb751b7401b5f6d8976f)
- [MyEtherWallet](https://etherscan.io/address/0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8)
- [CoinMarketCap](https://etherscan.io/address/0x0074709077B8AE5a245E4ED161C971Dc4c3C8E2B)

## TODO

- Add more tests
