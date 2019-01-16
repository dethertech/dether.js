/* global describe it */
import { expect } from 'chai';
import Providers from '../../../src/utils/providers';


describe('providers', () => {
  it('should get default provider', () => {
    const provider = Providers.getProvider({
      network: 'ropsten',
    });

    expect(provider.constructor.name).to.eq('FallbackProvider');
    expect(provider.name).to.eq('ropsten');
  });

  it('should instanciate with provider URL and api keys', () => {
    const provider = Providers.getProvider({
      network: 'ropsten',
      rpcURL: 'http://localhost:8545',
      etherscanKey: 'etherscan',
      // infuraKey: 'infura',
    });

    expect(provider.constructor.name).to.eq('FallbackProvider');
    expect(provider.providers[0].url).to.eq('http://localhost:8545');
    expect(provider.providers[0].name).to.eq('ropsten');
    expect(provider.providers[1].apiKey).to.eq('etherscan');
    expect(provider.providers[1].name).to.eq('ropsten');
    // expect(provider.providers[2].apiKey).to.eq('infura');
    // expect(provider.providers[2].name).to.eq('ropsten');
  });
});
