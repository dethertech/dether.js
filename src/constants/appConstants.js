export const CRYPTOCOMPARE_URL = "https://min-api.cryptocompare.com/";
export const GAS_PRICE = 25000000000;
export const COORD_PRECISION = 5;
export const TICKER = {
  kovan: {
    DTH: "0x9027E9FC4641e2991A36Eaeb0347Bc5b35322741",
    DAI: "0xc4375b7de8af5a38a93548eb8453a498222c4ff2",
    BNB: "0x0000000000000000000000000000000000000000",
    MKR: "0x0000000000000000000000000000000000000000",
    OMG: "0x0000000000000000000000000000000000000000",
    ZRX: "0x0000000000000000000000000000000000000000",
    ETH: "0xd0A1E359811322d97991E03f863a0C30C2cF029C" // WETH
  },
  ropsten: {
    DTH: "0xdb06f28e163684de611f21f76203e42ab4ae5b55",
    DAI: "0xaD6D458402F60fD3Bd25163575031ACDce07538D",
    BNB: "0x0000000000000000000000000000000000000000",
    MKR: "0x0000000000000000000000000000000000000000",
    OMG: "0x4BFBa4a8F28755Cb2061c413459EE562c6B9c51b",
    ZRX: "0x0000000000000000000000000000000000000000",
    ETH: "0x0000000000000000000000000000000000000000" // WETH
  },
  rinkeby: {
    DTH: "0xaaa5dd9beff81bb47ccdde852504fb94fa18415c",
    DAI: "0x0000000000000000000000000000000000000000",
    BNB: "0x0000000000000000000000000000000000000000",
    MKR: "0x0000000000000000000000000000000000000000",
    OMG: "0x0000000000000000000000000000000000000000",
    ZRX: "0x0000000000000000000000000000000000000000",
    ETH: "0xc778417e063141139fce010982780140aa0cd5ab" // WETH
  },
  mainnet: {
    DTH: "0x5adc961d6ac3f7062d2ea45fefb8d8167d44b190",
    DAI: "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359",
    BNB: "0xb8c77482e45f1f44de1745f52c74426c631bdd52",
    MKR: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
    OMG: "0xd26114cd6ee289accf82350c8d8487fedb8a0c07",
    ZRX: "0xe41d2489571d322189246dafa5ebde1f4699f498",
    VEN: "0xd850942ef8811f2a866692a623011bde52a462c1",
    AE: "0x5ca9a71b1d01849c0a95490cc00559717fcf0d1d",
    REP: "0xe94327d07fc17907b4db788e5adf2ed424addff6",
    HAV: "0xc011a72400e58ecd99ee497cf89e3775d4bd732f",
    NUSD: "0x57ab1e02fee23774580c119740129eac7081e9d3",
    ZLA: "0xfd8971d5e8e1740ce2d0a84095fca4de729d0c16",
    ETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
    FLIXX: "0xf04a8ac553fcedb5ba99a64799155826c136b0be",
    PNK: "0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d",
    CAN: "0x1d462414fe14cf489c7a21cac78509f4bf8cd7c0",
    BAT: "0x0d8775f648430679a709e98d2b0cb6250d2887ef",
    NPXS: "0xa15c7ebe1f07caf6bff097d8a589fb8ac49ae5b3",
    AOA: "0x9ab165d795019b6d8b3e971dda91071421305e5a",
    LINK: "0x514910771af9ca656af840dff83e8264ecf986ca",
    TUSD: "0x8dd5fbce2f6a956c3022ba3663759011dd51e73e",
    GNT: "0xa74476443119A942dE498590Fe1f2454d7D4aC0d",
    HOT: "0x6c6ee5e31d828de241282b9606c8e98ea48526e2",
    PAX: "0x8e870d67f660d95d5be530380d0ec0bd388289e1",
    SNT: "0x744d70fdbe2ba4cf95131626614a1763df805b9e",
    WTC: "0xb7cb1c96db6b22b0d3d9536e0108d062bd488f74",
    IOST: "0xfa1a856cfa3409cfa145fa4e20eb270df3eb21ab",
    MITH: "0x3893b9422cd5d70a81edeffe3d5a1c6a978310bb",
    NEXO: "0xb62132e35a6c13ee1ee0f84dc5d40bad8d815206",
    BNT: "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c",
    LRC: "0xEF68e7C694F40c8202821eDF525dE3782458639f",
    MANA: "0x0f5d2fb29fb7d3cfee444a200298f468908cc942",
    ELF: "0xbf2179859fc6D5BEE9Bf9158632Dc51678a4100e",
    VERI: "0x8f3470A7388c05eE4e7AF3d01D8C722b0FF52374",
    POLY: "0x9992ec3cf6a55b00978cddf2b27bc6882d88d1ec",
    CMT: "0xf85feea2fdd81d51177f6b8f35f0e6734ce45f5f",
    LOOM: "0xa4e8c3ec456107ea67d3075bf9e3df3a75823db0",
    THETA: "0x3883f5e181fccaF8410FA61e12b59BAd963fb645",
    DROP: "0x4672bad527107471cb5067a887f4656d585a8a31",
    DGTX: "0x1c83501478f1320977047008496dacbd60bb15ef",
    PAY: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
    SWT: "0xb9e7f8568e08d5659f5d29c4997173d84cdf2607",
    KNC: "0xdd974D5C2e2928deA5F71b9825b8b646686BD200"
  }
};

