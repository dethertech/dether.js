/* global describe it beforeEach afterEach */
import sinon from 'sinon';
import { expect } from 'chai';
import Ethers from 'ethers';

import DetherInterfaceJson from 'dethercontract/contracts/DetherInterface.json';
import DetherTellerStorageJson from 'dethercontract/contracts/DetherTellerStorage.json';

import Contracts from '../../../src/utils/contracts';

describe('Contracts', () => {
  let sandbox = null;

  beforeEach(async () => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    if (sandbox) {
      sandbox.restore();
    }
  });

  it('should get contract', async () => {
    const provider = {
      chainId: 42,
    };

    const contract = await Contracts.getContract(DetherInterfaceJson, provider);

    expect(contract instanceof Ethers.Contract).to.be.true;
    expect(contract.address).to.eq(DetherInterfaceJson.networks[42].address);
    expect(contract.provider).to.deep.eq(provider);
    expect(typeof contract.registerTeller).to.eq('function');
  });

  it('should get contract with signed wallet', async () => {
    const wallet = {
      provider: {
        chainId: 42,
      },
    };

    const contract = await Contracts.getContract(DetherInterfaceJson, wallet);

    expect(contract.provider).to.deep.eq(wallet.provider);
    expect(contract.address).to.eq(DetherInterfaceJson.networks[42].address);
  });

  it('should get dether contract', async () => {
    const getContract = sandbox.stub(Contracts, 'getContract');
    getContract.returns('res');


    const detherContract = await Contracts.getDetherContract('provider');
    expect(getContract.calledWith(DetherInterfaceJson, 'provider')).to.be.true;
    expect(detherContract).to.eq('res');
  });

  it('should get dether storage contract', async () => {
    const getContract = sandbox.stub(Contracts, 'getContract');
    getContract.returns('res');


    const detherContract = await Contracts.getDetherStorageContract('provider');
    expect(getContract.calledWith(DetherTellerStorageJson, 'provider')).to.be.true;
    expect(detherContract).to.eq('res');
  });

  it('should create special contract', async () => {
    const stub = sinon.stub();
    stub.returns('result');

    const getDetherContract = sandbox.stub(Contracts, 'getDetherContract');
    getDetherContract.returns('res');

    const customWallet = {
      sendTransaction: stub,
      getAddress: () => 'address',
      provider: 'provider',
    };

    const customContract = await Contracts.getCustomContract({
      wallet: customWallet,
      value: 1.2,
      password: 'password',
    });

    expect(customContract).to.eq('res');
    const customProvider = getDetherContract.args[0][0];

    expect(customProvider.getAddress()).to.eq('address');
    expect(customProvider.provider).to.eq('provider');

    const transactionResult = customProvider.sendTransaction({});
    expect(transactionResult).to.eq('result');
    expect(stub.calledWith({ value: 1.2 })).to.be.true;
  });
});
