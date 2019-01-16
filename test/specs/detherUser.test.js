/* global describe it beforeEach afterEach */
import { expect } from 'chai';
import sinon from 'sinon';
import DetherJS from '../../src/detherJs';
import DetherUser from '../../src/detherUser';
import Contracts from '../../src/utils/contracts';

import contractMock from '../mock/contract';

describe('dether user', () => {
  let sandbox = null;
  let dether = null;
  let wallet = null;
  let user = null;

  beforeEach(async () => {
    sandbox = sinon.sandbox.create();

    dether = new DetherJS({
      network: 'kovan',
    });

    wallet = DetherJS.Ethers.Wallet.createRandom();
    const encryptedWallet = await wallet.encrypt('password');
    user = new DetherUser({ dether, encryptedWallet });

    user.signedDetherContract = contractMock;
  });

  afterEach(() => {
    if (sandbox) {
      sandbox.restore();
    }
  });

  it('should instanciate', async () => {
    const password = 'password';
    const localWallet = DetherJS.Ethers.Wallet.createRandom();
    const encryptedWallet = await localWallet.encrypt(password);

    const localDether = { provider: { chainId: 42 } };

    const detheruser = new DetherUser({
      dether: localDether,
      encryptedWallet,
    });
    expect(detheruser.dether).to.eq(localDether);
    expect(detheruser.encryptedWallet).to.eq(encryptedWallet);

    const decryptedWallet =
      await DetherJS.Ethers.Wallet.fromEncryptedWallet(detheruser.encryptedWallet, password);
    expect(decryptedWallet.privateKey).to.eq(localWallet.privateKey);
  });

  it('should generate, encrypt and decrypt menmonic', () => {
    const mnemonic = DetherJS.createMnemonic();
    const passPhrase = 'password';
    const encrypted = DetherJS.encryptMnemonic(mnemonic, passPhrase);
    const decrypted = DetherJS.decryptMnemonic(encrypted, passPhrase);
    expect(mnemonic).to.eq(decrypted);
  });

  it('should get wallet', async () => {
    const customWallet = {};
    dether.provider = 'provider';

    const restore = DetherJS.Ethers.Wallet;
    DetherJS.Ethers.Wallet = {
      fromEncryptedWallet: sinon.stub().returns(customWallet),
    };

    const wallet = await user._getWallet('password');

    expect(DetherJS.Ethers.Wallet.fromEncryptedWallet.calledWith(user.encryptedWallet, 'password')).to.be.true;
    expect(wallet.provider).to.eq('provider');

    DetherJS.Ethers.Wallet = restore;
  });

  it('should get user address', async () => {
    const address = await user.getAddress();
    expect(address).to.eq(wallet.address.toLowerCase());
  });

  it('should get user info', async () => {
    const stub = sandbox.stub(dether, 'getTeller');
    stub.returns('info');

    const info = await user.getInfo();

    expect(stub.calledWith(wallet.address.toLowerCase())).to.be.true;
    expect(info).to.eq('info');
  });

  it('should get user escrow balance', async () => {
    const stub = sandbox.stub(dether, 'getTellerBalance');
    stub.returns('balance');
        const address = await user.getAddress();
    const balance = await dether.getTellerBalance(address);

    expect(stub.calledWith(wallet.address.toLowerCase())).to.be.true;
    expect(balance).to.eq('balance');
  });

  it('should register point', async () => {
    const transaction = {
      hash: 'hash',
    };
    const sellPoint = {
      lat: 1,
      lng: 2,
      countryId: 'FR',
      postalCode: 75019,
      rates: 20.20,
      avatarId: 1,
      currencyId: 2,
      messengerAddr: 'telegram',
      messengerAddr2: 'toshi',
      amount: 0.01,
    };

    const registerTeller = sinon.stub();
    registerTeller.returns(transaction);
    const _getCustomContract = sandbox.stub(Contracts, 'getCustomContract');
    _getCustomContract.returns({
      registerTeller,
    });

    const waitForTransaction = sinon.stub();
    waitForTransaction.resolves(transaction);
    user.dether.provider = {
      waitForTransaction,
    };

    const result = await user.addSellPoint(sellPoint, 'password');
    expect(result).to.deep.eq(transaction);
    console.log('regis', registerTeller);
    expect(registerTeller.args[0][0]).to.eq(100000);
    expect(registerTeller.args[0][1]).to.eq(200000);
    expect(registerTeller.args[0][2]).to.eq('FR');
    expect(registerTeller.args[0][3]).to.eq(75019);
    expect(registerTeller.args[0][4]).to.eq(1);
    expect(registerTeller.args[0][5]).to.eq(2);
    expect(registerTeller.args[0][6]).to.eq('telegram');
    expect(registerTeller.args[0][7]).to.eq('toshi');
    expect(registerTeller.args[0][8]).to.eq(2020);

    const transactionValue = DetherJS.Ethers.utils.parseEther('0.01');
    expect(_getCustomContract.args[0][0].value.eq(transactionValue)).to.be.true;
    expect(_getCustomContract.args[0][0].password).to.eq('password');
    expect(waitForTransaction.calledWith(transaction.hash));
  });

  it('should send coin', async () => {
    const transaction = {
      hash: 'hash',
    };

    const opts = {
      amount: 1,
      receiver: '0x085b30734fD4f48369D53225b410d7D04b2d9011',
    };

    const sendCoin = sinon.stub();
    sendCoin.returns(transaction);

    const _getCustomContract = sandbox.stub(Contracts, 'getCustomContract');
    _getCustomContract.returns({
      sendCoin,
    });

    const waitForTransaction = sinon.stub();
    waitForTransaction.resolves(transaction);
    user.dether.provider = {
      waitForTransaction,
    };

    const result = await user.sendToBuyer(opts, 'password');
    expect(result).to.deep.eq(transaction);

    expect(sendCoin.calledWith(
      '0x085b30734fD4f48369D53225b410d7D04b2d9011',
      DetherJS.Ethers.utils.parseEther('1'),
    )).to.be.true;
    expect(_getCustomContract.args[0][0].password).to.eq('password');
    expect(waitForTransaction.calledWith(transaction.hash));
  });

  it('should turn offline profile', async () => {
    const transaction = {
      hash: 'hash',
    };
    const switchTellerOffline = sinon.stub();
    switchTellerOffline.returns(transaction);
    const _getCustomContract = sandbox.stub(Contracts, 'getCustomContract');
    _getCustomContract.returns({
      switchTellerOffline,
    });

    const waitForTransaction = sinon.stub();
    waitForTransaction.resolves(transaction);
    user.dether.provider = {
      waitForTransaction,
    };

    const result = await user.turnOfflineSellPoint('password');
    expect(result).to.deep.eq(transaction);
    expect(_getCustomContract.args[0][0].password).to.eq('password');
    expect(waitForTransaction.calledWith(transaction.hash));
  });

  it('should delete my profile', async () => {
    const transaction = {
      hash: 'hash',
    };
    const deleteMyProfile = sinon.stub();
    deleteMyProfile.returns(transaction);
    const _getCustomContract = sandbox.stub(Contracts, 'getCustomContract');
    _getCustomContract.returns({
      deleteMyProfile,
    });

    const waitForTransaction = sinon.stub();
    waitForTransaction.resolves(transaction);
    user.dether.provider = {
      waitForTransaction,
    };

    const result = await user.deleteSellPoint('password');
    expect(result).to.deep.eq(transaction);
    expect(_getCustomContract.args[0][0].password).to.eq('password');
    expect(waitForTransaction.calledWith(transaction.hash));
  });
});