export const ALLOWED_EXCHANGE_PAIRS = [
  { pair: "ETH-DTH", exchange: "kyber" },
  { pair: "ETH-DAI", exchange: "kyber" },
  { pair: "ETH-BNB", exchange: "kyber" },
  { pair: "ETH-MKR", exchange: "kyber" },
  { pair: "ETH-OMG", exchange: "kyber" },
  { pair: "ETH-ZRX", exchange: "kyber" },
  { pair: "ETH-VEN", exchange: "kyber" },
  { pair: "ETH-AE", exchange: "kyber" },
  { pair: "ETH-REP", exchange: "kyber" },
  { pair: "ETH-BAT", exchange: "kyber" },
  { pair: "ETH-LINK", exchange: "kyber" },
  { pair: "ETH-TUSD", exchange: "kyber" },
  { pair: "ETH-SNT", exchange: "kyber" },
  { pair: "ETH-IOST", exchange: "kyber" },
  { pair: "ETH-BNT", exchange: "kyber" },
  { pair: "ETH-MANA", exchange: "kyber" },
  { pair: "ETH-ELF", exchange: "kyber" },
  { pair: "ETH-POLY", exchange: "kyber" },
  { pair: "ETH-PAY", exchange: "kyber" },
  { pair: "ETH-KNC", exchange: "kyber" }
];

export const KYBER_ETH_TOKEN_ADDR =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export const AIRSWAP_WEBSOCKET = {
  rinkeby: "wss://sandbox.airswap-api.com/websocket",
  mainnet: "wss://connect.airswap-api.com/websocket"
};

// source: https://github.com/OasisDEX/oasis-direct/blob/master/src/settings.json
export const EXCHANGE_CONTRACTS = {
  kovan: {
    oasisProxyCreateExecute: "0xEE419971E63734Fed782Cfe49110b1544ae8a773",
    oasisDirectProxy: "0xe635f5f52220a114fea0985abf7ec8144710507b",
    dsProxyFactory: "0x93ffc328d601c4c5e9cc3c8d257e9afdaf5b0ac0",
    makerProxyRegistry: "0x383a7fc29edde64aec7f776e2517ec8819e147f1",
    makerOtc: "0x8cf1Cab422A0b6b554077A361f8419cDf122a9F9"
  },
  ropsten: {
    // Mkr/Oasis is not on ropsten
    // AirSwap is not on ropsten
    kyberNetworkProxy: "0x818E6FECD516Ecc3849DAf6845e3EC868087B755"
  },
  rinkeby: {
    // Mkr/Oasis is not on rinkeby
    airswapExchange: "0x07fc7c43d8168a2730344e5cf958aaecc3b42b41"
  },
  mainnet: {
    oasisProxyCreateExecute: " 0x793ebbe21607e4f04788f89c7a9b97320773ec59",
    oasisDirectProxy: " 0x279594b6843014376a422ebb26a6eab7a30e36f0",
    dsProxyFactory: " 0x1043fbd15c10a3234664cbdd944a16a204f945e6",
    makerProxyRegistry: " 0xaa63c8683647ef91b3fdab4b4989ee9588da297b",
    makerOtc: " 0x14fbca95be7e99c15cc2996c6c9d841e54b79425",
    airswapExchange: "0x8fd3121013a07c57f0d69646e86e7a4880b467b7",
    kyberNetworkProxy: "0x818E6FECD516Ecc3849DAf6845e3EC868087B755"
  }
};
