# dether.js

[API documentation](https://dethertech.github.io/dether.js)

[Examples](https://github.com/dethertech/dether.js/blob/v1.x/examples/usage.js)

# DetherJS

DetherJS is Javascript SDK to easily interact with [DetherContracts](https://github.com/dethertech/detherContracts)

It provides wrappers for all the public methods of the contract and formats values in and out.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Instanciate](##Instanciate_dether)
- [Get teller](#Get_Teller)
- [Get all teller](#Get_all_tellers)
- [Get teller in zone](#Get_Tellers_In_Zone)
- [Get Teller Balance](#Get_Teller_Balance)
- [Instanciate User](#Instanciate_User)
- [Add Sell Point](#Add_Sell_Point)
- [Add_Eth](#Add_Eth)
- [Delete Sell Point](#Delete_Sell_Point)
- [Send To Buyer](#Send_To_Buyer)
- [certify new user](#certify_new_user)
- [certify new user API CALL](#certify_new_user_API_CALL)

## Install

Use NPM to get the package

```
npm install --save detherjs
or
yarn add detherjs
```

## Usage

In detherJS you can instanciate 2 object:

1. dether object:
   For reading easily all the data present in the contract
2. dether user object: for changing state of the dether contracts

---

## Instanciate_dether

```javascript
import DetherJS from "dether.js";

const detherjs = new DetherJS({
  network: "mainnet" // can be kovan or ropsten
});
```

#### Inputs

- `network`: Network
- `rpcURL`: Provider URL
- `etherscanKey`: Etherscan key

#### Return value

New instance of DetherJS

---

### Get_Teller

```javascript
const addr = '0xab5801a7d398351b8be11c439e05c5b3259aec9b';

try {
  const teller = await detherjs.getTeller(addr)
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
  ethAddress: '0x085b30734fD4f48369D53225b410d7D04b2d9011', // Ethereum address
}
```

---

### Get_all_tellers

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

---

### Get_Tellers_In_Zone

You can specify a zone to get all the tellers presents in this zone

```Javascript
const opts = {
    countryId: 'CZ', // CZ for Czech republic
    postalCode: '170 00'
};

try {
  const tellersInZone = await detherjs.getZoneTeller(opts);
} catch (e) {
  console.log(e);
}
```

#### Inputs

`getZoneTeller` can receive an array of zones ID

- `opts`: params obj
- `opts.countryId`: ISO2 country code
- `opts.postalCode`: country postal Code

#### Return value

Array of tellers

---

### Get_Teller_Balance

```javascript
const addr = "ETH_ADDRESS";

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

---

## Instanciate_User

You need to create a user:

```Javascript
const privateKey = 'PRIV_KEY';
const userPassword = '1234';

const wallet = new DetherJS.Ethers.Wallet(privateKey);
const encryptedWallet = await wallet.encrypt(userPassword);

const User = await dether.getUser(encryptedWallet);
```

---

### Add_Sell_Point

User need to be certify first

```javascript
const password = "123456789";

const opts = {
  lat: 1.12,
  lng: 2.21,
  countryId: "CZ",
  postalCode: "170 00",
  rates: 20.2,
  avatar: 1,
  currencyId: 2,
  messenger: "telegram",
  amount: 0.1
};

try {
  const hash = await User.addTeller(opts, password);
} catch (e) {
  console.log(e);
}
```

#### Inputs

- `opts`: params object
- `opts.lat`: Latitude
- `opts.lng`: Longitude
- `opts.countryId`: Country ID
- `opts.postalCode`: Postal code
- `opts.rates`: rates a seller
- `opts.buyRates`: rates as a buyer
- `opts.rates`: true if teller is buyer
- `opts.avatar`: Avatar ID
- `opts.currencyId`: Currency id (1 === 'USD')
- `opts.messenger`: Telegram username
- `opts.amount`: Escrow balance
- `password`: Password to decrypt the wallet

#### Return value

Return receipt of transaction

---

### Add_Eth

As a seller, add Eth in your sell point

```javascript
const password = "123456789";

const opts = {
  amount: 1, // 1 ETHER
  gasPrice: 20000000000 // 20 GWEI
};

try {
  const hash = await User.addEth(opts, password);
} catch (e) {
  console.log(e);
}
```

#### Inputs

- `opts`: params object
- `opts.amount`: amount to add
- `opts.gasPrice`: gasPrice for the tsx in WEI
- `password`: Password to decrypt the wallet

#### Return value

Return receipt of transaction

---

### Send_To_Buyer

```Javascript
const password = 'Pass';

const opts = {
  amount: 0.1,
  receiver: 'ETH_ADDRESS',
};

try {
  const sendCoinTransaction = await User.sendToBuyer(opts, password);
} catch (e) {
  console.log(e);
}
```

#### Inputs

- `password`: Password to decrypt the wallet
- `opts.amount`: Amount to send
- `opts.receiver`: Receiver's ethereum address

#### Return value

Return receipt of transaction

---

### Delete_Sell_Point

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

---

### certify_new_user

the address who certify need to be delegate.
For this version only dether is delegate.

```javascript
const password = "123456789";

const opts = {
  user: "0x0", // eth address
  nonce: 1, //
  gasPrice: 20000000000 // 20 GWEI
};

try {
  const hash = await User.certifyNewUser(opts, password);
} catch (e) {
  console.log(e);
}
```

#### inputs

- `opts`: params object
- `opts.user`: ethereum address
- `opts.nonce`: tsx nonce
- `opts.gasPrice`: tsx gasPrice
- `password`: password to decrypt the wallet

#### Return value

Return receipt of transaction

---

### certify_new_user_API_CALL

For Dapp willing to certify user using the dether sms verification, you need to do an API call

TO DO

```

## TO DO

Add certify new user API
```
