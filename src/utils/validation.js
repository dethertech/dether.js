/**
 * @ignore
 */
export const validateSellPoint = (teller) => {
  if (!teller || typeof teller !== 'object') {
    return { error: true, msg: 'Invalid args' };
  }
  if (!teller.lat || Number.isNaN(teller.lat) || teller.lat > 90 || teller.lat < -90) {
    return { error: true, msg: 'Invalid latitude' };
  }
  if (!teller.lng || Number.isNaN(teller.lng) || teller.lng > 180 || teller.lng < -180) {
    return { error: true, msg: 'Invalid longitude' };
  }
  if (!teller.countryId || teller.countryId < 1 ||  teller.countryId > 4) {
    return { error: true, msg: 'Invalid zone' };
  }
  if (!teller.rates || teller.rates <= 0 || teller.rates > 100) {
    return { error: true, msg: 'Invalid rates' };
  }
  if (!teller.avatarId || !Number.isInteger(teller.avatarId) || teller.avatarId < 0) {
    return { error: true, msg: 'Invalid avatar' };
  }
  if (!teller.currencyId || !Number.isInteger(teller.currencyId) || teller.currencyId < 0) {
    return { error: true, msg: 'Invalid currency' };
  }
  if (!teller.messengerAddr || teller.messengerAddr.length < 2 || teller.messengerAddr.length > 30) {
    return { error: true, msg: 'Invalid telegram' };
  }
  if (!teller.amount || Number.isNaN(teller.amount) || teller.amount < 0.01) {
    return { error: true, msg: 'Invalid amount' };
  }
  // if (!teller.postalCode) {
  //   return { error: true, msg: 'Invalid amount' };
  // }
  return {};
};


/**
 * @ignore
 */
export const validateShop = (shop) => {
  if (!shop || typeof shop !== 'object') {
    return { error: true, msg: 'Invalid args' };
  }
  // if (!shop.lat || Number.isNaN(teller.lat) || teller.lat > 90 || teller.lat < -90) {
  //   return { error: true, msg: 'Invalid latitude' };
  // }
  // if (!teller.lng || Number.isNaN(teller.lng) || teller.lng > 180 || teller.lng < -180) {
  //   return { error: true, msg: 'Invalid longitude' };
  // }
  // if (!teller.countryId || teller.countryId < 1 ||  teller.countryId > 4) {
  //   return { error: true, msg: 'Invalid zone' };
  // }
  // if (!teller.rates || teller.rates <= 0 || teller.rates > 100) {
  //   return { error: true, msg: 'Invalid rates' };
  // }
  // if (!teller.avatarId || !Number.isInteger(teller.avatarId) || teller.avatarId < 0) {
  //   return { error: true, msg: 'Invalid avatar' };
  // }
  // if (!teller.currencyId || !Number.isInteger(teller.currencyId) || teller.currencyId < 0) {
  //   return { error: true, msg: 'Invalid currency' };
  // }
  // if (!teller.messengerAddr || teller.messengerAddr.length < 2 || teller.messengerAddr.length > 30) {
  //   return { error: true, msg: 'Invalid telegram' };
  // }
  // if (!teller.amount || Number.isNaN(teller.amount) || teller.amount < 0.01) {
  //   return { error: true, msg: 'Invalid amount' };
  // }
  // if (!teller.postalCode) {
  //   return { error: true, msg: 'Invalid amount' };
  // }
  return {};
};


/**
 * @ignore
 */
export const validateSendCoin = (tsx) => {
  if (!tsx || typeof tsx !== 'object') {
    return { error: true, msg: 'Invalid args' };
  }
  if (!tsx.receiver) {
    return { error: true, msg: 'Invalid receiver' };
  }
  if (!tsx.amount || Number.isNaN(tsx.amount) || tsx.amount < 0.001) {
    return { error: true, msg: 'Invalid amount' };
  }
  return {};
};

/**
 * @ignore
 */
export const validatePassword = (password) => {
  if (!password || (typeof password) !== 'string' || password.length < 1) {
    return { error: true, msg: 'Invalid password' };
  }
  return {};
};

/**
 * @ignore
 */
export const validateGetCustomContract = (opts) => {
  if (!opts || typeof opts !== 'object') {
    return { error: true, msg: 'No params found' };
  }
  if (!opts.wallet || typeof opts.wallet !== 'object') {
    return { error: true, msg: 'Invalid wallet' };
  }
  if (!opts.password || typeof opts.password !== 'string') {
    return { error: true, msg: 'Need password to decrypt wallet' };
  }
  return {};
};
