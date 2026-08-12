/**
 * tokens.js — ERC-20 Token Registry
 * Popular tokens with metadata per network
 */

const TOKEN_LOGOS = {
  ETH:  'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  WETH: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  DAI:  'https://assets.coingecko.com/coins/images/9956/small/4943.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
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
};

const COINGECKO_IDS = {
  ETH: 'ethereum', WETH: 'weth', USDC: 'usd-coin', USDT: 'tether',
  DAI: 'dai', LINK: 'chainlink', UNI: 'uniswap', AAVE: 'aave',
  MATIC: 'matic-network', BNB: 'binancecoin', WBTC: 'wrapped-bitcoin',
  ARB: 'arbitrum', OP: 'optimism', LDO: 'lido-dao', MKR: 'maker',
  CRV: 'curve-dao-token', COMP: 'compound-governance-token',
  SNX: 'havven', BAL: 'balancer', SUSHI: 'sushi',
};

const POPULAR_TOKENS = {
  mainnet: [
    { symbol: 'WETH',  name: 'Wrapped Ether',      decimals: 18, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
    { symbol: 'USDC',  name: 'USD Coin',            decimals: 6,  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    { symbol: 'USDT',  name: 'Tether USD',          decimals: 6,  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    { symbol: 'DAI',   name: 'Dai Stablecoin',      decimals: 18, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
    { symbol: 'LINK',  name: 'Chainlink',            decimals: 18, address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
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
  ],
  sepolia: [
    { symbol: 'USDC',  name: 'USD Coin (Test)',      decimals: 6,  address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8' },
    { symbol: 'LINK',  name: 'Chainlink (Test)',     decimals: 18, address: '0x779877A7B0D9E8603169DdbD7836e478b4624789' },
    { symbol: 'DAI',   name: 'Dai (Test)',           decimals: 18, address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357' },
    { symbol: 'WETH',  name: 'Wrapped Ether (Test)', decimals: 18, address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' },
  ],
  polygon: [
    { symbol: 'USDC',  name: 'USD Coin',            decimals: 6,  address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
    { symbol: 'USDT',  name: 'Tether USD',          decimals: 6,  address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
    { symbol: 'DAI',   name: 'Dai Stablecoin',      decimals: 18, address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' },
    { symbol: 'WBTC',  name: 'Wrapped Bitcoin',     decimals: 8,  address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6' },
    { symbol: 'LINK',  name: 'Chainlink',            decimals: 18, address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39' },
    { symbol: 'AAVE',  name: 'Aave',                decimals: 18, address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B' },
    { symbol: 'WETH',  name: 'Wrapped Ether',       decimals: 18, address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619' },
  ],
  arbitrum: [
    { symbol: 'USDC',  name: 'USD Coin',            decimals: 6,  address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' },
    { symbol: 'USDT',  name: 'Tether USD',          decimals: 6,  address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
    { symbol: 'DAI',   name: 'Dai Stablecoin',      decimals: 18, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' },
    { symbol: 'WBTC',  name: 'Wrapped Bitcoin',     decimals: 8,  address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
    { symbol: 'ARB',   name: 'Arbitrum',            decimals: 18, address: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
    { symbol: 'LINK',  name: 'Chainlink',            decimals: 18, address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' },
  ],
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
