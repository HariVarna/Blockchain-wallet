/**
 * tokens.js — ERC-20 Token Registry
 * Popular tokens with metadata per network
 */

const TOKEN_LOGOS = {
  ETH:  'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  UNI:  'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
  AAVE: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
  MATIC:'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  BNB:  'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  WBTC: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  ARB:  'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  OP:   'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  LDO:  'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
  MKR:  'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
  CRV:  'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
  COMP: 'https://assets.coingecko.com/coins/images/10775/small/COMP.png',
  SNX:  'https://assets.coingecko.com/coins/images/3406/small/SNX.png',
  BAL:  'https://assets.coingecko.com/coins/images/11683/small/Balancer.png',
  SUSHI:'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png',
  PEPE: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
};

const COINGECKO_IDS = {
  ETH: 'ethereum', USDT: 'tether',
  UNI: 'uniswap', AAVE: 'aave',
  MATIC: 'matic-network', BNB: 'binancecoin', WBTC: 'wrapped-bitcoin',
  ARB: 'arbitrum', OP: 'optimism', LDO: 'lido-dao', MKR: 'maker',
  CRV: 'curve-dao-token', COMP: 'compound-governance-token',
  SNX: 'havven', BAL: 'balancer', SUSHI: 'sushi', PEPE: 'pepe',
};

const POPULAR_TOKENS = {
  mainnet: [
    { symbol: 'USDT',  name: 'Tether USD',          decimals: 6,  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    { symbol: 'UNI',   name: 'Uniswap',             decimals: 18, address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
    { symbol: 'AAVE',  name: 'Aave',                decimals: 18, address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' },
    { symbol: 'WBTC',  name: 'Wrapped Bitcoin',     decimals: 8,  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    { symbol: 'MKR',   name: 'Maker',               decimals: 18, address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2' },
    { symbol: 'LDO',   name: 'Lido DAO',            decimals: 18, address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32' },
    { symbol: 'CRV',   name: 'Curve DAO Token',     decimals: 18, address: '0xD533a949740bb3306d119CC777fa900bA034cd52' },
    { symbol: 'COMP',  name: 'Compound',            decimals: 18, address: '0xc00e94Cb662C3520282E6f5717214004A7f26888' },
    { symbol: 'SNX',   name: 'Synthetix',           decimals: 18, address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F' },
    { symbol: 'SUSHI', name: 'SushiSwap',           decimals: 18, address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2' },
    { symbol: 'BAL',   name: 'Balancer',            decimals: 18, address: '0xba100000625a3754423978a60c9317c58a424e3D' },
    { symbol: 'PEPE',  name: 'Pepe',                decimals: 18, address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
  ],
  sepolia: [],
};

const FIAT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar',          symbol: '$',  flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro',               symbol: '€',  flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound',      symbol: '£',  flag: '🇬🇧' },
  { code: 'INR', name: 'Indian Rupee',       symbol: '₹',  flag: '🇮🇳' },
  { code: 'JPY', name: 'Japanese Yen',       symbol: '¥',  flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan',       symbol: '¥',  flag: '🇨🇳' },
  { code: 'KRW', name: 'South Korean Won',   symbol: '₩',  flag: '🇰🇷' },
  { code: 'CAD', name: 'Canadian Dollar',    symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar',  symbol: 'A$', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc',        symbol: 'Fr', flag: '🇨🇭' },
  { code: 'SGD', name: 'Singapore Dollar',   symbol: 'S$', flag: '🇸🇬' },
  { code: 'AED', name: 'UAE Dirham',         symbol: 'د.إ',flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal',        symbol: '﷼',  flag: '🇸🇦' },
  { code: 'BRL', name: 'Brazilian Real',     symbol: 'R$', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso',       symbol: '$',  flag: '🇲🇽' },
  { code: 'RUB', name: 'Russian Ruble',      symbol: '₽',  flag: '🇷🇺' },
  { code: 'TRY', name: 'Turkish Lira',       symbol: '₺',  flag: '🇹🇷' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R',  flag: '🇿🇦' },
  { code: 'SEK', name: 'Swedish Krona',      symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone',    symbol: 'kr', flag: '🇳🇴' },
  { code: 'IDR', name: 'Indonesian Rupiah',  symbol: 'Rp', flag: '🇮🇩' },
  { code: 'THB', name: 'Thai Baht',          symbol: '฿',  flag: '🇹🇭' },
  { code: 'VND', name: 'Vietnamese Dong',    symbol: '₫',  flag: '🇻🇳' },
  { code: 'PHP', name: 'Philippine Peso',    symbol: '₱',  flag: '🇵🇭' },
  { code: 'PKR', name: 'Pakistani Rupee',    symbol: '₨',  flag: '🇵🇰' },
  { code: 'NGN', name: 'Nigerian Naira',     symbol: '₦',  flag: '🇳🇬' },
  { code: 'EGP', name: 'Egyptian Pound',     symbol: '£',  flag: '🇪🇬' },
  { code: 'BTC', name: 'Bitcoin',            symbol: '₿',  flag: '₿',  isCrypto: true },
  { code: 'ETH', name: 'Ethereum',           symbol: 'Ξ',  flag: 'Ξ',  isCrypto: true },
];

const LANGUAGES = [
  { code: 'en',    name: 'English',    nativeName: 'English' },
  { code: 'es',    name: 'Spanish',    nativeName: 'Español' },
  { code: 'fr',    name: 'French',     nativeName: 'Français' },
  { code: 'de',    name: 'German',     nativeName: 'Deutsch' },
  { code: 'zh',    name: 'Chinese',    nativeName: '中文' },
  { code: 'ja',    name: 'Japanese',   nativeName: '日本語' },
  { code: 'ko',    name: 'Korean',     nativeName: '한국어' },
  { code: 'pt',    name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru',    name: 'Russian',    nativeName: 'Русский' },
  { code: 'ar',    name: 'Arabic',     nativeName: 'العربية' },
  { code: 'hi',    name: 'Hindi',      nativeName: 'हिन्दी' },
  { code: 'tr',    name: 'Turkish',    nativeName: 'Türkçe' },
  { code: 'nl',    name: 'Dutch',      nativeName: 'Nederlands' },
  { code: 'pl',    name: 'Polish',     nativeName: 'Polski' },
  { code: 'id',    name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];

// ERC-20 ABI (minimal — balanceOf + decimals + symbol + name)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
];

// Demo connected DApps
const DEMO_CONNECTED_SITES = [
  { domain: 'app.uniswap.org',    name: 'Uniswap',   favicon: 'https://app.uniswap.org/favicon.ico',   permissions: ['View address', 'Request transactions'], connectedAt: Date.now() - 86400000 * 3 },
  { domain: 'opensea.io',         name: 'OpenSea',   favicon: 'https://opensea.io/favicon.ico',         permissions: ['View address'], connectedAt: Date.now() - 86400000 * 7 },
  { domain: 'app.aave.com',       name: 'Aave',      favicon: 'https://app.aave.com/favicon.ico',       permissions: ['View address', 'Request transactions', 'Sign messages'], connectedAt: Date.now() - 86400000 * 1 },
];
