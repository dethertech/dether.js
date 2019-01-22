# DetherJS

DetherJS is Javascript SDK to easily interact with [DetherContracts](https://github.com/dethertech/detherContracts)

It provides wrappers for all the public methods of the contract and formats values in and out.
All infos about ETH/Tokens buyers/sellers are stored inside the smart contracts and easily accessible with this library.
You can as well easily modify as well the states of the dether smart contract.
This library interact with the current version of [DetherContracts](https://github.com/dethertech/detherContracts) deployed on:  
[Mainnet](https://etherscan.io/address/0x876617584678d5b9a6ef93eba92b408367d9457c#code)

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

Extensive documentation of the principal methods can be found on the [API documentation](https://dethertech.github.io/dether.js)

## Usage

You can find more examples of method usage in [examples/](https://github.com/dethertech/dether.js/blob/master/examples/)

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

- Add more example: with geocoding API, certify API
