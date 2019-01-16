/* global describe it */
import { expect } from 'chai';
import Ethers from 'ethers';
import Formatters from '../../../src/utils/formatters';


describe('formatters', () => {
  describe('tellerPosFromContract', () => {
    it('example 1', () => {
      const rawTellerPos = [
        123,
        456,
        'FR',
        75009,
      ];
      const tellerPos = Formatters.tellerPosFromContract(rawTellerPos);

      expect(tellerPos.lat).to.eq(0.00123);
      expect(tellerPos.lng).to.eq(0.00456);
      expect(tellerPos.countryId).to.eq('FR');
      expect(tellerPos.postalCode).to.eq(75009);
    });
    it('example 2', () => {
      const rawTellerPos = [
        912312,
        812312,
        'FR',
        75009,
      ];
      const tellerPos = Formatters.tellerPosFromContract(rawTellerPos);

      expect(tellerPos.lat).to.eq(9.12312);
      expect(tellerPos.lng).to.eq(8.12312);
      expect(tellerPos.countryId).to.eq('FR');
      expect(tellerPos.postalCode).to.eq(75009);
    });
    it('example 3', () => {
      const rawTellerPos = [
        -1912312,
        -1812312,
        'FR',
        75009,
      ];
      const tellerPos = Formatters.tellerPosFromContract(rawTellerPos);

      expect(tellerPos.lat).to.eq(-19.12312);
      expect(tellerPos.lng).to.eq(-18.12312);
      expect(tellerPos.countryId).to.eq('FR');
      expect(tellerPos.postalCode).to.eq(75009);
    });
  });

  describe('tellerProfileFromContract', () => {
    it('example 1', () => {
      const rawTellerProfile1 = {
        avatarId: 2,
        currencyId: 1,
        messengerAddr: 'telegram',
        messengerAddr2: 'toshi',
      };

      const rawTellerProfile2 = {
        rate: 2313,
        volumeSell: Ethers.utils.parseEther('1.2'),
        volumeBuy: Ethers.utils.parseEther('2.2'),
        nbTrade: Ethers.utils.bigNumberify(12),
        balance: Ethers.utils.parseEther('2.1'),
      };

      const tellerProfile1 = Formatters.tellerProfileFromContract1(rawTellerProfile1);
      const tellerProfile2 = Formatters.tellerProfileFromContract2(rawTellerProfile2);
      expect(tellerProfile1.messengerAddr).to.eq('telegram');
      expect(tellerProfile1.messengerAddr2).to.eq('toshi');
      expect(tellerProfile2.balance).to.eq(2.1);
      expect(tellerProfile2.rates).to.eq(23.13);
      expect(tellerProfile2.volumeSell).to.eq(1.2);
      expect(tellerProfile2.volumeBuy).to.eq(2.2);
      expect(tellerProfile2.nbTrade).to.eq(12);
      expect(tellerProfile1.currencyId).to.eq(1);
      expect(tellerProfile1.avatarId).to.eq(2);
    });
  });

  describe('sellPointToContract', () => {
    it('example 1', () => {
      const rawSellPoint = {
        lat: 1.233,
        lng: 2.233,
        countryId: 'FR',
        postalCode: 75019,
        rates: 23.13,
        avatarId: 2,
        currencyId: 1,
        messengerAddr: 'telegram',
        messengerAddr2: 'toshi',
        amount: 1,
      };
      const sellPoint = Formatters.sellPointToContract(rawSellPoint);

      expect(sellPoint.lat).to.eq(123300);
      expect(sellPoint.lng).to.eq(223300);
      expect(sellPoint.countryId).to.eq('FR');
      expect(sellPoint.postalCode).to.eq(75019);
      expect(sellPoint.avatarId).to.eq(2);
      expect(sellPoint.currencyId).to.eq(1);
      // expect(sellPoint.messengerAddr.constructor.name).to.eq('Uint8Array');
      expect(sellPoint.messengerAddr).to.eq('telegram');


      // expect(sellPoint.messengerAddr2.constructor.name).to.eq('Uint8Array');
      expect(sellPoint.messengerAddr2).to.eq('toshi');

    });
    it('example 2', () => {
      const rawSellPoint = {
        lat: 1.23384739847,
        lng: 2.2338742383,
        countryId: 'FR',
        postalCode: 75019,
        rates: 23.13321,
        avatarId: 2,
        currencyId: 1,
        messengerAddr: 'telegram',
        messengerAddr2: 'toshi',
        amount: 1,
      };
      const sellPoint = Formatters.sellPointToContract(rawSellPoint);

      expect(sellPoint.lat).to.eq(123384);
      expect(sellPoint.lng).to.eq(223387);
      expect(sellPoint.rates).to.eq(2313);
    });
    it('example 3', () => {
      const rawSellPoint = {
        lat: 12,
        lng: 23,
        countryId: 'FR',
        postalCode: 75019,
        rates: 23,
        avatarId: 2,
        currencyId: 1,
        messengerAddr: 'telegram',
        messengerAddr2: 'toshi',
        amount: 1,
      };
      const sellPoint = Formatters.sellPointToContract(rawSellPoint);

      expect(sellPoint.lat).to.eq(1200000);
      expect(sellPoint.lng).to.eq(2300000);
      expect(sellPoint.rates).to.eq(2300);
    });
    it('example 3', () => {
      const rawSellPoint = {
        lat: 12.1,
        lng: 23.1,
        countryId: 'FR',
        postalCode: 75019,
        rates: 23,
        avatarId: 2,
        currencyId: 1,
        messengerAddr: 'telegram',
        messengerAddr2: 'toshi',
        amount: 1,
      };
      const sellPoint = Formatters.sellPointToContract(rawSellPoint);

      expect(sellPoint.lat).to.eq(1210000);
      expect(sellPoint.lng).to.eq(2310000);
    });
    it('example 3', () => {
      const rawSellPoint = {
        lat: -12.1,
        lng: -23.1,
        countryId: 'FR',
        postalCode: 75019,
        rates: 23,
        avatarId: 2,
        currencyId: 1,
        messengerAddr: 'telegram',
        messengerAddr2: 'toshi',
        amount: 1,
      };
      const sellPoint = Formatters.sellPointToContract(rawSellPoint);

      expect(sellPoint.lat).to.eq(-1210000);
      expect(sellPoint.lng).to.eq(-2310000);
    });
  });
});
