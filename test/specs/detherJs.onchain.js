/* eslint-disable object-curly-newline, max-len, padded-blocks, global-require, no-multi-spaces, no-restricted-syntax, no-await-in-loop, arrow-body-style, no-new, no-empty */
/* eslint-env node, mocha */
/* global describe it beforeEach afterEach */
import 'babel-polyfill';
import path from 'path';
import crypto from 'crypto';
import Ethers from 'ethers';
import assert from 'assert';
import { expect } from 'chai';

import DetherJS from '../../src/detherJs';
import DetherUser from '../../src/detherUser';

// load NETWORK RPC_URL DEPLOY_PRIVKEY from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TEST_PASS = 'test123';
const { DEPLOY_PRIVKEY, NETWORK, RPC_URL, MKR_PRICE_FEED } = process.env;

const jsonFiles = {
  DetherCore: require('dethercontract/contracts/DetherCore.json'),
  DetherBank: require('dethercontract/contracts/DetherBank.json'),
  DetherToken: require('dethercontract/contracts/DetherToken.json'),
  KycCertifier: require('dethercontract/contracts/KycCertifier.json'),
  SmsCertifier: require('dethercontract/contracts/SmsCertifier.json'),
  // NOTE: use FAKE, otherwise we need to pass in address of deployed mkrPriceFeed contract
  ExchangeRateOracle: MKR_PRICE_FEED // TODO: for now we never pass in MKR_PRICE_FEED
    // we are testing on a network with an already existing MKR Price Feed contract
    ? require('dethercontract/contracts/ExchangeRateOracle.json')
    // we are testing on a network with no MKR Price Feed, so we are gonna use a fake contract instead
    : require('dethercontract/contracts/FakeExchangeRateOracle.json'),
};

// will contain the inited DetherJs instance
let detherJs;

// next to firing a transaction also wait for a transaction to be mined
const waitForTxMined = tsxPromise => (
  tsxPromise.then(tsx => tsx.wait())
);

const waitForTxHashMined = tsxPromise => (
  tsxPromise.then(tsxHash => detherJs.provider.waitForTransaction(tsxHash))
);

const loadUser = async (wallet) => {
  const user = await detherJs.getUser(await wallet.encrypt(TEST_PASS));
  wallet.provider = detherJs.provider;
  user.provider = detherJs.provider;
  return { user, wallet };
};

const loadAccount = async (privateKey) => {
  const wallet = new DetherJS.Ethers.Wallet(privateKey);
  return loadUser(wallet);
};

const createRandomAccount = () => {
  const wallet = DetherJS.Ethers.Wallet.createRandom();
  return loadUser(wallet);
};

const createRandomAddress = async () => {
  const { user } = await createRandomAccount();
  return user.address;
};

