/**
 * APEX WALLET — Complete Extension Application Logic
 * Phases 1–12 Implementation
 */
(function () {
  'use strict';

  // ===========================================
  // CONSTANTS & CONFIG
  // ===========================================

  const PRESET_NETWORKS = {
    sepolia: { key: 'sepolia', name: 'Ethereum Sepolia', rpc: 'https://rpc.sepolia.org', explorer: 'https://sepolia.etherscan.io', chainId: 11155111, symbol: 'ETH', dotColor: '#8247E5', isTestnet: true },
    mainnet: { key: 'mainnet', name: 'Ethereum Mainnet', rpc: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', explorer: 'https://etherscan.io', chainId: 1, symbol: 'ETH', dotColor: '#28A745', isTestnet: false },
    polygon: { key: 'polygon', name: 'Polygon Mainnet', rpc: 'https://polygon-rpc.com', explorer: 'https://polygonscan.com', chainId: 137, symbol: 'MATIC', dotColor: '#8247E5', isTestnet: false },
    arbitrum: { key: 'arbitrum', name: 'Arbitrum One', rpc: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io', chainId: 42161, symbol: 'ETH', dotColor: '#28A8EC', isTestnet: false },
    optimism: { key: 'optimism', name: 'OP Mainnet', rpc: 'https://mainnet.optimism.io', explorer: 'https://optimistic.etherscan.io', chainId: 10, symbol: 'ETH', dotColor: '#FF0420', isTestnet: false },
    base: { key: 'base', name: 'Base Mainnet', rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org', chainId: 8453, symbol: 'ETH', dotColor: '#0052FF', isTestnet: false },
    bsc: { key: 'bsc', name: 'BNB Smart Chain', rpc: 'https://bsc-dataseed.binance.org', explorer: 'https://bscscan.com', chainId: 56, symbol: 'BNB', dotColor: '#F3BA2F', isTestnet: false },
    avalanche: { key: 'avalanche', name: 'Avalanche C-Chain', rpc: 'https://api.avax.network/ext/bc/C/rpc', explorer: 'https://snowtrace.io', chainId: 43114, symbol: 'AVAX', dotColor: '#E84142', isTestnet: false }
  };

  const COINGECKO_API_KEY = 'CG-vXiLtgvzYPtYYJszgVcBcW9L';
  const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

  // ===========================================
  // APP STATE
  // ===========================================

  let provider = null;
  let currentNetworkKey = 'sepolia';
  let activeWallet = null;
  let activeWalletData = null;
  let draftGeneratedWallet = null;

  let accounts = [];
  let activeAddress = '';
  let seedPhrase = '';
  let accountBalances = {};
  let renameTargetAddress = '';

  let customTokens = [];
  let tokenBalances = {};
  let customNetworks = {};
  let contacts = [];
  let connectedSites = [];
  let notifications = [];
  let txHistory = [];

  let ethPriceUsd = null;
  let ethChange24h = null;
  let tokenPricesData = {};
  let priceRefreshTimer = null;

  let masterPassword = '';
  let isLocked = false;
  let lastActivityTime = Date.now();
  let autoLockMinutes = 5;
  let autoLockInterval = null;

  let pendingCopyText = '';
  let pendingCopyMessage = '';

  let selectedCurrency = 'USD';
  let selectedLanguage = 'en';
  let hideZeroBalances = false;
  let tokenSortMethod = 'value'; // value | name | balance
  let currentTheme = 'dark';
  let qrCodeInstance = null;
  let currentAssetTab = 'tokens';
  let currentView = 'view-home';

  // DOM Helper
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ===========================================
  // JAZZICON GENERATOR
  // ===========================================

  function generateJazzicon(address, size = 32) {
    if (!address) return `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#333"/></svg>`;
    const seed = parseInt(address.slice(2, 10), 16);
    const colors = ['#F6851B', '#E4761B', '#037DD6', '#28A745', '#6A3EAC', '#00C8E0', '#D73A49'];
    const center = size / 2;
    const bg = colors[seed % colors.length];
    const c1 = colors[(seed + 2) % colors.length];
    const c2 = colors[(seed + 4) % colors.length];
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${center}" cy="${center}" r="${center}" fill="${bg}"/>
        <circle cx="${center * 0.7}" cy="${center * 0.7}" r="${center * 0.5}" fill="${c1}" opacity="0.8"/>
        <rect x="${center * 0.8}" y="${center * 0.8}" width="${center * 0.9}" height="${center * 0.9}" fill="${c2}" transform="rotate(45, ${center}, ${center})" opacity="0.8"/>
      </svg>
    `;
  }

  // ===========================================
  // TOAST & VIEW NAVIGATION
  // ===========================================

  function showToast(message, type = 'info') {
    const container = $('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function showView(viewId) {
    $$('.mm-view').forEach(v => v.classList.remove('active'));
    const target = $(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo(0, 0);
    }

    // Update bottom nav active state
    $$('.mm-nav-btn').forEach(btn => {
      if (btn.dataset.navView === viewId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // View specific initializations
    if (viewId === 'view-home') {
      renderAssetTab('tokens');
    } else if (viewId === 'view-activity') {
      renderFullActivity();
    } else if (viewId === 'view-networks') {
      renderNetworkList();
    } else if (viewId === 'view-notifications') {
      renderNotifications();
    } else if (viewId === 'view-contacts') {
      renderContacts();
    } else if (viewId === 'view-connected-sites') {
      renderConnectedSites();
    } else if (viewId === 'view-receive') {
      renderReceiveScreen();
    } else if (viewId === 'view-settings-currency') {
      renderCurrencyList();
    } else if (viewId === 'view-settings-language') {
      renderLanguageList();
    }
  }

  // ===========================================
  // THEME MANAGER
  // ===========================================

  function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('apex_theme', theme);
    const html = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', theme);
    }

    $$('.mm-theme-card').forEach(card => {
      if (card.dataset.theme === theme) card.classList.add('active');
      else card.classList.remove('active');
    });
  }

  // ===========================================
  // PROVIDER & NETWORK MANAGEMENT
  // ===========================================

  function getNetworkConfig(key) {
    return PRESET_NETWORKS[key] || customNetworks[key] || PRESET_NETWORKS['sepolia'];
  }

  function setupProvider(netKey) {
    const net = getNetworkConfig(netKey);
    currentNetworkKey = netKey;
    try {
      provider = new ethers.JsonRpcProvider(net.rpc);
    } catch (e) {
      console.warn('Fallback RPC error:', e);
      provider = new ethers.JsonRpcProvider(PRESET_NETWORKS.sepolia.rpc);
    }
    
    // Clear out old network balances to prevent flashing incorrect values
    accountBalances = {};
    tokenBalances = {};
    
    updateNetworkPillUI(net);
    updateDashboardBalanceUI();
    renderAssetTab(currentAssetTab);
    
    refreshBalances();
  }

  function updateNetworkPillUI(net) {
    const dot = $('mm-network-dot');
    if (dot) dot.style.background = net.dotColor || '#F6851B';

    const sel = $('network-select');
    if (sel && sel.value !== net.key) {
      sel.value = net.key;
    }
    const rxNet = $('receive-network-name');
    if (rxNet) rxNet.textContent = net.name;
  }

  function renderNetworkList() {
    const container = $('network-list-container');
    if (!container) return;
    container.innerHTML = '';

    const allNets = { ...PRESET_NETWORKS, ...customNetworks };

    Object.values(allNets).forEach(net => {
      const isActive = net.key === currentNetworkKey;
      const item = document.createElement('div');
      item.className = `mm-network-item ${isActive ? 'active' : ''}`;
      item.innerHTML = `
        <div class="mm-network-item-left">
          <div class="mm-network-chain-icon" style="background:${net.dotColor || '#333'}22;color:${net.dotColor || '#FFF'};">
            <i class="fa-solid fa-network-wired"></i>
          </div>
          <div>
            <div class="mm-network-item-title">${net.name}</div>
            <div class="mm-network-item-rpc">${net.rpc}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="mm-network-badge ${net.isTestnet ? 'testnet' : 'mainnet'}">${net.isTestnet ? 'Testnet' : 'Mainnet'}</span>
          ${isActive ? '<i class="fa-solid fa-check" style="color:var(--mm-orange);"></i>' : ''}
        </div>
      `;
      item.addEventListener('click', () => {
        setupProvider(net.key);
        renderNetworkList();
        pushNotification('network', 'Network Changed', `Switched to ${net.name}`);
        showToast(`Switched to ${net.name}`, 'success');
      });
      container.appendChild(item);
    });
  }

  // ===========================================
  // PRICE INTEGRATION (CoinGecko API)
  // ===========================================

  async function fetchPrices() {
    try {
      const networkTokens = POPULAR_TOKENS[currentNetworkKey] || [];
      const allTokens = [...networkTokens, ...customTokens];
      const symbols = new Set(['ETH']);
      allTokens.forEach(t => symbols.add(t.symbol.toUpperCase()));
      
      const idsToFetch = [];
      const idToSymbol = {};
      
      symbols.forEach(sym => {
        const id = COINGECKO_IDS[sym];
        if (id) {
          idsToFetch.push(id);
          idToSymbol[id] = sym;
        }
      });
      
      if (idsToFetch.length === 0) idsToFetch.push('ethereum');
      
      const idsStr = idsToFetch.join(',');
      const url = `${COINGECKO_BASE}/coins/markets?vs_currency=${selectedCurrency.toLowerCase()}&ids=${idsStr}&sparkline=true&x_cg_demo_api_key=${COINGECKO_API_KEY}`;
      
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      
      data.forEach(coin => {
        const cgId = coin.id;
        const sym = idToSymbol[cgId];
        if (sym) {
          tokenPricesData[sym] = {
            price: coin.current_price || 0,
            change24h: coin.price_change_percentage_24h || 0,
            sparkline: coin.sparkline_in_7d?.price || []
          };
        }
        
        // Always store ETH fallback
        if (cgId === 'ethereum') {
          ethPriceUsd = coin.current_price || 0;
          ethChange24h = coin.price_change_percentage_24h || 0;
        }
      });
      
      updatePriceDisplayUI();
      if (currentAssetTab === 'tokens') renderTokensList();
    } catch (e) {
      console.warn('CoinGecko price fetch warning:', e);
    }
  }

  function updatePriceDisplayUI() {
    const livePriceEl = $('mm-eth-price-live');
    if (livePriceEl && ethPriceUsd) {
      livePriceEl.textContent = `$${ethPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }

    const tickerEl = $('eth-price-ticker');
    if (tickerEl && ethPriceUsd) {
      tickerEl.textContent = `$${ethPriceUsd.toFixed(2)} USD`;
    }

    updateDashboardBalanceUI();
  }

  function updateDashboardBalanceUI() {
    const netConfig = getNetworkConfig(currentNetworkKey);
    const nativeSymbol = netConfig.symbol || 'ETH';
    let nativeName = 'Ethereum';
    if (nativeSymbol === 'MATIC') nativeName = 'Polygon';
    else if (nativeSymbol === 'BNB') nativeName = 'BNB';
    else if (nativeSymbol === 'AVAX') nativeName = 'Avalanche';

    const balETH = parseFloat(accountBalances[activeAddress.toLowerCase()] || 0);
    const ethDisplay = $('dash-eth-balance');
    if (ethDisplay) ethDisplay.textContent = balETH.toFixed(4);

    const balanceUnit = $('dash-balance-unit');
    if (balanceUnit) balanceUnit.textContent = nativeSymbol;

    const usdDisplay = $('dash-usd-balance');
    if (usdDisplay) {
      let totalFiatVal = 0;
      if (ethPriceUsd) {
        totalFiatVal += balETH * ethPriceUsd;
      }
      
      const networkTokens = POPULAR_TOKENS[currentNetworkKey] || [];
      const allTokens = [...networkTokens, ...customTokens];
      allTokens.forEach(t => {
        const balStr = tokenBalances[t.symbol] || '0.0000';
        const bal = parseFloat(balStr);
        const priceData = tokenPricesData[t.symbol.toUpperCase()];
        if (priceData && priceData.usd && bal > 0) {
          totalFiatVal += bal * priceData.usd;
        }
      });

      usdDisplay.textContent = `$${totalFiatVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }

    // Token page native row
    const tokEth = $('token-eth-amount');
    if (tokEth) tokEth.textContent = balETH.toFixed(4);

    const nativeNameEl = $('token-native-name');
    if (nativeNameEl) nativeNameEl.textContent = nativeName;

    const nativeSymbolEl = $('token-native-symbol');
    if (nativeSymbolEl) nativeSymbolEl.textContent = nativeSymbol;

    const nativeChangeEl = $('token-native-change');
    if (nativeChangeEl) {
      if (ethChange24h !== null && ethChange24h !== undefined) {
        const isPos = ethChange24h >= 0;
        nativeChangeEl.textContent = `${isPos ? '+' : ''}${ethChange24h.toFixed(2)}%`;
        nativeChangeEl.className = `mm-token-change ${isPos ? 'positive' : 'negative'}`;
      } else {
        nativeChangeEl.textContent = '0.00%';
        nativeChangeEl.className = 'mm-token-change neutral';
      }
    }

    const tokUsd = $('token-eth-usd');
    if (tokUsd && ethPriceUsd) {
      tokUsd.textContent = `$${(balETH * ethPriceUsd).toFixed(2)}`;
    }
  }

  // ===========================================
  // MULTI-ACCOUNT & WALLET MANAGEMENT
  // ===========================================

  function loadSavedWallet() {
    const savedMaster = localStorage.getItem('apex_master_password');
    if (savedMaster) masterPassword = savedMaster;

    const savedAccounts = localStorage.getItem('apex_accounts');
    if (savedAccounts) {
      try { accounts = JSON.parse(savedAccounts); } catch (e) { accounts = []; }
    }

    const savedActive = localStorage.getItem('apex_active_address');
    if (savedActive) activeAddress = savedActive;

    const savedMnemonic = localStorage.getItem('apex_seed_phrase');
    if (savedMnemonic) seedPhrase = savedMnemonic;

    const savedTokens = localStorage.getItem('apex_custom_tokens');
    if (savedTokens) { try { customTokens = JSON.parse(savedTokens); } catch (e) { customTokens = []; } }

    const savedContacts = localStorage.getItem('apex_contacts');
    if (savedContacts) { try { contacts = JSON.parse(savedContacts); } catch (e) { contacts = []; } }

    const savedSites = localStorage.getItem('apex_connected_sites');
    if (savedSites) { try { connectedSites = JSON.parse(savedSites); } catch (e) { connectedSites = []; } }
    else { connectedSites = [...DEMO_CONNECTED_SITES]; localStorage.setItem('apex_connected_sites', JSON.stringify(connectedSites)); }

    const savedNotifs = localStorage.getItem('apex_notifications');
    if (savedNotifs) { try { notifications = JSON.parse(savedNotifs); } catch (e) { notifications = []; } }

    if (accounts.length === 0) {
      // Create initial HD Account 1
      const wallet = ethers.Wallet.createRandom();
      seedPhrase = wallet.mnemonic.phrase;
      accounts.push({
        id: 1,
        name: 'Account 1',
        address: wallet.address,
        privateKey: wallet.privateKey,
        isHD: true,
        hdIndex: 0
      });
      activeAddress = wallet.address;
      localStorage.setItem('apex_seed_phrase', seedPhrase);
      localStorage.setItem('apex_accounts', JSON.stringify(accounts));
      localStorage.setItem('apex_active_address', activeAddress);
    }

    const currAcc = accounts.find(a => a.address.toLowerCase() === activeAddress.toLowerCase()) || accounts[0];
    if (currAcc) {
      activeAddress = currAcc.address;
      activeWallet = new ethers.Wallet(currAcc.privateKey, provider);
      updateHeaderUI(currAcc);
    }
  }

  function updateHeaderUI(account) {
    const nameLabel = $('mm-account-name-label');
    if (nameLabel) nameLabel.textContent = account.name || 'Account 1';

    const avatar = $('header-account-avatar');
    if (avatar) avatar.innerHTML = generateJazzicon(account.address, 28);

    const dashAddr = $('dash-wallet-address');
    if (dashAddr) dashAddr.textContent = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;

    const sendFromAddr = $('send-sender-address');
    if (sendFromAddr) sendFromAddr.textContent = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;

    const sendFromName = $('send-from-name');
    if (sendFromName) sendFromName.textContent = account.name;

    const sendFromAv = $('send-from-avatar');
    if (sendFromAv) sendFromAv.innerHTML = generateJazzicon(account.address, 32);

    const rxName = $('receive-acc-name');
    if (rxName) rxName.textContent = account.name;

    const rxAv = $('receive-avatar');
    if (rxAv) rxAv.innerHTML = generateJazzicon(account.address, 36);
  }

  function switchActiveAccount(address) {
    const acc = accounts.find(a => a.address.toLowerCase() === address.toLowerCase());
    if (!acc) return;
    activeAddress = acc.address;
    activeWallet = new ethers.Wallet(acc.privateKey, provider);
    localStorage.setItem('apex_active_address', activeAddress);
    updateHeaderUI(acc);
    refreshBalances();
    showToast(`Switched to ${acc.name}`, 'info');
  }

  function renderAccountsDrawer() {
    const container = $('drawer-accounts-list');
    if (!container) return;
    container.innerHTML = '';

    accounts.forEach(acc => {
      const isActive = acc.address.toLowerCase() === activeAddress.toLowerCase();
      const bal = accountBalances[acc.address.toLowerCase()] || '0.0000';

      const row = document.createElement('div');
      row.className = `mm-drawer-account-item ${isActive ? 'active' : ''}`;
      row.innerHTML = `
        <div class="mm-drawer-acc-left">
          ${generateJazzicon(acc.address, 36)}
          <div class="mm-drawer-acc-info">
            <div class="mm-drawer-acc-name">${acc.name} ${acc.isHD ? '' : '<span class="mm-imported-badge">Imported</span>'}</div>
            <div class="mm-drawer-acc-addr">${acc.address.slice(0, 6)}...${acc.address.slice(-4)}</div>
          </div>
        </div>
        <div class="mm-drawer-acc-right">
          <div class="mm-drawer-acc-bal">${parseFloat(bal).toFixed(4)} ETH</div>
          <div class="mm-drawer-acc-actions">
            <button class="mm-icon-btn btn-acc-options" data-address="${acc.address}"><i class="fa-solid fa-ellipsis-vertical"></i></button>
            ${!acc.isHD ? `<button class="mm-icon-btn btn-acc-delete" data-address="${acc.address}" title="Remove account"><i class="fa-solid fa-trash-can"></i></button>` : ''}
          </div>
        </div>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.mm-icon-btn')) return;
        switchActiveAccount(acc.address);
        closeDrawer();
      });

      row.querySelector('.btn-acc-options')?.addEventListener('click', () => {
        renameTargetAddress = acc.address;
        openAccountDetailsModal(acc);
      });

      row.querySelector('.btn-acc-delete')?.addEventListener('click', () => {
        if (confirm(`Remove imported account "${acc.name}"?`)) {
          accounts = accounts.filter(a => a.address.toLowerCase() !== acc.address.toLowerCase());
          localStorage.setItem('apex_accounts', JSON.stringify(accounts));
          if (activeAddress.toLowerCase() === acc.address.toLowerCase()) {
            switchActiveAccount(accounts[0].address);
          }
          renderAccountsDrawer();
          showToast('Account removed', 'info');
        }
      });

      container.appendChild(row);
    });
  }

  function handleCreateNewHDAccount() {
    if (!seedPhrase) {
      showToast('No seed phrase found', 'error');
      return;
    }
    const hdCount = accounts.filter(a => a.isHD).length;
    const hdNode = ethers.HDNodeWallet.fromPhrase(seedPhrase);
    const childWallet = hdNode.derivePath(`m/44'/60'/0'/0/${hdCount}`);

    const newAcc = {
      id: accounts.length + 1,
      name: `Account ${hdCount + 1}`,
      address: childWallet.address,
      privateKey: childWallet.privateKey,
      isHD: true,
      hdIndex: hdCount
    };

    accounts.push(newAcc);
    localStorage.setItem('apex_accounts', JSON.stringify(accounts));
    switchActiveAccount(newAcc.address);
    renderAccountsDrawer();
    pushNotification('account', 'Account Created', `Created ${newAcc.name}`);
    showToast(`Created ${newAcc.name}`, 'success');
  }

  function handleImportAccPrivKey() {
    const keyInput = $('input-import-acc-privkey');
    const pk = keyInput?.value?.trim();
    if (!pk) { showToast('Enter a private key', 'error'); return; }

    try {
      const wallet = new ethers.Wallet(pk);
      const exists = accounts.some(a => a.address.toLowerCase() === wallet.address.toLowerCase());
      if (exists) { showToast('Account already imported', 'error'); return; }

      const newAcc = {
        id: accounts.length + 1,
        name: `Imported ${accounts.filter(a => !a.isHD).length + 1}`,
        address: wallet.address,
        privateKey: wallet.privateKey,
        isHD: false
      };

      accounts.push(newAcc);
      localStorage.setItem('apex_accounts', JSON.stringify(accounts));
      switchActiveAccount(newAcc.address);
      renderAccountsDrawer();
      if (keyInput) keyInput.value = '';
      $('import-acc-modal')?.classList.add('hidden');
      pushNotification('account', 'Account Imported', `Imported ${newAcc.name}`);
      showToast('Account imported successfully!', 'success');
    } catch (e) {
      showToast('Invalid private key format', 'error');
    }
  }

  function openAccountDetailsModal(acc) {
    const modal = $('account-details-modal');
    if (!modal) return;

    $('modal-acc-name').textContent = acc.name;
    $('modal-acc-avatar').innerHTML = generateJazzicon(acc.address, 48);
    $('modal-qr-address').textContent = acc.address;
    $('input-rename-acc-name').value = acc.name;

    const net = getNetworkConfig(currentNetworkKey);
    const expLink = $('tx-explorer-link');
    if (expLink) expLink.href = `${net.explorer}/address/${acc.address}`;

    const qrContainer = $('modal-qr-container');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      new QRCode(qrContainer, { text: acc.address, width: 140, height: 140 });
    }

    modal.classList.remove('hidden');
  }

  // ===========================================
  // BALANCES & REFRESH
  // ===========================================

  async function refreshBalances() {
    if (!provider || accounts.length === 0) return;

    const refreshBtn = $('btn-refresh-balance');
    if (refreshBtn) refreshBtn.querySelector('i')?.classList.add('fa-spin');

    for (const acc of accounts) {
      try {
        const bal = await provider.getBalance(acc.address);
        accountBalances[acc.address.toLowerCase()] = ethers.formatEther(bal);
      } catch (e) {
        accountBalances[acc.address.toLowerCase()] = '0.0000';
      }
    }

    // Refresh block & gas stats
    try {
      const blockNum = await provider.getBlockNumber();
      const latestBlock = $('dash-latest-block');
      if (latestBlock) latestBlock.textContent = `#${blockNum}`;

      const feeData = await provider.getFeeData();
      const gasPriceEl = $('dash-gas-price');
      if (gasPriceEl && feeData.gasPrice) {
        gasPriceEl.textContent = Math.round(parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei')));
      }
    } catch (e) {}

    updateDashboardBalanceUI();
    renderAssetTab(currentAssetTab);

    if (refreshBtn) {
      setTimeout(() => refreshBtn.querySelector('i')?.classList.remove('fa-spin'), 600);
    }
  }

  // ===========================================
  // ASSETS & ERC-20 TOKENS (Phase 5)
  // ===========================================

  function renderAssetTab(tabName) {
    currentAssetTab = tabName;
    $$('.mm-asset-tab').forEach(t => {
      if (t.dataset.assetTab === tabName) t.classList.add('active');
      else t.classList.remove('active');
    });

    $$('.mm-asset-panel').forEach(p => p.classList.remove('active'));
    const activePanel = $(`asset-panel-${tabName}`);
    if (activePanel) activePanel.classList.add('active');

    if (tabName === 'tokens') renderTokensList();
    if (tabName === 'activity') renderMiniActivity();
  }

  function renderMiniActivity() {
    const container = $('mm-activity-list');
    if (!container) return;
    
    // Clear the container
    container.innerHTML = '';
    
    const accountTxs = txHistory.filter(tx => 
      tx.accountAddress.toLowerCase() === activeAddress.toLowerCase() &&
      tx.network === currentNetworkKey
    );
    
    if (accountTxs.length === 0) {
      container.innerHTML = `
        <div class="mm-empty-state" id="mm-activity-empty">
          <div class="mm-empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
          <p>No transactions yet</p>
          <small>Your activity will appear here</small>
        </div>
      `;
      return;
    }
    
    // Show only the 5 most recent transactions in the mini view
    const recentTxs = accountTxs.slice(0, 5);
    
    recentTxs.forEach(tx => {
      const isSend = tx.type === 'send';
      const item = document.createElement('div');
      item.className = 'mm-activity-item';
      item.innerHTML = `
        <div class="mm-activity-icon ${isSend ? 'send' : 'receive'}">
          <i class="fa-solid ${isSend ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
        </div>
        <div class="mm-activity-info">
          <div class="mm-activity-type">${isSend ? 'Send' : 'Receive'}</div>
          <div class="mm-activity-date">${new Date(tx.timestamp).toLocaleDateString()}</div>
        </div>
        <div class="mm-activity-amount ${isSend ? 'send' : 'receive'}">${isSend ? '-' : '+'}${tx.amount} ETH</div>
      `;
      
      item.addEventListener('click', () => {
        openTxDetailModal(tx);
      });
      
      container.appendChild(item);
    });
  }

  function renderTokensList() {
    const container = $('erc20-token-list');
    if (!container) return;
    container.innerHTML = '';

    const searchQ = $('token-search-input')?.value?.trim().toLowerCase() || '';
    const networkTokens = POPULAR_TOKENS[currentNetworkKey] || [];
    const allTokens = [...networkTokens, ...customTokens];

    let filtered = allTokens.filter(t => {
      if (searchQ && !t.name.toLowerCase().includes(searchQ) && !t.symbol.toLowerCase().includes(searchQ)) return false;
      
      const balStr = tokenBalances[t.symbol] || '0.0000';
      const bal = parseFloat(balStr);
      if (hideZeroBalances && bal === 0) return false;
      
      return true;
    });

    // Sort tokens
    filtered.sort((a, b) => {
      if (tokenSortMethod === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    function generateSparklineSvg(data, isPositive) {
      if (!data || data.length < 2) return '';
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;
      
      const width = 60;
      const height = 20;
      
      const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
      }).join(' ');
      
      const color = isPositive ? 'var(--mm-green)' : 'var(--mm-red)';
      return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="margin-left: 8px; flex-shrink: 0;">
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>`;
    }

      filtered.forEach(tok => {
      const logoUrl = TOKEN_LOGOS[tok.symbol] || 'https://assets.coingecko.com/coins/images/279/small/ethereum.png';
      const balStr = tokenBalances[tok.symbol] || '0.0000';
      const priceData = tokenPricesData[tok.symbol.toUpperCase()];
      let usdVal = '$0.00';
      let changeHtml = '';
      let sparklineHtml = '';
      if (priceData && priceData.price) {
        const fiatBal = parseFloat(balStr) * priceData.price;
        usdVal = `$${fiatBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        if (priceData.change24h !== undefined) {
          const isPos = priceData.change24h >= 0;
          changeHtml = `<span style="font-size: 11px; color: ${isPos ? 'var(--mm-green)' : 'var(--mm-red)'}; margin-left: 6px;">${isPos ? '+' : ''}${priceData.change24h.toFixed(2)}%</span>`;
          sparklineHtml = generateSparklineSvg(priceData.sparkline, isPos);
        }
      }

      const row = document.createElement('div');
      row.className = 'mm-token-item';
      row.innerHTML = `
        <div class="mm-token-logo"><img src="${logoUrl}" alt="${tok.symbol}" onerror="this.src='https://assets.coingecko.com/coins/images/279/small/ethereum.png'"></div>
        <div class="mm-token-info" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="flex: 1;">
            <div class="mm-token-name">${tok.name} ${changeHtml}</div>
            <div class="mm-token-amount">${balStr} ${tok.symbol}</div>
          </div>
          ${sparklineHtml}
        </div>
        <div class="mm-token-value">
          <div class="mm-token-usd">${usdVal}</div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  // ===========================================
  // TRANSACTIONS & ACTIVITY (Phase 6)
  // ===========================================

  function loadTxHistory() {
    const saved = localStorage.getItem('apex_tx_history');
    if (saved) {
      try { txHistory = JSON.parse(saved); } catch (e) { txHistory = []; }
    }
  }

  function saveTxHistory() {
    localStorage.setItem('apex_tx_history', JSON.stringify(txHistory));
  }

  function renderFullActivity() {
    const container = $('full-activity-list');
    if (!container) return;
    container.innerHTML = '';

    const searchQ = $('activity-search')?.value?.trim().toLowerCase() || '';
    const activeFilter = document.querySelector('.mm-chip.active')?.dataset.activityFilter || 'all';

    let filtered = txHistory.filter(tx => {
      if (tx.accountAddress.toLowerCase() !== activeAddress.toLowerCase()) return false;
      if (tx.network !== currentNetworkKey) return false;
      if (activeFilter === 'send' && tx.type !== 'send') return false;
      if (activeFilter === 'receive' && tx.type !== 'receive') return false;
      if (activeFilter === 'pending' && tx.status !== 'pending') return false;
      if (activeFilter === 'failed' && tx.status !== 'failed') return false;
      if (searchQ && !tx.hash.toLowerCase().includes(searchQ) && !tx.to.toLowerCase().includes(searchQ)) return false;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="mm-empty-state">
          <div class="mm-empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
          <p>No transactions found</p>
          <small>Transactions for active account will appear here</small>
        </div>
      `;
      return;
    }

    filtered.forEach(tx => {
      const isSend = tx.type === 'send';
      const item = document.createElement('div');
      item.className = 'mm-activity-item';
      item.innerHTML = `
        <div class="mm-activity-icon ${isSend ? 'send' : 'receive'}">
          <i class="fa-solid ${isSend ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
        </div>
        <div class="mm-activity-info">
          <div class="mm-activity-type">${isSend ? 'Send' : 'Receive'}</div>
          <div class="mm-activity-date">${new Date(tx.timestamp).toLocaleString()}</div>
        </div>
        <div>
          <div class="mm-activity-amount ${isSend ? 'send' : 'receive'}">${isSend ? '-' : '+'}${tx.amount} ETH</div>
          <span class="mm-activity-status ${tx.status}">${tx.status}</span>
        </div>
      `;
      item.addEventListener('click', () => openTxDetailModal(tx));
      container.appendChild(item);
    });
  }

  function openTxDetailModal(tx) {
    const modal = $('tx-detail-modal');
    const body = $('tx-detail-body');
    if (!modal || !body) return;

    const net = getNetworkConfig(tx.network || currentNetworkKey);
    body.innerHTML = `
      <div class="mm-settings-card">
        <div class="mm-about-row"><span>Status</span><span class="mm-activity-status ${tx.status}">${tx.status}</span></div>
        <div class="mm-about-row"><span>Type</span><span>${tx.type.toUpperCase()}</span></div>
        <div class="mm-about-row"><span>Amount</span><span>${tx.amount} ETH</span></div>
        <div class="mm-about-row"><span>From</span><span class="mm-mono-sm">${tx.from.slice(0, 8)}...${tx.from.slice(-6)}</span></div>
        <div class="mm-about-row"><span>To</span><span class="mm-mono-sm">${tx.to.slice(0, 8)}...${tx.to.slice(-6)}</span></div>
        <div class="mm-about-row"><span>Gas Fee</span><span>~${tx.gasFee || '0.0001'} ETH</span></div>
        <div class="mm-about-row"><span>Block</span><span>#${tx.blockNumber || 'Pending'}</span></div>
        <div class="mm-about-row"><span>Hash</span><span class="mm-mono-sm">${tx.hash.slice(0, 10)}...</span></div>
      </div>
      <a href="${net.explorer}/tx/${tx.hash}" target="_blank" class="mm-btn mm-btn-primary full-width" style="margin-top:12px;">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> View on Explorer
      </a>
    `;

    modal.classList.remove('hidden');
  }

  async function handleSendTransaction(isSimulated = false) {
    const recipient = $('send-recipient')?.value?.trim();
    const amount = $('send-amount')?.value?.trim();

    if (!recipient || !ethers.isAddress(recipient)) {
      showToast('Enter a valid Ethereum address', 'error');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }

    if (isSimulated) {
      showToast('Simulation successful! Gas ~0.0001 ETH', 'success');
      return;
    }

    try {
      showToast('Sending transaction...', 'info');
      const tx = await activeWallet.sendTransaction({
        to: recipient,
        value: ethers.parseEther(amount)
      });

      const newTx = {
        hash: tx.hash,
        type: 'send',
        from: activeAddress,
        to: recipient,
        amount: amount,
        accountAddress: activeAddress,
        timestamp: Date.now(),
        status: 'confirmed',
        gasFee: '0.0001',
        blockNumber: 1234567,
        network: currentNetworkKey
      };

      txHistory.unshift(newTx);
      saveTxHistory();

      const box = $('tx-result-box');
      const link = $('tx-hash-link');
      if (box && link) {
        const net = getNetworkConfig(currentNetworkKey);
        link.href = `${net.explorer}/tx/${tx.hash}`;
        box.classList.remove('hidden');
      }

      pushNotification('tx', 'Transaction Sent', `Sent ${amount} ETH to ${recipient.slice(0, 6)}...`);
      showToast('Transaction confirmed!', 'success');
      refreshBalances();
    } catch (e) {
      showToast(e.message || 'Transaction failed', 'error');
    }
  }

  // ===========================================
  // RECEIVE SCREEN (Phase 8)
  // ===========================================

  function renderReceiveScreen() {
    const qrContainer = $('qrcode-container');
    if (!qrContainer) return;
    qrContainer.innerHTML = '';

    qrCodeInstance = new QRCode(qrContainer, {
      text: activeAddress,
      width: 180,
      height: 180,
      colorDark: '#000000',
      colorLight: '#ffffff'
    });

    const recentList = $('receive-recent-list');
    if (!recentList) return;

    const receives = txHistory.filter(t => t.to.toLowerCase() === activeAddress.toLowerCase());
    if (receives.length === 0) {
      recentList.innerHTML = `<div class="mm-empty-state" style="padding:20px;"><div class="mm-empty-icon"><i class="fa-solid fa-inbox"></i></div><p>No incoming transactions</p></div>`;
    } else {
      recentList.innerHTML = receives.slice(0, 3).map(r => `
        <div class="mm-activity-item">
          <div class="mm-activity-icon receive"><i class="fa-solid fa-arrow-down"></i></div>
          <div class="mm-activity-info">
            <div class="mm-activity-type">Received ETH</div>
            <div class="mm-activity-date">${new Date(r.timestamp).toLocaleDateString()}</div>
          </div>
          <div class="mm-activity-amount receive">+${r.amount} ETH</div>
        </div>
      `).join('');
    }
  }

  function downloadQRCode() {
    const img = $('qrcode-container')?.querySelector('img') || $('qrcode-container')?.querySelector('canvas');
    if (!img) return;
    const link = document.createElement('a');
    link.download = `apex-qr-${activeAddress.slice(0,6)}.png`;
    link.href = img.src || img.toDataURL('image/png');
    link.click();
    showToast('QR Code downloaded', 'success');
  }

  // ===========================================
  // ADDRESS BOOK / CONTACTS (Phase 9)
  // ===========================================

  function renderContacts() {
    const container = $('contacts-list');
    if (!container) return;
    container.innerHTML = '';

    const searchQ = $('contacts-search')?.value?.trim().toLowerCase() || '';
    const activeChip = document.querySelector('.mm-chip[data-contacts-filter].active')?.dataset.contactsFilter || 'all';

    let filtered = contacts.filter(c => {
      if (activeChip === 'starred' && !c.isStarred) return false;
      if (searchQ && !c.name.toLowerCase().includes(searchQ) && !c.address.toLowerCase().includes(searchQ)) return false;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="mm-empty-state"><div class="mm-empty-icon"><i class="fa-solid fa-address-book"></i></div><p>No contacts found</p></div>`;
      return;
    }

    filtered.forEach(c => {
      const card = document.createElement('div');
      card.className = 'mm-contact-card';
      card.innerHTML = `
        <div class="mm-contact-avatar">${generateJazzicon(c.address, 36)}</div>
        <div class="mm-contact-info">
          <div class="mm-contact-name">${c.name}</div>
          <div class="mm-contact-addr">${c.address.slice(0, 6)}...${c.address.slice(-4)}</div>
          ${c.note ? `<div class="mm-contact-note">${c.note}</div>` : ''}
        </div>
        <div class="mm-contact-actions">
          <button class="mm-star-btn ${c.isStarred ? 'starred' : ''}" data-id="${c.id}"><i class="fa-solid fa-star"></i></button>
          <button class="mm-icon-btn btn-edit-contact" data-id="${c.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="mm-icon-btn btn-delete-contact" data-id="${c.id}"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;

      card.querySelector('.mm-star-btn')?.addEventListener('click', () => {
        c.isStarred = !c.isStarred;
        localStorage.setItem('apex_contacts', JSON.stringify(contacts));
        renderContacts();
      });

      card.querySelector('.btn-delete-contact')?.addEventListener('click', () => {
        contacts = contacts.filter(item => item.id !== c.id);
        localStorage.setItem('apex_contacts', JSON.stringify(contacts));
        renderContacts();
        showToast('Contact deleted', 'info');
      });

      container.appendChild(card);
    });
  }

  // ===========================================
  // CONNECTED SITES (Phase 10)
  // ===========================================

  function renderConnectedSites() {
    const container = $('connected-sites-list');
    if (!container) return;
    container.innerHTML = '';

    const searchQ = $('sites-search')?.value?.trim().toLowerCase() || '';

    let filtered = connectedSites.filter(s => {
      if (searchQ && !s.domain.toLowerCase().includes(searchQ) && !s.name.toLowerCase().includes(searchQ)) return false;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="mm-empty-state"><div class="mm-empty-icon"><i class="fa-solid fa-plug-circle-xmark"></i></div><p>No connected sites</p></div>`;
      return;
    }

    filtered.forEach(s => {
      const card = document.createElement('div');
      card.className = 'mm-site-card';
      card.innerHTML = `
        <div class="mm-site-favicon">${s.name.slice(0, 1)}</div>
        <div class="mm-site-info">
          <div class="mm-site-domain">${s.domain}</div>
          <div class="mm-site-perms">${s.permissions.join(' · ')}</div>
        </div>
        <button class="mm-btn mm-btn-ghost mm-btn-danger-icon btn-disconnect-site" data-domain="${s.domain}">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      card.querySelector('.btn-disconnect-site')?.addEventListener('click', () => {
        connectedSites = connectedSites.filter(item => item.domain !== s.domain);
        localStorage.setItem('apex_connected_sites', JSON.stringify(connectedSites));
        renderConnectedSites();
        showToast(`Disconnected ${s.domain}`, 'info');
      });

      container.appendChild(card);
    });
  }

  // ===========================================
  // NOTIFICATION CENTER (Phase 11)
  // ===========================================

  function pushNotification(type, title, desc) {
    const newNotif = {
      id: Date.now(),
      type,
      title,
      desc,
      timestamp: Date.now(),
      read: false
    };
    notifications.unshift(newNotif);
    localStorage.setItem('apex_notifications', JSON.stringify(notifications));
    updateNotifBadgeUI();
  }

  function updateNotifBadgeUI() {
    const badge = $('notif-badge');
    const unreadCount = notifications.filter(n => !n.read).length;
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  function renderNotifications() {
    const container = $('notification-list');
    if (!container) return;
    container.innerHTML = '';

    if (notifications.length === 0) {
      container.innerHTML = `<div class="mm-empty-state"><div class="mm-empty-icon"><i class="fa-regular fa-bell-slash"></i></div><p>No notifications</p></div>`;
      return;
    }

    notifications.forEach(n => {
      const item = document.createElement('div');
      item.className = `mm-notif-item ${n.read ? '' : 'unread'}`;
      item.innerHTML = `
        <div class="mm-notif-icon"><i class="fa-solid fa-bell"></i></div>
        <div class="mm-notif-info">
          <div class="mm-notif-title">${n.title}</div>
          <div class="mm-notif-desc">${n.desc}</div>
          <div class="mm-notif-time">${new Date(n.timestamp).toLocaleTimeString()}</div>
        </div>
        ${n.read ? '' : '<div class="mm-notif-unread-dot"></div>'}
      `;
      container.appendChild(item);
    });
  }

  // ===========================================
  // CURRENCY & LANGUAGE LIST RENDERING
  // ===========================================

  function renderCurrencyList() {
    const container = $('currency-list');
    if (!container) return;
    container.innerHTML = '';

    FIAT_CURRENCIES.forEach(c => {
      const isActive = c.code === selectedCurrency;
      const item = document.createElement('div');
      item.className = `mm-currency-item ${isActive ? 'active' : ''}`;
      item.innerHTML = `
        <div>
          <span class="mm-curr-code">${c.code}</span>
          <span class="mm-curr-name"> — ${c.name}</span>
        </div>
        <span class="mm-curr-symbol">${c.symbol}</span>
      `;
      item.addEventListener('click', () => {
        selectedCurrency = c.code;
        saveSettings();
        const disp = $('selected-currency-display');
        if (disp) disp.textContent = c.code;
        renderCurrencyList();
        showToast(`Currency set to ${c.code}`, 'success');
      });
      container.appendChild(item);
    });
  }

  function renderLanguageList() {
    const container = $('language-list');
    if (!container) return;
    container.innerHTML = '';

    LANGUAGES.forEach(l => {
      const isActive = l.code === selectedLanguage;
      const item = document.createElement('div');
      item.className = `mm-language-item ${isActive ? 'active' : ''}`;
      item.innerHTML = `
        <div>
          <span style="font-weight:600;">${l.name}</span>
          <span style="font-size:12px;color:var(--text-muted);"> (${l.nativeName})</span>
        </div>
        ${isActive ? '<i class="fa-solid fa-check" style="color:var(--mm-orange);"></i>' : ''}
      `;
      item.addEventListener('click', () => {
        selectedLanguage = l.code;
        saveSettings();
        const disp = $('selected-language-display');
        if (disp) disp.textContent = l.name;
        renderLanguageList();
        showToast(`Language changed to ${l.name}`, 'success');
      });
      container.appendChild(item);
    });
  }

  // ===========================================
  // SECURITY MODULE (Auto-Lock, SRP, PK)
  // ===========================================

  function lockWallet() {
    isLocked = true;
    $('lock-screen-overlay')?.classList.remove('hidden');
  }

  function unlockWallet() {
    const input = $('input-unlock-password');
    const entered = input?.value?.trim();
    if (masterPassword && entered !== masterPassword) {
      showToast('Incorrect password', 'error');
      return;
    }
    isLocked = false;
    if (input) input.value = '';
    $('lock-screen-overlay')?.classList.add('hidden');
    showToast('Wallet unlocked', 'success');
  }

  function setupHoldToReveal(btn, bar, textEl, passInput, onSuccess) {
    if (!btn) return;
    let timer = null;

    btn.addEventListener('mousedown', startHold);
    btn.addEventListener('touchstart', startHold);
    btn.addEventListener('mouseup', cancelHold);
    btn.addEventListener('mouseleave', cancelHold);
    btn.addEventListener('touchend', cancelHold);

    function startHold(e) {
      if (passInput) {
        const pass = passInput.value.trim();
        if (masterPassword && pass !== masterPassword) {
          showToast('Enter correct password first', 'error');
          return;
        }
      }
      btn.classList.add('holding');
      if (textEl) textEl.textContent = 'Hold for 3 seconds...';
      timer = setTimeout(() => {
        cancelHold();
        onSuccess();
      }, 3000);
      fetchPrices();
      refreshBalances();
      if (balanceInterval) clearInterval(balanceInterval);
      balanceInterval = setInterval(() => {
        refreshBalances();
        fetchPrices();
      }, 15000);
    }

    function cancelHold() {
      btn.classList.remove('holding');
      if (textEl) textEl.textContent = 'Hold to reveal';
      if (timer) clearTimeout(timer);
    }
  }

  function revealSRP() {
    const grid = $('srp-secure-grid');
    const box = $('srp-revealed-box');
    if (!grid || !box) return;

    const words = seedPhrase.split(' ');
    grid.innerHTML = words.map((w, i) => `<div class="mm-word-chip"><span class="num">${i+1}</span> ${w}</div>`).join('');
    box.classList.remove('hidden');

    let count = 30;
    const numEl = $('srp-timer-num');
    const timerInt = setInterval(() => {
      count--;
      if (numEl) numEl.textContent = count;
      if (count <= 0) {
        clearInterval(timerInt);
        box.classList.add('hidden');
      }
    }, 1000);
  }

  function revealPK() {
    const box = $('pk-revealed-box');
    const inp = $('input-pk-secure-val');
    const acc = accounts.find(a => a.address.toLowerCase() === activeAddress.toLowerCase());

    if (inp && acc) inp.value = acc.privateKey;
    if (box) box.classList.remove('hidden');

    let count = 30;
    const numEl = $('pk-timer-num');
    const timerInt = setInterval(() => {
      count--;
      if (numEl) numEl.textContent = count;
      if (count <= 0) {
        clearInterval(timerInt);
        if (box) box.classList.add('hidden');
      }
    }, 1000);
  }

  // Copy helpers
  function copyToClipboard(text, msg) {
    navigator.clipboard.writeText(text);
    showToast(msg || 'Copied to clipboard!', 'success');
  }

  function closeDrawer() {
    $('accounts-drawer')?.classList.add('hidden');
  }

  // ===========================================
  // EVENT BINDINGS
  // ===========================================

  function setupEventListeners() {
    // Navigation listeners
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-nav-view], [data-target-view]');
      if (btn) {
        const viewId = btn.dataset.navView || btn.getAttribute('data-target-view');
        if (viewId) showView(viewId);
      }
    });

    // Network select header
    $('network-select')?.addEventListener('change', (e) => {
      currentNetworkKey = e.target.value;
      localStorage.setItem('apex_network', currentNetworkKey);
      setupProvider(currentNetworkKey);
      updateNetworkPillUI();
      fetchPrices();
    });

    // Options dropdown
    $('btn-options-menu')?.addEventListener('click', () => {
      $('options-dropdown')?.classList.toggle('hidden');
    });

    $('btn-toggle-hide-zero')?.addEventListener('click', () => {
      hideZeroBalances = !hideZeroBalances;
      saveSettings();
      renderTokensList();
      showToast(hideZeroBalances ? 'Zero balances hidden' : 'Showing all balances', 'info');
    });

    $('select-autolock-time')?.addEventListener('change', (e) => {
      autoLockMinutes = e.target.value;
      saveSettings();
      showToast(`Auto-lock set to ${autoLockMinutes} minutes`, 'success');
    });

    // Accounts Drawer Setup
    $('drawer-btn-create-acc')?.addEventListener('click', handleCreateNewHDAccount);
    
    $('drawer-btn-import-acc')?.addEventListener('click', () => {
      $('import-acc-modal')?.classList.remove('hidden');
      $('accounts-drawer')?.classList.add('hidden');
    });
    
    $('btn-close-import-modal')?.addEventListener('click', () => {
      $('import-acc-modal')?.classList.add('hidden');
    });
    
    $('btn-submit-import-acc')?.addEventListener('click', handleImportAccPrivKey);

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#btn-options-menu') && !e.target.closest('#options-dropdown')) {
        $('options-dropdown')?.classList.add('hidden');
      }
    });

    $('opt-account-details')?.addEventListener('click', () => {
      $('options-dropdown')?.classList.add('hidden');
      const acc = accounts.find(a => a.address.toLowerCase() === activeAddress.toLowerCase());
      if (acc) openAccountDetailsModal(acc);
    });

    $('opt-view-explorer')?.addEventListener('click', () => {
      $('options-dropdown')?.classList.add('hidden');
      const net = getNetworkConfig(currentNetworkKey);
      window.open(`${net.explorer}/address/${activeAddress}`, '_blank');
    });

    $('opt-create-wallet')?.addEventListener('click', () => {
      $('options-dropdown')?.classList.add('hidden');
      showView('view-create');
    });

    $('opt-import-wallet')?.addEventListener('click', () => {
      $('options-dropdown')?.classList.add('hidden');
      showView('view-import');
    });

    $('btn-submit-import-mnemonic')?.addEventListener('click', () => {
      const phrase = $('input-import-mnemonic')?.value?.trim();
      if (!phrase) {
        showToast('Please enter a seed phrase', 'error');
        return;
      }
      try {
        const wallet = ethers.HDNodeWallet.fromPhrase(phrase);
        localStorage.setItem('apex_seed_phrase', phrase);
        localStorage.setItem('apex_active_address', wallet.address);
        // Clear old accounts and reset to just the first account of the imported phrase
        const accs = [{
          id: 1,
          name: 'Account 1',
          address: wallet.address,
          privateKey: wallet.privateKey,
          isHD: true,
          hdIndex: 0
        }];
        localStorage.setItem('apex_accounts', JSON.stringify(accs));
        showToast('Wallet imported successfully!', 'success');
        setTimeout(() => location.reload(), 1500);
      } catch(e) {
        showToast('Invalid seed phrase', 'error');
      }
    });

    $('opt-settings')?.addEventListener('click', () => {
      $('options-dropdown')?.classList.add('hidden');
      showView('view-settings-hub');
    });

    $('opt-lock-wallet')?.addEventListener('click', () => {
      $('options-dropdown')?.classList.add('hidden');
      lockWallet();
    });

    // Account Pill Drawer trigger
    $('btn-active-account')?.addEventListener('click', () => {
      renderAccountsDrawer();
      $('accounts-drawer')?.classList.remove('hidden');
    });

    // Asset Tabs
    $$('.mm-asset-tab').forEach(tab => {
      tab.addEventListener('click', () => renderAssetTab(tab.dataset.assetTab));
    });

    // Actions Row
    $('btn-action-send')?.addEventListener('click', () => showView('view-send'));
    $('btn-action-swap')?.addEventListener('click', () => showView('view-swap'));
    $('btn-action-bridge')?.addEventListener('click', () => showView('view-bridge'));
    $('btn-action-buy')?.addEventListener('click', () => showView('view-buy'));
    $('btn-action-receive')?.addEventListener('click', () => showView('view-receive'));

    // Receive Screen Actions
    $('btn-share-address')?.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: 'Apex Address', text: activeAddress });
      } else {
        copyToClipboard(activeAddress, 'Address copied to clipboard!');
      }
    });

    $('btn-download-qr')?.addEventListener('click', downloadQRCode);

    $('btn-copy-dash-address')?.addEventListener('click', () => copyToClipboard(activeAddress, 'Address copied!'));
    $('btn-account-name-copy')?.addEventListener('click', () => copyToClipboard(activeAddress, 'Address copied!'));

    // Refresh balance button
    $('btn-refresh-balance')?.addEventListener('click', refreshBalances);

    // Notifications handlers
    $('btn-mark-all-read')?.addEventListener('click', () => {
      notifications.forEach(n => n.read = true);
      localStorage.setItem('apex_notifications', JSON.stringify(notifications));
      updateNotifBadgeUI();
      renderNotifications();
      showToast('All notifications marked read', 'info');
    });

    $('btn-clear-all-notifs')?.addEventListener('click', () => {
      notifications = [];
      localStorage.setItem('apex_notifications', JSON.stringify(notifications));
      updateNotifBadgeUI();
      renderNotifications();
      showToast('Notifications cleared', 'info');
    });

    // Contacts Add modal
    $('btn-open-add-contact')?.addEventListener('click', () => {
      $('add-contact-modal')?.classList.remove('hidden');
    });

    $('btn-close-add-contact')?.addEventListener('click', () => {
      $('add-contact-modal')?.classList.add('hidden');
    });

    $('btn-save-contact')?.addEventListener('click', () => {
      const name = $('input-contact-name')?.value?.trim();
      const addr = $('input-contact-address')?.value?.trim();
      const note = $('input-contact-note')?.value?.trim();
      const isStarred = $('contact-star-toggle')?.checked || false;

      if (!name || !addr || !ethers.isAddress(addr)) {
        showToast('Valid name and Ethereum address required', 'error');
        return;
      }

      contacts.push({ id: Date.now(), name, address: addr, note, isStarred });
      localStorage.setItem('apex_contacts', JSON.stringify(contacts));
      $('add-contact-modal')?.classList.add('hidden');
      renderContacts();
      showToast('Contact added!', 'success');
    });

    // Export / Import Contacts
    $('btn-export-contacts')?.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contacts));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "apex_contacts.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    // Disconnect All Sites
    $('btn-disconnect-all-sites')?.addEventListener('click', () => {
      connectedSites = [];
      localStorage.setItem('apex_connected_sites', JSON.stringify(connectedSites));
      renderConnectedSites();
      showToast('All DApps disconnected', 'info');
    });

    // Lock screen form
    $('form-unlock-wallet')?.addEventListener('submit', (e) => {
      e.preventDefault();
      unlockWallet();
    });
    $('btn-unlock-submit')?.addEventListener('click', unlockWallet);

    // Theme selector cards
    $$('.mm-theme-card').forEach(card => {
      card.addEventListener('click', () => setTheme(card.dataset.theme));
    });

    // Keyboard navigation (Escape closes modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.mm-modal-overlay').forEach(m => m.classList.add('hidden'));
        $('accounts-drawer')?.classList.add('hidden');
        $('options-dropdown')?.classList.add('hidden');
      }
    });
  }

  // ===========================================
  // INITIALIZATION & SETTINGS
  // ===========================================

  function saveSettings() {
    const settings = {
      selectedCurrency,
      selectedLanguage,
      hideZeroBalances,
      autoLockMinutes
    };
    localStorage.setItem('apex_settings', JSON.stringify(settings));
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('apex_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedCurrency) selectedCurrency = parsed.selectedCurrency;
        if (parsed.selectedLanguage) selectedLanguage = parsed.selectedLanguage;
        if (typeof parsed.hideZeroBalances === 'boolean') hideZeroBalances = parsed.hideZeroBalances;
        if (parsed.autoLockMinutes) autoLockMinutes = parsed.autoLockMinutes;
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
    
    const currencyDisp = $('selected-currency-display');
    if (currencyDisp) currencyDisp.textContent = selectedCurrency;
    
    const langDisp = $('selected-language-display');
    if (langDisp) langDisp.textContent = selectedLanguage === 'en' ? 'English' : selectedLanguage;
    
    const autoLockSelect = $('select-autolock-time');
    if (autoLockSelect) autoLockSelect.value = autoLockMinutes;
    
    const hideZeroIcon = $('hide-zero-icon');
    if (hideZeroIcon) {
      hideZeroIcon.className = hideZeroBalances ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }
  }

  function init() {
    const savedTheme = localStorage.getItem('apex_theme') || 'dark';
    setTheme(savedTheme);

    loadSettings();
    setupProvider(currentNetworkKey);
    loadTxHistory();
    loadSavedWallet();
    updateNotifBadgeUI();
    setupEventListeners();

    showView('view-home');
    fetchPrices();
    if (priceRefreshTimer) clearInterval(priceRefreshTimer);
    priceRefreshTimer = setInterval(fetchPrices, 60_000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
