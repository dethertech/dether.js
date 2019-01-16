/* global describe it beforeEach afterEach */
import { expect } from 'chai';
import sinon from 'sinon';
import DetherJS from '../../src/detherJs';
import Contracts from '../../src/utils/contracts';
import Providers from '../../src/utils/providers';

import contractMock from '../mock/contract';
import storageMock from '../mock/storage';

describe('dether js', () => {
  describe('instanciation', () => {
    let dether;

    it('should instanciate with provider', () => {
      const p = sinon.stub(Providers, 'getProvider');
      const c = sinon.stub(Contracts, 'getDetherContract');
      const s = sinon.stub(Contracts, 'getDetherStorageContract');

      p.returns('provider');
      c.returns('contractInstance');
      s.returns('storageInstance');

      dether = new DetherJS({
        network: 'ropsten',
      });

      expect(dether.provider).to.eq('provider');

      expect(dether.contractInstance).to.equal('contractInstance');
      expect(dether.storageInstance).to.equal('storageInstance');

      expect(c.calledWith(dether.provider)).to.be.true;
      expect(s.calledWith(dether.provider)).to.be.true;

      p.restore();
      c.restore();
      s.restore();
    });
  });

  describe('calls', () => {
    let dether = [];
    let stubs = [];

    beforeEach(async () => {
      stubs = [];

      dether = new DetherJS({
        network: 'kovan',
      });

      dether.contractInstance = contractMock;
      dether.storageInstance = storageMock;
    });

    afterEach(() => {
      stubs.forEach(s => s.restore());
      stubs = [];
    });

    it('should get user', async () => {
      const wallet = DetherJS.Ethers.Wallet.createRandom();
      const encryptedWallet = await wallet.encrypt('password');

      const user = dether.getUser(encryptedWallet);
      expect(user.dether).to.eq(dether);
      expect(user.encryptedWallet).to.eq(encryptedWallet);
    });

    describe('getTeller', () => {
      it('should get teller', async () => {
        stubs.push(sinon.spy(storageMock, 'getTellerPositionRaw'));
        stubs.push(sinon.spy(storageMock, 'getTellerProfile1'));
        // stubs.push(sinon.spy(storageMock, 'getTellerProfile2'));

        const teller = await dether.getTeller('addr');
        expect(stubs[0].calledWith('addr')).to.be.true;
        expect(stubs[1].calledWith('addr')).to.be.true;
        // expect(stubs[2].calledWith('addr')).to.be.true;

        expect(teller.id).to.eq('addr');
        expect(teller.ethAddress).to.eq('addr');
        expect(teller.messengerAddr).to.eq('telegram');
        expect(teller.messengerAddr2).to.eq('toshi');
        expect(teller.lat).to.eq(9.12312);
        expect(teller.lng).to.eq(8.12312);
        expect(teller.countryId).to.eq('FR');
        expect(teller.balance).to.eq(2.1);
        expect(teller.rates).to.eq(23.13);
        expect(teller.volumeSell).to.eq(1.2);
        expect(teller.volumeBuy).to.eq(2.2);
        expect(teller.nbTrade).to.eq(12);
        expect(teller.currencyId).to.eq(1);
        expect(teller.avatarId).to.eq(2);
        expect(teller.postalCode).to.eq(75009);
      });
    });

    describe('getTellerBalance', () => {
      it('should be a function', () => {
        expect(typeof dether.getTellerBalance).to.equal('function');
      });

      it('should get user escrow balance', async () => {
        const spy = sinon.spy(storageMock, 'getTellerBalance');
        const balance = await dether.getTellerBalance('0x0c6dd5b28707a045f3a0c7429ed3fb9f835cb623');
        expect(balance).to.eq(2.2);
        expect(spy.calledWith('0x0c6dd5b28707a045f3a0c7429ed3fb9f835cb623')).to.be.true;
        spy.restore();
      });

      it('should get user escrow balance throw invalid address', async () => {
        expect(dether.getTellerBalance).to.throw;
        expect(dether.getTellerBalance.bind(dether, 'fiezfij')).to.throw;
      });
    });

    it('filter null&duplicates', async () => {
      const list = [
        null,
        { ethAddress: 1 },
        { ethAddress: 2 },
        { ethAddress: 3 },
        undefined,
        { ethAddress: 4 },
        null,
      ];

      const fil = DetherJS._filterTellerList(list);

      expect(fil.length).to.eq(4);
      expect(fil[0].ethAddress).to.eq(1);
      expect(fil[1].ethAddress).to.eq(2);
      expect(fil[2].ethAddress).to.eq(3);
      expect(fil[3].ethAddress).to.eq(4);
    });

    describe('getAllTellers', () => {
      it('should be a function', () => {
        expect(typeof dether.getAllTellers).to.equal('function');
      });

      it('should get all tellers', async () => {
        const stub = sinon.stub(dether, 'getTeller');

        stub.onCall(0).returns({ ethAddress: 'a' });
        stub.onCall(1).returns({ ethAddress: 'b' });
        stub.onCall(2).returns({ ethAddress: 'c' });

        const allTellers = await dether.getAllTellers();
        expect(allTellers.length).to.eq(3);
        expect(allTellers[0].ethAddress).to.eq('a');
        expect(allTellers[1].ethAddress).to.eq('b');
        expect(allTellers[2].ethAddress).to.eq('c');

        stub.restore();
      });

      it('should get all tellers without duplicate', async () => {
        const stub = sinon.stub(dether, 'getTeller');

        stub.onCall(0).returns({ ethAddress: 'a' });
        stub.onCall(1).returns({ ethAddress: 'b' });
        stub.onCall(2).returns({ ethAddress: 'a' });

        const allTellers = await dether.getAllTellers();
        expect(allTellers.length).to.eq(2);
        expect(allTellers[0].ethAddress).to.eq('a');
        expect(allTellers[1].ethAddress).to.eq('b');

        stub.restore();
      });

      it('should get array of teller', async () => {
        const tab = [
          '0x0c6dd5b28707a045f3a0c7429ed3fb9f835cb621',
          '0x0c6dd5b28707a045f3a0c7429ed3fb9f835cb622',
        ];
        const allTellers = await dether.getAllTellers(tab);
        expect(allTellers.length).to.eq(2);
        expect(allTellers[0].ethAddress).to.eq('0x0c6dd5b28707a045f3a0c7429ed3fb9f835cb621');
        expect(allTellers[1].ethAddress).to.eq('0x0c6dd5b28707a045f3a0c7429ed3fb9f835cb622');
      });

      it('should returns empty array if error', async () => {
        const stub = sinon.stub(dether.storageInstance, 'getAllTellers');

        let allTellers;

        stub.returns(null);
        allTellers = await dether.getAllTellers();
        expect(allTellers).to.deep.eq([]);

        stub.returns([]);
        allTellers = await dether.getAllTellers();
        expect(allTellers).to.deep.eq([]);

        stub.returns([null]);
        allTellers = await dether.getAllTellers();
        expect(allTellers).to.deep.eq([]);

        stub.restore();
      });

      it('should throw for one teller', async () => {
        const addr = '0x0c6dd5b28707a045f3a0c7429ed3fb9f835cb621';
        try {
          await dether.getAllTellers(addr);
          expect(false).to.be.true;
        } catch (e) {

        }
      });
    });

    describe('getTellersInZone', () => {
      it('should be a function', () => {
        expect(typeof dether.getTellersInZone).to.equal('function');
      });


      it('should get all tellers in zone', async () => {
        const stub = sinon.stub(dether, 'getTeller');

        stub.onCall(0).returns({ ethAddress: 'a', countryId: 'FR', postalCode: 75019 });
        stub.onCall(1).returns({ ethAddress: 'b', countryId: 'FR', postalCode: 75019 });
        stub.onCall(2).returns({ ethAddress: 'a', countryId: 'BE', postalCode: 11209 });

        const countryId = 'FR';
        const postalCode = 75019;
        const allTellers = await dether.getTellersInZone({ countryId, postalCode });
        expect(allTellers[0].ethAddress).to.eq('a');
        expect(allTellers[1].ethAddress).to.eq('b');

        stub.restore();
      });


      // it('should get all tellers in multiple zone', async () => {
      //   const stub = sinon.stub(dether, 'getTeller');
      //
      //   stub.onCall(0).returns({ ethAddress: 'a', zoneId: 42 });
      //   stub.onCall(1).returns({ ethAddress: 'b', zoneId: 42 });
      //   stub.onCall(2).returns({ ethAddress: 'c', zoneId: 101 });
      //   stub.onCall(3).returns({ ethAddress: 'd', zoneId: 101 });
      //   stub.onCall(4).returns({ ethAddress: 'c', zoneId: 101 });
      //   stub.onCall(5).returns({ ethAddress: 'd', zoneId: 101 });
      //   stub.onCall(6).returns({ ethAddress: 'e', zoneId: 100 });
      //   stub.onCall(7).returns({ ethAddress: 'f', zoneId: 58 });
      //
      //   const zones = [42, 101];
      //   const allTellers = await dether.getTellersInZone(zones);
      //   expect(allTellers.length).to.eq(4);
      //   expect(allTellers[0].ethAddress).to.eq('a');
      //   expect(allTellers[1].ethAddress).to.eq('b');
      //   expect(allTellers[2].ethAddress).to.eq('c');
      //   expect(allTellers[3].ethAddress).to.eq('d');
      //   stub.restore();
      // });
    });
  });
});