// NOTE: only execute these specs when there is a DEPLOY_PRIVKEY found in .env
if (!DEPLOY_PRIVKEY) {
  console.log('did not find DEPLOY_PRIVKEY in .env, did you forget to set it?\ngonna skip the detherJs.onchain.test.js file');
} else {
  assert(process.env.NETWORK || process.env.RPC_URL, 'missing NETWORK or RPC_URL in .env file');

  const providerArgs = {
    rpcURL: RPC_URL || undefined,
    network: NETWORK || undefined,
  };

  // eslint-disable-next-line prefer-template
  describe(`<<< on-chain (${providerArgs.network ? 'network=' + providerArgs.network + ' ' : ''}${providerArgs.rpcURL ? 'rpcURL=' + providerArgs.rpcURL : ''}) testing >>>`, () => {
    const accounts = {};
    const deployedContracts = {};
    const addEthToUser = async (user, amount) => {
      const nonce = await detherJs.provider.getTransactionCount(accounts.deployer.wallet.address);
      const tsx = await waitForTxMined(accounts.deployer.wallet.sendTransaction({
        to: user.address,
        value: Ethers.utils.parseEther(amount),
        nonce,
        gasLimit: 5000000,
        gasPrice: 30000000000,
      }));
      return tsx;
    };

    const addDthToUser = (user, amount) => (
      waitForTxHashMined(accounts.deployer.user.sendToken({
        token: 'DTH',
        amount,
        receiverAddress: user.address,
        gasPrice: '30',
      }, TEST_PASS))
    );

    const providerArg = {};
    if (RPC_URL) providerArg.rpcURL = RPC_URL;
    if (NETWORK) providerArg.network = NETWORK;

    let deployerBalanceBefore;
    let deployerBalanceAfterDeploy;
    let deployerBalanceAfterInit;

    before(async () => {

      detherJs = new DetherJS(
        providerArgs,
        { manualInitContracts: true },
      );

      console.log('# Accounts: loading deployer account');
      accounts.deployer = await loadAccount(DEPLOY_PRIVKEY);

      deployerBalanceBefore = await detherJs.provider.getBalance(accounts.deployer.wallet.address);

      for (const contractName of Object.keys(jsonFiles)) {
        const { bytecode, abi } = jsonFiles[contractName];
        const tsxHash = await accounts.deployer.user.dether.provider.sendTransaction(accounts.deployer.wallet.sign({
          // NOTE: if MKR_PRICE_FEED we pass in the address to the contructor of the ExchangeRateOracle contract
          data: contractName === 'ExchangeRateOracle' && MKR_PRICE_FEED
            ? Ethers.Contract.getDeployTransaction(bytecode, abi, MKR_PRICE_FEED).data
            : Ethers.Contract.getDeployTransaction(bytecode, abi).data,
          nonce: await detherJs.provider.getTransactionCount(accounts.deployer.wallet.address),
          gasLimit: 5000000,
          gasPrice: 30000000000,
        }));
        console.log(`[${contractName}] deploying ${tsxHash}`);
        await detherJs.provider.waitForTransaction(tsxHash);
        const tsx = await detherJs.provider.getTransactionReceipt(tsxHash);
        deployedContracts[contractName] = new Ethers.Contract(tsx.contractAddress, abi, accounts.deployer.wallet);
        console.log(`[${contractName}] deployed at ${deployedContracts[contractName].address}`);
      }

      deployerBalanceAfterDeploy = await detherJs.provider.getBalance(accounts.deployer.wallet.address);

      console.log('1/16  ~Accounts~ creating ceo/cfo/cmo/cso accounts');
      accounts.ceo = await createRandomAccount();
      accounts.cfo = await createRandomAccount();
      accounts.cmo = await createRandomAccount();
      accounts.cso = await createRandomAccount();

      console.log('2/16  [DetherCore] initing');
      await waitForTxMined(deployedContracts.DetherCore.initContract(deployedContracts.DetherToken.address, deployedContracts.DetherBank.address));

      console.log('3/16  [DetherCore] setting temp roles (ceo/cfo/cso/cmo)');
      await waitForTxMined(deployedContracts.DetherCore.setCEO(accounts.deployer.wallet.address));
      await waitForTxMined(deployedContracts.DetherCore.setCFO(accounts.deployer.wallet.address));
      await waitForTxMined(deployedContracts.DetherCore.setCSO(accounts.deployer.wallet.address));
      await waitForTxMined(deployedContracts.DetherCore.setCMO(accounts.deployer.wallet.address));

      console.log('4/16  [DetherCore] setting addresses (oracle/sms/kyc)');
      await waitForTxMined(deployedContracts.DetherCore.setPriceOracle(deployedContracts.ExchangeRateOracle.address));
      await waitForTxMined(deployedContracts.DetherCore.setSmsCertifier(deployedContracts.SmsCertifier.address));
      await waitForTxMined(deployedContracts.DetherCore.setKycCertifier(deployedContracts.KycCertifier.address));

      console.log('5/16  [DetherCore] setting moderators (shop/teller)');
      await waitForTxMined(deployedContracts.DetherCore.setShopModerator(accounts.ceo.wallet.address));
      await waitForTxMined(deployedContracts.DetherCore.setTellerModerator(accounts.ceo.wallet.address));

      console.log('6/16  [DetherBank] setting dth contract address + transferring ownership to DetherCore');
      await waitForTxMined(deployedContracts.DetherBank.setDth(deployedContracts.DetherToken.address));
      await waitForTxMined(deployedContracts.DetherBank.transferOwnership(deployedContracts.DetherCore.address));

      console.log('7/16  [SmsCertifier] addding deployer as delegate');
      await waitForTxMined(deployedContracts.SmsCertifier.addDelegate(accounts.deployer.wallet.address, Ethers.utils.toUtf8Bytes('smsDelegate')));

      console.log('8/16  [KycCertifier] addding deployer as delegate');
      await waitForTxMined(deployedContracts.KycCertifier.addDelegate(accounts.deployer.wallet.address, Ethers.utils.toUtf8Bytes('kycDelegate')));
      // need to certify deployer so that we can send DTH to other users
      await waitForTxMined(deployedContracts.KycCertifier.certify(accounts.deployer.wallet.address));

      console.log('9/16  [DetherCore] setting price (shop/teller, FR)');
      await waitForTxMined(deployedContracts.DetherCore.setLicenceShopPrice(Ethers.utils.toUtf8Bytes('FR'), Ethers.utils.parseEther('1')));
      await waitForTxMined(deployedContracts.DetherCore.setLicenceTellerPrice(Ethers.utils.toUtf8Bytes('FR'), Ethers.utils.parseEther('1')));

      console.log('10/16 [DetherCore] setting daily sell limits (tier1/2, FR/AU)');
      await waitForTxMined(deployedContracts.DetherCore.setSellDailyLimit(1, Ethers.utils.toUtf8Bytes('FR'), 1000));
      await waitForTxMined(deployedContracts.DetherCore.setSellDailyLimit(2, Ethers.utils.toUtf8Bytes('FR'), 5000));
      await waitForTxMined(deployedContracts.DetherCore.setSellDailyLimit(1, Ethers.utils.toUtf8Bytes('AU'), 1000));
      await waitForTxMined(deployedContracts.DetherCore.setSellDailyLimit(2, Ethers.utils.toUtf8Bytes('AU'), 5000));

      console.log('11/16 [DetherCore] opening zones Shop FR/AU');
      await waitForTxMined(deployedContracts.DetherCore.openZoneShop(Ethers.utils.toUtf8Bytes('FR')));
      await waitForTxMined(deployedContracts.DetherCore.openZoneShop(Ethers.utils.toUtf8Bytes('AU')));

      console.log('12/16 [DetherCore] opening zones Teller FR');
      await waitForTxMined(deployedContracts.DetherCore.openZoneTeller(Ethers.utils.toUtf8Bytes('FR')));

      console.log('13/16 [DetherCore] setting correct roles (ceo/cfo/cso/cmo)');
      await waitForTxMined(deployedContracts.DetherCore.setCFO(accounts.cfo.wallet.address));
      await waitForTxMined(deployedContracts.DetherCore.setCSO(accounts.cso.wallet.address));
      await waitForTxMined(deployedContracts.DetherCore.setCMO(accounts.cmo.wallet.address));
      // need to change CEO last since only CEO can update the other roles (done above)
      await waitForTxMined(deployedContracts.DetherCore.setCEO(accounts.ceo.wallet.address));

      console.log('14/16 [DetherToken] minting dth tokens into deployer wallet');
      await waitForTxMined(deployedContracts.DetherToken.mint(accounts.deployer.wallet.address, Ethers.utils.parseEther('10000000')));
      await waitForTxMined(deployedContracts.DetherToken.finishMinting());

      console.log('15/16 <DetherJS> initializing DetherJs with deployed contracts');
      detherJs.initDether({
        detherCoreAddr: deployedContracts.DetherCore.address,
        detherSmsAddr: deployedContracts.SmsCertifier.address,
        detherTokenAddr: deployedContracts.DetherToken.address,
      });

      console.log('16/16 ~Accounts~ adding eth 0.01 to users (ceo/cfo/cso/cmo)');
      await addEthToUser(accounts.ceo.user, '0.04');
      // await addEthToUser(accounts.cfo.user.address, '0.01');
      // await addEthToUser(accounts.cso.user.address, '0.01');
      // await addEthToUser(accounts.cmo.user.address, '0.01');

      deployerBalanceAfterInit = await detherJs.provider.getBalance(accounts.deployer.wallet.address);

      //
      // - deployedContracts contains for each deployed contract, an instance of Ethers.Contract
      // - accounts contains an initialized DetherUser for the following accounts: deployer, ceo, cfo, cmo, cso
      //
    });
    after(async () => {
      const deployerBalanceAfterTests = await detherJs.provider.getBalance(accounts.deployer.wallet.address);
      console.log('$$$ deployer original balance', Ethers.utils.formatEther(deployerBalanceBefore), 'ETH');
      console.log('$$$ contract deployment cost', Ethers.utils.formatEther(deployerBalanceBefore.sub(deployerBalanceAfterDeploy)), 'ETH');
      console.log('$$$ contract initialization cost', Ethers.utils.formatEther(deployerBalanceAfterDeploy.sub(deployerBalanceAfterInit)), 'ETH');
      console.log('$$$ contract deployment+initialization cost', Ethers.utils.formatEther(deployerBalanceBefore.sub(deployerBalanceAfterInit)), 'ETH');
      console.log('$$$ running tests cost', Ethers.utils.formatEther(deployerBalanceAfterInit.sub(deployerBalanceAfterTests)), 'ETH');
      console.log('$$$ total cost (deployment+initialization+tests) cost', Ethers.utils.formatEther(deployerBalanceBefore.sub(deployerBalanceAfterTests)), 'ETH');
      console.log('$$$ deployer new balance', Ethers.utils.formatEther(deployerBalanceAfterTests), 'ETH');
    });

    const teller = {
      lat: 48.93691,
      lng: 2.44612,
      countryId: 'FR',
      postalCode: '75009',
      avatarId: 1,
      currencyId: 2,
      messenger: 'teller2',
      rates: 30,
      buyer: true,
      buyRates: 2,
    };

    const createPassword = () => crypto.randomBytes(16).toString('hex');
    const createWallet = () => DetherJS.Ethers.Wallet.createRandom();
    const createEncryptedWallet = (wallet, password) => wallet.encrypt(password);
    const createUser = encryptedWallet => new DetherUser({ dether: detherJs, encryptedWallet });

    describe('detherJs.js', () => {
      describe('[INITIALIZATION]', () => {

        // --------------------------------------------------------------------/
        //
        // TEMPLATE to add tests for a new function in detherJs.js
        //
        // put the function in the correct sub-describe:
        // - [INITIALIZATION] --> constructor of DetherJs
        // - [GET CALL] --> not updating the blockchain
        // - [SET CALL] --> performs an update in the blockchain
        //
        // an instance of DetherJs is initialized in the before() which is stored
        // inside a variable (detherJs), ready to be used
        //
        // you can use the helper functions above to create necessary data
        // - createPassword
        // - createWallet
        // - createEncryptedWallet
        // - createUser
        // --------------------------------------------------------------------/
        describe('exampleFunction(arg1, arg2)', () => {
          describe('argument validation', () => {
            it('[error] missing arg1 argument', async () => {
              return true;
            });
            it('[error] invalid arg1 argument', async () => {
              return true;
            });
            it('[error] missing arg2 argument', async () => {
              return true;
            });
            it('[error] invalid arg2 argument', async () => {
              return true;
            });
          });
          describe('logic checks', () => {
            it('[error] some logic check which makes the call fail', async () => {
              return true;
            });
          });
          describe('permission checks', () => {
            it('[error] try and call the function from a user which cannot execute this function', async () => {
              return true;
            });
          });
          describe('success cases', () => {
            it('[success] successfull call of this function', async () => {
              return true;
            });
            it('[success] another (but different) successfull call of this function', async () => {
              return true;
            });
          });
        });

        describe('constructor(providerData, opts)', () => {
          describe('argument validation', () => {
            it('[error] missing provider argument', async () => {
              expect(() => new DetherJS()).to.throw();
            });
            it('[error] invalid provider argument', async () => {
              expect(() => new DetherJS({})).to.throw();
            });
          });
          describe('success cases', () => {
            it('[success] missing optional opts', async () => {
              const detherjs_ = new DetherJS(providerArg);
              expect(detherjs_).to.have.property('provider');
              expect(detherjs_).to.have.property('network').to.equal(providerArg.network);
              expect(detherjs_).to.have.property('contractInstance');
              expect(detherjs_).to.have.property('smsInstance');
              expect(detherjs_).to.have.property('dthCoreAddress').to.equal(undefined);
              expect(detherjs_).to.have.property('dthSmsAddress').to.equal(undefined);
              expect(detherjs_).to.have.property('dthTokenAddress').to.equal(undefined);
            });
            it('[success] manualInitContracts=true, should create instance and NOT init contracts', async () => {
              const detherjs_ = new DetherJS(providerArg, { manualInitContracts: true });
              expect(detherjs_).to.have.property('provider');
              expect(detherjs_).to.have.property('network').to.equal(providerArg.network);
              expect(detherjs_).to.not.have.property('contractInstance');
              expect(detherjs_).to.not.have.property('smsInstance');
              expect(detherjs_).to.not.have.property('dthCoreAddress');
              expect(detherjs_).to.not.have.property('dthSmsAddress');
              expect(detherjs_).to.not.have.property('dthTokenAddress');
            });
          });
        });
        describe('initDether(opts)', () => {
          describe('success cases', () => {
            it('[success] manualInitContracts=false | should create instances but not addresses', async () => {
              const detherjs_ = new DetherJS(providerArg, { manualInitContracts: false });
              expect(detherjs_).to.have.property('provider');
              expect(detherjs_).to.have.property('network').to.equal(providerArg.network);
              expect(detherjs_).to.have.property('contractInstance');
              expect(detherjs_).to.have.property('smsInstance');
              expect(detherjs_).to.have.property('dthCoreAddress').to.equal(undefined);
              expect(detherjs_).to.have.property('dthSmsAddress').to.equal(undefined);
              expect(detherjs_).to.have.property('dthTokenAddress').to.equal(undefined);
            });
            it('[success] manualInitContracts=true | should create instances and addresses', async () => {
              const detherjs_ = new DetherJS(providerArg, { manualInitContracts: true });
              expect(detherjs_).to.have.property('provider');
              expect(detherjs_).to.have.property('network').to.equal(providerArg.network);
              expect(detherjs_).to.not.have.property('contractInstance');
              expect(detherjs_).to.not.have.property('smsInstance');
              expect(detherjs_).to.not.have.property('dthCoreAddress');
              expect(detherjs_).to.not.have.property('dthSmsAddress');
              expect(detherjs_).to.not.have.property('dthTokenAddress');
              detherjs_.initDether({
                detherCoreAddr: deployedContracts.DetherCore.address,
                detherSmsAddr: deployedContracts.SmsCertifier.address,
                detherTokenAddr: deployedContracts.DetherToken.address,
              });
              expect(detherjs_).to.have.property('contractInstance');
              expect(detherjs_).to.have.property('smsInstance');
              expect(detherjs_).to.have.property('dthCoreAddress').to.be.a('string');
              expect(detherjs_).to.have.property('dthSmsAddress').to.be.a('string');
              expect(detherjs_).to.have.property('dthTokenAddress').to.be.a('string');
            });
          });
        });
      });
      describe('[GET CALL]', () => {
        describe('getUser(encryptedWallet)', async () => {
          describe('argument validation', () => {
            it('[error] missing encryptedWallet argument', async () => {
              try {
                await detherJs.getUser();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid encryptedWallet argument', async () => {
              try {
                await detherJs.getUser({});
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns DetherUser instance', async () => {
              const wallet = createWallet();
              const encryptedWallet = await createEncryptedWallet(wallet, createPassword());

              const user_ = await detherJs.getUser(encryptedWallet);
              expect(user_ instanceof DetherUser).to.equal(true);
              expect(user_).to.have.property('address').to.equal(wallet.address.toLowerCase());
            });
          });
        });
        describe('getTeller(address)', () => {
          describe('argument validation', () => {
            it('[error] missing address argument', async () => {
              try {
                await detherJs.getTeller();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid address argument', async () => {
              try {
                await detherJs.getTeller('not an address');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns correct teller object if teller exists', async () => {
              const password = createPassword();
              const wallet = createWallet();
              const encryptedWallet = await createEncryptedWallet(wallet, password);
              const user = createUser(encryptedWallet);

              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address, gasPrice: 17700000000  }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              const FUNDS_TO_ADD = '0.01';
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: FUNDS_TO_ADD, gasPrice: 17700000000 }), password));

              const result_ = await detherJs.getTeller(wallet.address);
              expect(result_).to.deep.include(teller);
              expect(result_).to.have.property('balance').to.equal(FUNDS_TO_ADD);
              expect(result_).to.have.property('online').to.equal(true);
              expect(result_).to.have.property('buyVolume').to.equal('0.0');
              expect(result_).to.have.property('sellVolume').to.equal('0.0');
              expect(result_).to.have.property('numTrade').to.equal(0);
              expect(result_).to.have.property('ethAddress').to.equal(wallet.address);
            });
            it('[success] returns null if teller doesn\'t exist', async () => {
              const result_ = await detherJs.getTeller(await createRandomAddress());
              expect(result_).to.equal(null);
            });
          });
        });
        describe('getShop(address)', () => {
          describe('argument validation', () => {
            it('[error] missing address argument', async () => {
              try {
                await detherJs.getShop();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid address argument', async () => {
              try {
                await detherJs.getShop('not an address');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it.skip('SHOPS NOT IMPLEMENTED YET -- [success] returns correct shop object if shop exists', async () => {
              //
            });
            it('[success] returns null if shop doesn\'t exist', async () => {
              const result_ = await detherJs.getShop(await createRandomAddress());
              expect(result_).to.equal(null);
            });
          });
        });
        describe('_filterTellerList(list)', () => {
          describe('argument validation', () => {

          });
        });
        describe('getAllTellers(addrs)', () => {
          describe('argument validation', () => {
            it('[error] missing addrs argument', async () => {
              try {
                await detherJs.getAllTeller();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid addrs argument', async () => {
              try {
                await detherJs.getAllTellers('not a list of addresses');
                await detherJs.getAllTellers([]);
                await detherJs.getAllTellers([1, 2, 3]);
                await detherJs.getAllTellers(await createRandomAddress());
                await detherJs.getAllTellers(await createRandomAddress(), await createRandomAddress());
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns array of nulls if tellers don\'t exist', async () => {
              const result_ = await detherJs.getAllTellers([await createRandomAddress(), await createRandomAddress()]);
              expect(result_).to.deep.equal([null, null]);
            });
            it('[success] returns array of with tellers if tellers exist', async () => {
              const password = createPassword();
              const wallet = createWallet();
              const encryptedWallet = await createEncryptedWallet(wallet, password);
              const user = createUser(encryptedWallet);

              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              const FUNDS_TO_ADD = '0.01';
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: FUNDS_TO_ADD }), password));

              const result_ = await detherJs.getAllTellers([wallet.address]);
              expect(result_).to.be.an('array').to.have.lengthOf(1);
              expect(result_[0]).to.deep.include(teller);
              expect(result_[0]).to.have.property('balance').to.equal(FUNDS_TO_ADD);
              expect(result_[0]).to.have.property('online').to.equal(true);
              expect(result_[0]).to.have.property('buyVolume').to.equal('0.0');
              expect(result_[0]).to.have.property('sellVolume').to.equal('0.0');
              expect(result_[0]).to.have.property('numTrade').to.equal(0);
              expect(result_[0]).to.have.property('ethAddress').to.equal(wallet.address);
            });
          });
        });
        describe('getTellerBalance(address)', () => {
          describe('argument validation', () => {
            it('[error] missing address argument', async () => {
              try {
                await detherJs.getTellerBalance();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid address argument', async () => {
              try {
                await detherJs.getTellerBalance('not an address');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns current funds added to contract of teller', async () => {
              const password = createPassword();
              const wallet = createWallet();
              const encryptedWallet = await createEncryptedWallet(wallet, password);
              const user = createUser(encryptedWallet);

              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              const FUNDS_TO_ADD = 0.01;
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: FUNDS_TO_ADD }), password));

              const result_ = await detherJs.getTellerBalance(wallet.address);
              expect(result_).to.equal(FUNDS_TO_ADD);
            });
            it('[success] returns 0.0 if address is not a teller', async () => {
              const result_ = await detherJs.getTellerBalance(await createRandomAddress());
              expect(result_).to.equal(0);
            });
          });
        });
        describe('getAllBalance(address, ticker)', () => {
          describe('argument validation', () => {
            it('[error] missing address argument', async () => {
              try {
                await detherJs.getAllBalance(undefined, ['ETH']);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing ticker argument', async () => {
              const wallet = createWallet();

              try {
                await detherJs.getAllBalance(wallet.address);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid address argument', async () => {
              try {
                await detherJs.getAllBalance('not an address', ['ETH']);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('invalid ticker argument', async () => {
              const wallet = createWallet();

              // TODO NOTE: not validated, it's used like this --> Formatters.toNBytes(opts.countryId,2)
              try {
                await detherJs.getAllBalance(wallet.address, 123);
                await detherJs.getAllBalance(wallet.address, [123]);
                await detherJs.getAllBalance(wallet.address, 'ETH');
                await detherJs.getAllBalance(wallet.address, 'BTC');
                await detherJs.getAllBalance(wallet.address, ['BTC']);
                await detherJs.getAllBalance(wallet.address, ['ETH', 'BTC']);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns balances of address', async () => {
              const password = createPassword();
              const wallet = createWallet();
              const encryptedWallet = await createEncryptedWallet(wallet, password);
              const user = createUser(encryptedWallet);

              await addDthToUser(user, '10');
              const result_ = await detherJs.getAllBalance(wallet.address, ['ETH', 'DTH']);
              expect(result_).to.have.property('ETH').to.equal('0.0');
              expect(result_).to.have.property('DTH').to.equal('10.0');
            });
          });
        });
        describe('getTellerReputation(addr)', () => {
          describe('argument validation', () => {
            it('[error] missing address argument', async () => {
              try {
                await detherJs.getTellerReputation();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid address argument', async () => {
              try {
                await detherJs.getTellerReputation('not an address');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns reputation of teller', async () => {
              const password = createPassword();
              const wallet = createWallet();
              const encryptedWallet = await createEncryptedWallet(wallet, password);
              const user = createUser(encryptedWallet);

              const password2 = createPassword();
              const wallet2 = createWallet();
              const encryptedWallet2 = await createEncryptedWallet(wallet2, password2);
              const user2 = createUser(encryptedWallet2);

              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user2.address }, TEST_PASS));
              await addEthToUser(user, '0.06');
              await addEthToUser(user2, '0.06');
              await addDthToUser(user, '10');
              await addDthToUser(user2, '10');
              const FUNDS_TO_ADD = 0.01;
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: FUNDS_TO_ADD }), password));
              await waitForTxHashMined(user2.addTeller(Object.assign({}, teller, { amount: FUNDS_TO_ADD }), password2));
              await waitForTxHashMined(user.sendToBuyer({ receiver: wallet2.address, amount: FUNDS_TO_ADD, gasPrice: 17700000000 }, password));

              const result_ = await detherJs.getTellerReputation(wallet.address);
              expect(result_).to.have.property('sellVolume').to.equal(FUNDS_TO_ADD.toString());
              expect(result_).to.have.property('buyVolume').to.equal('0.0');
              expect(result_).to.have.property('numTrade').to.equal(1);
            });
            it('[success] returns all zeroes if not a teller', async () => {
              const result_ = await detherJs.getTellerReputation(await createRandomAddress());
              expect(result_).to.have.property('sellVolume').to.equal('0.0');
              expect(result_).to.have.property('buyVolume').to.equal('0.0');
              expect(result_).to.have.property('numTrade').to.equal(0);
            });
          });
        });
        describe('getAllShops(addrs)', () => {
          describe('argument validation', () => {
            it('[error] missing addrs argument', async () => {
              try {
                await detherJs.getAllShop();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid addrs argument', async () => {
              try {
                await detherJs.getAllShops('not a list of addresses');
                await detherJs.getAllShops([]);
                await detherJs.getAllShops([1, 2, 3]);
                await detherJs.getAllShops(await createRandomAddress());
                await detherJs.getAllShops(await createRandomAddress(), await createRandomAddress());
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns array of nulls if shops don\'t exist', async () => {
              const result_ = await detherJs.getAllShops([await createRandomAddress(), await createRandomAddress()]);
              expect(result_).to.deep.equal([null, null]);
            });
            it.skip('SHOPS NOT IMPLEMENTED YET -- [success] returns array of shops if shops exist', async () => {
              //
            });
          });
        });
        describe('getLicenceShop(country)', () => {
          describe('argument validation', () => {
            it('[error] missing country argument', async () => {
              try {
                await detherJs.getLicenceShop();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it.skip('TODO VALIDATION -- [error] invalid country argument', async () => {
              try {
                await detherJs.getLicenceShop('not a country code');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns license price for shops in zone FR', async () => {
              const result_ = await detherJs.getLicenceShop('FR');
              expect(result_).to.equal('1.0');
            });
            it('[success] returns 0.0 for unregistered shop zone', async () => {
              const result_ = await detherJs.getLicenceShop('NL');
              expect(result_).to.equal('0.0');
            });
          });
        });
        describe('getLicenceTeller(country)', () => {
          describe('argument validation', () => {
            it('[error] missing country argument', async () => {
              try {
                await detherJs.getLicenceTeller();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it.skip('TODO VALIDATION -- [error] invalid country argument', async () => {
              try {
                await detherJs.getLicenceTeller('not a country code');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns license price for tellers in zone FR', async () => {
              const result_ = await detherJs.getLicenceTeller('FR');
              expect(result_).to.equal('1.0');
            });
            it('[success] returns 0.0 for unregistered teller zone', async () => {
              const result_ = await detherJs.getLicenceTeller('NL');
              expect(result_).to.equal('0.0');
            });
          });
        });
        describe('isZoneShopOpen(country)', () => {
          describe('argument validation', () => {
            it('[error] missing country argument', async () => {
              try {
                await detherJs.isZoneShopOpen();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns true if zone open for shops', async () => {
              const result_ = await detherJs.isZoneShopOpen('FR');
              expect(result_).to.equal(true);
            });
            it('[success] returns false if zone not open for shops', async () => {
              const result_ = await detherJs.isZoneShopOpen('NL');
              expect(result_).to.equal(false);
            });
          });
        });
        describe('isZoneTellerOpen(country)', () => {
          describe('argument validation', () => {
            it('[error] missing country argument', async () => {
              try {
                await detherJs.isZoneTellerOpen();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns true if zone open for tellers', async () => {
              const result_ = await detherJs.isZoneTellerOpen('FR');
              expect(result_).to.equal(true);
            });
            it('[success] returns false if zone not open for tellers', async () => {
              const result_ = await detherJs.isZoneTellerOpen('NL');
              expect(result_).to.equal(false);
            });
          });
        });
        describe('getZoneShop(opts)', () => {
          describe('argument validation', () => {
            it('[error] missing opts argument', async () => {
              try {
                await detherJs.getZoneShop();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts argument', async () => {
              try {
                await detherJs.getZoneShop('not an object');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.countryId argument', async () => {
              try {
                await detherJs.getZoneShop({
                  postalCode: teller.postalCode,
                });
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it.skip('TODO VALIDATION -- [error] invalid opts.countryId argument', async () => {
              // TODO NOTE: not validated, it's used like this --> Formatters.toNBytes(opts.countryId,2)
              try {
                await detherJs.getZoneShop({
                  countryId: 12345,
                  postalCode: teller.postalCode,
                });
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.postalCode argument', async () => {
              try {
                await detherJs.getZoneShop({
                  countryId: teller.countryId,
                });
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it.skip('TODO VALIDATION -- [error] invalid opts.postalCode argument', async () => {
              // TODO NOTE: not validated, it's used like this --> Formatters.toNBytes(opts.postalCode,2)
              try {
                await detherJs.getZoneShop({
                  countryId: teller.countryId,
                  postalCode: 'not a postal code',
                });
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns empty array when there are no shops in zone', async () => {
              const result_ = await detherJs.getZoneShop({
                countryId: teller.countryId,
                postalCode: teller.postalCode,
              });
              expect(result_).to.deep.equal([]);
            });
            it.skip('SHOP NOT IMPLEMENTED YET -- [success] returns list of Shop when there are shops in zone', async () => {
              //
            });
          });
        });
        describe('getZoneTeller(opts)', () => {
          describe('argument validation', () => {
            it('[error] missing opts argument', async () => {
              try {
                await detherJs.getZoneTeller();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts argument', async () => {
              try {
                await detherJs.getZoneTeller('not an object');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.countryId argument', async () => {
              try {
                await detherJs.getZoneTeller({
                  postalCode: teller.postalCode,
                });
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it.skip('TODO VALIDATION -- [error] invalid opts.countryId argument', async () => {
              // TODO NOTE: not validated, it's used like this --> Formatters.toNBytes(opts.countryId,2)
              try {
                await detherJs.getZoneTeller({
                  countryId: 12345,
                  postalCode: teller.postalCode,
                });
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.postalCode argument', async () => {
              try {
                await detherJs.getZoneTeller({
                  countryId: teller.countryId,
                });
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it.skip('TODO VALIDATION -- [error] invalid opts.postalCode argument', async () => {
              // TODO NOTE: not validated, it's used like this --> Formatters.toNBytes(opts.postalCode,2)
              try {
                await detherJs.getZoneTeller({
                  countryId: teller.countryId,
                  postalCode: 'not a postal code',
                });
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] returns empty array when there are no tellers in zone', async () => {
              const result_ = await detherJs.getZoneTeller({
                countryId: 'NL',
                postalCode: teller.postalCode,
              });
              expect(result_).to.deep.equal([]);
            });
            it('[success] returns results when there are tellers in zone', async () => {
              const password = createPassword();
              const wallet = createWallet();
              const encryptedWallet = await createEncryptedWallet(wallet, password);
              const user = createUser(encryptedWallet);

              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: 0.01 }), password));

              const result_ = await detherJs.getZoneTeller({
                countryId: teller.countryId,
                postalCode: teller.postalCode,
              });

              expect(result_).to.be.an('array');
              expect(result_[result_.length - 1]).to.equal(wallet.address);
            });
          });
        });
        describe('getTransactionStatus(hash)', () => {
          describe('argument validation', () => {
            it('[error] missing hash argument', async () => {
              const result_ = await detherJs.getTransactionStatus();
              expect(result_).to.have.property('status').to.equal('unknow');
            });
            it('[error] invalid hash argument', async () => {
                const result_ = await detherJs.getTransactionStatus('not a hash');
                expect(result_).to.have.property('status').to.equal('unknow');
            });
            it('[error] invalid \'correct\' hash argument', async () => {
              const invalidAddress = [...Array(64)].map(_ => 'a').join(''); // eslint-disable-line
              const result_ = await detherJs.getTransactionStatus(`0x${invalidAddress}`);
              expect(result_).to.have.property('status').to.equal('unknow');
            });
          });
          describe('success cases', () => {
            it('[success] returns correct status', async () => {
              const password = createPassword();
              const wallet = createWallet();
              const encryptedWallet = await createEncryptedWallet(wallet, password);
              const user = createUser(encryptedWallet);

              // do something which creates a transaction in the blockchain
              const tsxHash = await accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS);
              await detherJs.provider.waitForTransaction(tsxHash);
              const result_ = await detherJs.getTransactionStatus(tsxHash);
              expect(result_).to.have.property('status').to.equal('success');
            });
          });
        });
        describe('isCertified(address)', () => {
          describe('argument validation', () => {
            it('[error] missing address argument', async () => {
              try {
                await detherJs.isCertified();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid address argument', async () => {
              try {
                await detherJs.isCertified('not an address');
              } catch (err) {
                expect(err.message).to.equal('Invalid ETH address');
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] address is not certified', async () => {
              const password = createPassword();
              const wallet = createWallet();
              const encryptedWallet = await createEncryptedWallet(wallet, password);
              const user = createUser(encryptedWallet);

              const result_ = await detherJs.isCertified(user.address);
              expect(result_).to.equal(false);
            });
            it('[success] address is certified', async () => {
              const password = createPassword();
              const wallet = createWallet();
              const encryptedWallet = await createEncryptedWallet(wallet, password);
              const user = createUser(encryptedWallet);

              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              const result_ = await detherJs.isCertified(user.address);
              expect(result_).to.equal(true);
            });
          });
        });
        // only works on kovan/mainnet since the needed mkr dai contracts have been deployed there
        // (['kovan', 'mainnet'].includes(process.env.NETWORK) ? describe : describe.skip)('ONLY ON KOVAN/MAINNET -- getEstimation(opts)', () => {
        //   let validSellTokens;
        //   let validBuyTokens;
        //   let validSellAmount;
        //
        //   before(() => {
        //     validSellTokens = validBuyTokens = ['DAI', 'ETH']; // eslint-disable-line no-multi-assign
        //     validSellAmount = parseFloat('1.0');
        //   });
        //
        //   describe('argument validation', () => {
        //     it('[error] missing options argument', async () => {
        //       try {
        //         // first invalid attempt
        //         await detherJs.getEstimation();
        //
        //         // second invalid attempt
        //         await detherJs.getEstimation({});
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] missing options.sellToken argument', async () => {
        //       try {
        //         await detherJs.getEstimation({
        //           // sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //         });
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] missing options.buyToken argument', async () => {
        //       try {
        //         await detherJs.getEstimation({
        //           sellToken: validSellTokens[0],
        //           // buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //         });
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] missing options.sellAmount argument', async () => {
        //       try {
        //         await detherJs.getEstimation({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           // sellAmount: validSellAmount,
        //         });
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.sellToken argument', async () => {
        //       try {
        //         await detherJs.getEstimation({
        //           sellToken: 'ABRA',
        //           buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //         });
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.buyToken argument', async () => {
        //       try {
        //         await detherJs.getEstimation({
        //           sellToken: validSellTokens[0],
        //           buyToken: 'KADABRA',
        //           sellAmount: validSellAmount,
        //         });
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.sellAmount argument -- string', async () => {
        //       try {
        //         await detherJs.getEstimation({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: 'a string',
        //         });
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.sellAmount argument -- zero', async () => {
        //       try {
        //         await detherJs.getEstimation({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: 0,
        //         });
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.sellToken + options.buyToken argument', async () => {
        //       try {
        //         await detherJs.getEstimation({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[0],
        //           sellAmount: validSellAmount,
        //         });
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //   });
        //   describe('success cases', () => {
        //     it('[success] returns an estimation of ETH we get for DAI', async () => {
        //       const estimation = await detherJs.getEstimation({
        //         sellToken: validSellTokens[1],
        //         buyToken: validBuyTokens[0],
        //         sellAmount: validSellAmount,
        //       });
        //       console.log(`estimated we get ${estimation == null ? 0 : estimation} ${validBuyTokens[0]} for ${validSellAmount} ${validBuyTokens[1]}`);
        //       // if there is an estimation we get a number, if the estimation is zero,
        //       // we get returned: null
        //       expect(typeof estimation === 'number' || estimation === null).to.equal(true);
        //     });
        //
        //     it('[success] returns an estimation of DAI we get for ETH', async () => {
        //       const estimation = await detherJs.getEstimation({
        //         sellToken: validSellTokens[0],
        //         buyToken: validBuyTokens[1],
        //         sellAmount: validSellAmount,
        //       });
        //       console.log(`estimated we get ${estimation == null ? 0 : estimation} ${validBuyTokens[1]} for ${validSellAmount} ${validBuyTokens[0]}`);
        //       // if there is an estimation we get a number, if the estimation is zero,
        //       // we get returned: null
        //       expect(typeof estimation === 'number' || estimation === null).to.equal(true);
        //     });
        //   });
        // });
      });
    });

    describe('detherUser.js', () => {
      let password;
      let wallet;
      let encryptedWallet;
      let user;
      beforeEach(async () => {
        password = createPassword();
        wallet = createWallet();
        encryptedWallet = await createEncryptedWallet(wallet, password);
        user = createUser(encryptedWallet);
      });
      describe('[INITIALIZATION]', () => {

        // --------------------------------------------------------------------/
        //
        // TEMPLATE to add tests for a new function in detherUser.js
        //
        // put the function in the correct sub-describe:
        // - [INITIALIZATION] --> constructor of DetherUser
        // - [GET CALL] --> not updating the blockchain
        // - [SET CALL] --> performs an update in the blockchain
        //
        // an instance of DetherJs is initialized in the before() of this file
        // which is stored inside a variable (detherJs), ready to be used
        //
        // in the beforeEach() of the detherUser.js tests we create a
        // - password
        // - wallet
        // - encryptedWallet
        // - user
        // which you can use in the specs (so you don't have to re-create this
        // yourself inside every test)
        // --------------------------------------------------------------------/
        describe('exampleFunction(arg1, arg2)', () => {
          describe('argument validation', () => {
            it('[error] missing arg1 argument', async () => {
              return true;
            });
            it('[error] invalid arg1 argument', async () => {
              return true;
            });
            it('[error] missing arg2 argument', async () => {
              return true;
            });
            it('[error] invalid arg2 argument', async () => {
              return true;
            });
          });
          describe('logic checks', () => {
            it('[error] some logic check which makes the call fail', async () => {
              return true;
            });
          });
          describe('permission checks', () => {
            it('[error] try and call the function from a user which cannot execute this function', async () => {
              return true;
            });
          });
          describe('success cases', () => {
            it('[success] successfull call of this function', async () => {
              return true;
            });
            it('[success] another (but different) successfull call of this function', async () => {
              return true;
            });
          });
        });

        describe('constructor(opts)', () => {
          describe('argument validation', () => {
            it('[error] missing options argument', () => {
              expect(() => new DetherUser()).to.throw();
            });
            it('[error] missing options.dether argument', async () => {
              expect(() => new DetherUser({ encryptedWallet })).to.throw();
            });
            it('[error] missing options.encryptedWallet argument', () => {
              expect(() => new DetherUser({ dether: detherJs })).to.throw();
            });
          });
          describe('success cases', () => {
            it('[success] created instance should have expected properties', async () => {
              const user_ = new DetherUser({ dether: detherJs, encryptedWallet });
              expect(user_).to.have.property('encryptedWallet');
              expect(user_).to.have.property('dether');
              expect(user_).to.have.property('address');
              expect(user_.address).to.equal(wallet.address.toLowerCase());
            });
          });
        });
      });
      describe('[GET CALL]', () => {
        describe('async _getWallet(password)', () => {
          describe('argument validation', () => {
            it('[error] missing password argument', async () => {
              try {
                await user._getWallet();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] incorrect password', async () => {
              try {
                await user._getWallet('not the correct password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] should return a wallet instance', async () => {
              const wallet_ = await user._getWallet(password);
              expect(wallet_.address).to.be.a('string');
              expect(wallet_.address.toLowerCase()).to.equal(user.address);
              expect(wallet_.address).to.equal(wallet.address);
            });
          });
        });
        describe('async getAddress()', () => {
          describe('success cases', () => {
            it('[success] should return address of the user', async () => {
              const address_ = await user.getAddress();
              expect(address_).to.be.a('string');
              expect(address_).to.equal(user.address);
              expect(address_).to.equal(wallet.address.toLowerCase());
            });
          });
        });

        describe('async getInfo()', () => {
          describe('success cases', () => {
            it('[success] should return null if user is not a teller (=did not register as teller)', async () => {
              const teller_ = await user.getInfo();
              expect(teller_).to.equal(null);
            });
            it('[success] should return teller if user registered as teller', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: 0.01 }), password));

              // now get the teller of this user
              const info_ = await user.getInfo();
              expect(info_).to.deep.include(teller);
              expect(info_).to.have.property('online').to.equal(true);
              expect(info_).to.have.property('buyVolume').to.equal('0.0');
              expect(info_).to.have.property('sellVolume').to.equal('0.0');
              expect(info_).to.have.property('numTrade').to.equal(0);
              expect(info_).to.have.property('balance').to.equal('0.01');
              expect(info_).to.have.property('ethAddress').to.equal(wallet.address.toLowerCase());
            });
          });
        });
        describe('async getBalance()', () => {
          describe('success cases', () => {
            it('[success] should return balance of this user', async () => {
              await addEthToUser(user, '0.5');

              const balance = await user.getBalance();

              expect(balance.eq(Ethers.utils.parseEther('0.5'))).to.equal(true);
            });
          });
        });
      });
      describe('[SET CALL]', () => {
        describe('addTeller(sellPoint, password)', () => {
          describe('argument validation', () => {
            it('[error] missing sellPoint argument', async () => {
              try {
                await user.addTeller(undefined, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing password argument', async () => {
              try {
                await user.addTeller(teller);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid sellPoint argument', async () => {
              try {
                await user.addTeller({}, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid password argument', async () => {
              try {
                await user.addTeller({}, 'not my password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] should add teller to DetherCore contract', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: 0.01 }), password));
              const teller_ = await detherJs.getTeller(wallet.address);
              expect(teller_).to.deep.include(teller);
              expect(teller_).to.have.property('online').to.equal(true);
              expect(teller_).to.have.property('buyVolume').to.equal('0.0');
              expect(teller_).to.have.property('sellVolume').to.equal('0.0');
              expect(teller_).to.have.property('numTrade').to.equal(0);
              expect(teller_).to.have.property('balance').to.equal('0.01');
              expect(teller_).to.have.property('ethAddress').to.be.a('string');
              expect(teller_.ethAddress.toLowerCase()).to.equal(wallet.address.toLowerCase());
            });
          });
        });
        describe('addEth(opts, password)', () => {
          describe('argument validation', () => {
            it('[error] missing opts argument', async () => {
              try {
                await user.addEth(undefined, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing password argument', async () => {
              try {
                await user.addEth(teller);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts argument', async () => {
              try {
                await user.addEth('not an object', password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.amount argument', async () => {
              try {
                await user.addEth({}, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts.amount argument', async () => {
              try {
                await user.addEth({ amount: 'not a number' }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid password argument', async () => {
              try {
                await user.addEth({ amount: '0.1' }, 'not my password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] should add eth to user teller sellpoint', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: 0.01 }), password));
              await waitForTxHashMined(user.addEth({ amount: '0.1', gasPrice: 17700000000 }, password));
            });
          });
        });
        describe('updateTeller(opts, password)', () => {
          describe('argument validation', () => {
            it('[error] missing opts argument', async () => {
              try {
                await user.updateTeller(undefined, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing password argument', async () => {
              try {
                await user.updateTeller(teller);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts argument', async () => {
              try {
                await user.updateTeller({}, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid password argument', async () => {
              try {
                await user.updateTeller({}, 'not my password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] should update teller', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: 0.01 }), password));
              // await user.updateTeller({}, password);
            });
          });
        });
        describe('sendToBuyer(opts, password)', () => {
          describe('argument validation', () => {
            let optReceiverAddr;
            let optAmount;
            beforeEach(async () => {
              optReceiverAddr = await createRandomAddress();
              optAmount = 0.1;
            });
            it('[error] missing opts argument', async () => {
              try {
                await user.sendToBuyer(undefined, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing password argument', async () => {
              try {
                await user.sendToBuyer(teller);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts argument', async () => {
              try {
                await user.sendToBuyer('not an object', password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.receiver + opts.amount argument', async () => {
              try {
                await user.sendToBuyer({}, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.receiver argument', async () => {
              try {
                await user.sendToBuyer({
                  amount: optAmount,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.amount argument', async () => {
              try {
                await user.sendToBuyer({
                  receiver: optReceiverAddr,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts.receiver argument', async () => {
              try {
                await user.sendToBuyer({
                  amount: optAmount,
                  receiver: 12345,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts.amount argument', async () => {
              try {
                await user.sendToBuyer({
                  amount: 'not an amount',
                  receiver: optReceiverAddr,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid password argument', async () => {
              try {
                await user.sendToBuyer({}, 'not my password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('logic checks', () => {
            it('[error] amount to send is more than in escrow', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: '0.1' }), password));
              // await waitForTxHashMined(user.addEth({ amount: '0.1' }, password));

              try {
                await user.sendToBuyer({
                  receiver: await createRandomAddress(),
                  amount: '1.0', // more than was put in escrow
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] amount to send is exact amount that was put in escrow', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.1');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: '0.05' }), password));

              await waitForTxHashMined(user.sendToBuyer({
                receiver: await createRandomAddress(),
                amount: '0.05',
              }, password));
            });
            it('[success] amount to send is less than amount that was put in escrow', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.1');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: '0.05' }), password));

              await waitForTxHashMined(user.sendToBuyer({
                receiver: await createRandomAddress(),
                amount: '0.01',
              }, password));
            });
            it('[success] can send multiple times amount until total put in escrow is reached', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.1');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: '0.05' }), password));

              await waitForTxHashMined(user.sendToBuyer({
                receiver: await createRandomAddress(),
                amount: '0.025',
              }, password));

              await waitForTxHashMined(user.sendToBuyer({
                receiver: await createRandomAddress(),
                amount: '0.025',
              }, password));
            });
          });
        });
        describe('deleteSellPoint(password)', () => {
          describe('argument validation', () => {
            it('[error] missing password argument', async () => {
              try {
                await user.deleteSellPoint({ gasPrice: 17700000000 });
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid password argument', async () => {
              try {
                await user.deleteSellPoint({ gasPrice: 17700000000 }, 'not my password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('logic checks', () => {
            it('[error] cannot delete sell point if user already deleted his sellpoint', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: 0.1 }), password));
              // NOTE: refactor deleteSellPoint to also return a hash of the sent (!mined) tsx
              await user.deleteSellPoint({ gasPrice: 17700000000 }, password);
              try {
                await user.deleteSellPoint({ gasPrice: 17700000000 }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] can delete sell point if user is teller', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: '0.1' }), password));

              await user.deleteSellPoint({ gasPrice: 17700000000 }, password);
            });
          });
        });
        describe('deleteSellPointModerator(opts, password)', () => {
          describe('argument validation', () => {
            it('[error] missing opts argument', async () => {
              try {
                await user.deleteSellPointModerator(undefined, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing password argument', async () => {
              try {
                await user.deleteSellPointModerator(teller);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts argument', async () => {
              try {
                await user.deleteSellPointModerator('not an object', password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.toDelete argument', async () => {
              try {
                await user.deleteSellPointModerator({}, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts.toDelete argument', async () => {
              try {
                await user.deleteSellPointModerator({
                  toDelete: 12345,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid password argument', async () => {
              try {
                await user.deleteSellPointModerator({}, 'not my password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('permission checks', () => {
            it('[error] non-moderator user cannot call this function', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: 0.01 }), password));

              // only ceo is set as moderator
              try {
                await accounts.cso.user.deleteSellPointModerator({
                  toDelete: user.address,
                }, TEST_PASS);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] moderator can exec this function', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({ user: user.address }, TEST_PASS));
              await addEthToUser(user, '0.5');
              await addDthToUser(user, '10');
              await waitForTxHashMined(user.addTeller(Object.assign({}, teller, { amount: 0.01 }), password));

              // ceo is set as teller moderator in upper before()
              await accounts.ceo.user.deleteSellPointModerator({
                toDelete: user.address,
                gasPrice: 17700000000,
              }, TEST_PASS);
            });
          });
        });
        describe('turnOfflineSellPoint(password)', () => {
          describe('argument validation', () => {
            it('[error] missing password argument', async () => {
              try {
                await user.turnOfflineSellPoint();
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid password argument', async () => {
              try {
                await user.turnOfflineSellPoint('not my password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          // TODO: this method is not in contract?!
        });
        describe('sendToken(opts, password)', () => {
          describe('argument validation', () => {
            let optReceiverAddr;
            let optAmount;
            let optToken;
            beforeEach(async () => {
              optReceiverAddr = await createRandomAddress();
              optAmount = 0.1;
              optToken = 'ETH';
            });
            it('[error] missing opts argument', async () => {
              try {
                await user.sendToken(undefined, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.receiverAddress argument', async () => {
              try {
                await user.sendToken({
                  // token: optToken,
                  amount: optAmount,
                  receiverAddress: optReceiverAddr,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.amount argument', async () => {
              try {
                await user.sendToken({
                  token: optToken,
                  // amount: optAmount,
                  receiverAddress: optReceiverAddr,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.receiverAddress argument', async () => {
              try {
                await user.sendToken({
                  token: optToken,
                  amount: optAmount,
                  // receiverAddress: optReceiverAddr,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing password argument', async () => {
              try {
                await user.sendToken(teller);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts argument', async () => {
              try {
                await user.sendToken('not an object', password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid password argument', async () => {
              try {
                await user.sendToken({}, 'not my password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('ETH', () => {
            it('[success]', async () => {
              const receiverAddress = await createRandomAddress();
              await addEthToUser(user, '0.2');

              const userBalanceBefore = await detherJs.provider.getBalance(user.address);
              const receiverBalanceBefore = await detherJs.provider.getBalance(receiverAddress);

              await waitForTxHashMined(user.sendToken({
                token: 'ETH',
                amount: '0.1',
                receiverAddress,
              }, password));

              const userBalanceAfter = await detherJs.provider.getBalance(user.address);
              const receiverBalanceAfter = await detherJs.provider.getBalance(receiverAddress);

              expect(userBalanceAfter.lt(userBalanceBefore)).to.equal(true);
              expect(receiverBalanceAfter.gt(receiverBalanceBefore)).to.equal(true);
              expect(Ethers.utils.formatEther(receiverBalanceAfter)).to.equal('0.1');
            });
          });
          describe('DTH', () => {
            it('[success]', async () => {
              const receiverAddress = await createRandomAddress();
              await addEthToUser(user, '0.03');
              await addDthToUser(user, '1');

              const userBalanceBefore = await detherJs.getAllBalance(user.address, ['DTH']);
              const receiverBalanceBefore = await detherJs.getAllBalance(receiverAddress, ['DTH']);

              await waitForTxHashMined(user.sendToken({
                token: 'DTH',
                amount: '1',
                receiverAddress,
              }, password));

              const userBalanceAfter = await detherJs.getAllBalance(user.address, ['DTH']);
              const receiverBalanceAfter = await detherJs.getAllBalance(receiverAddress, ['DTH']);

              expect(parseFloat(userBalanceBefore.ETH) > parseFloat(userBalanceAfter.ETH)).to.equal(true);

              expect(receiverBalanceBefore.ETH).to.equal('0.0');
              expect(receiverBalanceAfter.ETH).to.equal('0.0');

              expect(userBalanceBefore.DTH).to.equal('1.0');
              expect(receiverBalanceBefore.DTH).to.equal('0.0');

              expect(userBalanceAfter.DTH).to.equal('0.0');
              expect(receiverBalanceAfter.DTH).to.equal('1.0');
            });
          });
          describe.skip('Other', () => {
            // TODO: add other tokens
          });
        });
        describe('certifyNewUser(opts, password)', () => {
          describe('argument validation', () => {
            it('[error] missing opts argument', async () => {
              try {
                await user.certifyNewUser(undefined, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing password argument', async () => {
              try {
                await user.certifyNewUser(teller);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts argument', async () => {
              try {
                await user.certifyNewUser('not an object', password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.user argument', async () => {
              try {
                await user.certifyNewUser({}, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts.user argument', async () => {
              try {
                await user.certifyNewUser({
                  user: 12345,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid password argument', async () => {
              try {
                await user.certifyNewUser({}, 'not my password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('permission checks', () => {
            it('[error] non-delegate cannot call this function', async () => {
              try {
                await user.certifyNewUser({
                  user: (await createRandomAccount()).user.address,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] delegate can exec this function', async () => {
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({
                user: (await createRandomAccount()).user.address,
              }, TEST_PASS));
            });
          });
        });
        describe('revokeUser(opts, password)', () => {
          describe('argument validation', () => {
            it('[error] missing opts argument', async () => {
              try {
                await user.revokeUser(undefined, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing password argument', async () => {
              try {
                await user.revokeUser(teller);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts argument', async () => {
              try {
                await user.revokeUser('not an object', password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] missing opts.user argument', async () => {
              try {
                await user.revokeUser({}, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid opts.user argument', async () => {
              try {
                await user.revokeUser({
                  user: 12345,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] invalid password argument', async () => {
              try {
                await user.revokeUser({}, 'not my password');
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('permission checks', () => {
            it('[error] non-delegate cannot call this function', async () => {
              try {
                await user.revokeUser({
                  user: (await createRandomAccount()).user.address,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
            it('[error] cannot call this on user who is not certified', async () => {
              try {
                await accounts.deployer.user.revokeUser({
                  user: (await createRandomAccount()).user.address,
                }, password);
              } catch (err) {
                return;
              }
              assert(false, 'should have thrown');
            });
          });
          describe('success cases', () => {
            it('[success] delegate can exec this function', async () => {
              const userAddr = await createRandomAddress();
              await waitForTxHashMined(accounts.deployer.user.certifyNewUser({
                user: userAddr,
              }, TEST_PASS));
              await waitForTxHashMined(accounts.deployer.user.revokeUser({
                user: userAddr,
              }, TEST_PASS));
            });
          });
        });
        // only works on kovan/mainnet since the needed mkr dai contracts have been deployed there
        // (['kovan', 'mainnet'].includes(process.env.NETWORK) ? describe : describe.skip)('ONLY ON KOVAN/MAINNET -- exchange(opts, password)', () => {
        //   describe('argument validation', () => {
        //     let validSellTokens;
        //     let validBuyTokens;
        //     let validSellAmount;
        //     let validBuyAmount;
        //
        //     before(() => {
        //       validSellTokens = validBuyTokens = ['DAI', 'ETH']; // eslint-disable-line no-multi-assign
        //       validSellAmount = parseFloat('0.05');
        //       validBuyAmount = parseFloat('0.05');
        //     });
        //
        //     it('[error] missing opts argument', async () => {
        //       try {
        //         await user.exchange(undefined, password);
        //         await user.exchange({}, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] missing password argument', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //           buyAmount: validBuyAmount,
        //         });
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] missing options.sellToken argument', async () => {
        //       try {
        //         await user.exchange({
        //           // sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //           buyAmount: validBuyAmount,
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] missing options.buyToken argument', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           // buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //           buyAmount: validBuyAmount,
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] missing options.sellAmount argument', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           // sellAmount: validSellAmount,
        //           buyAmount: validBuyAmount,
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] missing options.buyAmount argument', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //           // buyAmount: validBuyAmount,
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.sellToken argument', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: 'ABRA',
        //           buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //           buyAmount: validBuyAmount,
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.buyToken argument', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           buyToken: 'KADABRA',
        //           sellAmount: validSellAmount,
        //           buyAmount: validBuyAmount,
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.sellAmount argument', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: 'a string',
        //           buyAmount: validBuyAmount,
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.sellAmount argument -- zero', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: 0,
        //           buyAmount: validBuyAmount,
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.buyAmount argument -- string', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //           buyAmount: 'a string',
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.buyAmount argument -- zero', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //           buyAmount: 0,
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid options.sellToken + options.buyToken argument', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[0],
        //           sellAmount: validSellAmount,
        //           buyAmount: validBuyAmount,
        //         }, password);
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //     it('[error] invalid password argument', async () => {
        //       try {
        //         await user.exchange({
        //           sellToken: validSellTokens[0],
        //           buyToken: validBuyTokens[1],
        //           sellAmount: validSellAmount,
        //           buyAmount: validBuyAmount,
        //         }, 'not my password');
        //       } catch (err) {
        //         return;
        //       }
        //       assert(false, 'should have thrown');
        //     });
        //   });
        //   describe('success cases', () => {
        //     it('[success] exchanges ETH for DAI', async () => {
        //       const sellToken = 'ETH';
        //       const buyToken = 'DAI';
        //       const sellAmount = 0.01;
        //
        //       const buyAmount = await detherJs.getEstimation({
        //         sellToken,
        //         buyToken,
        //         sellAmount,
        //       });
        //
        //       if (buyAmount === null) {
        //         console.log('estimation returned 0, cannot continue');
        //         return;
        //       }
        //
        //       console.log(`estimated we get ${buyAmount} ${buyToken} for ${sellAmount} ${sellToken}`);
        //
        //       await addEthToUser(user, '0.09');
        //
        //       const tsxHash = await user.exchange({
        //         sellToken,
        //         buyToken,
        //         sellAmount,
        //         buyAmount,
        //       }, password);
        //
        //       expect(/0x[0-9a-z]{64}/.test(tsxHash)).to.equal(true);
        //
        //       const receipt = await detherJs.provider.getTransactionReceipt(tsxHash);
        //
        //       expect(receipt.status).to.equal(1); // 0 = failed
        //     });
        //
        //     it('[success] exchanges Dai for ETH', async () => {
        //       await addEthToUser(user, '0.09');
        //
        //       //
        //       // first sell some ETH to receive DAI
        //       //
        //
        //       let sellToken = 'ETH';
        //       let buyToken = 'DAI';
        //       let sellAmount = 0.01;
        //
        //       let buyAmount = await detherJs.getEstimation({
        //         sellToken,
        //         buyToken,
        //         sellAmount,
        //       });
        //
        //       if (buyAmount === null) {
        //         console.log('estimation returned 0, cannot continue');
        //         return;
        //       }
        //
        //       console.log(`estimated we get ${buyAmount} ${buyToken} for ${sellAmount} ${sellToken}`);
        //
        //       let tsxHash = await user.exchange({
        //         sellToken,
        //         buyToken,
        //         sellAmount,
        //         buyAmount,
        //       }, password);
        //
        //       expect(/0x[0-9a-z]{64}/.test(tsxHash)).to.equal(true);
        //
        //       let receipt = await detherJs.provider.getTransactionReceipt(tsxHash);
        //
        //       expect(receipt.status).to.equal(1); // 0 = failed
        //
        //       //
        //       // now sell the DAI back for ETH
        //       //
        //
        //       sellToken = 'DAI';
        //       buyToken = 'ETH';
        //       sellAmount = 0.01;
        //
        //       buyAmount = await detherJs.getEstimation({
        //         sellToken,
        //         buyToken,
        //         sellAmount,
        //       });
        //
        //       if (buyAmount === null) {
        //         console.log('estimation returned 0, cannot continue');
        //         return;
        //       }
        //
        //       console.log(`estimated we get ${buyAmount} ${buyToken} for ${sellAmount} ${sellToken}`);
        //
        //       tsxHash = await user.exchange({
        //         sellToken,
        //         buyToken,
        //         sellAmount,
        //         buyAmount,
        //       }, password);
        //
        //       expect(/0x[0-9a-z]{64}/.test(tsxHash)).to.equal(true);
        //
        //       receipt = await detherJs.provider.getTransactionReceipt(tsxHash);
        //
        //       expect(receipt.status).to.equal(1); // 0 = failed
        //     });
        //   });
        // });
      });
    });
  });
}
