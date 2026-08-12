/**
 * APEX WALLET — MetaMask-Exact UI
 * app.js — Main Application Logic
 * Phases 1-3: Wallet Foundation, Multi-Account, Security
 */
(function () {
  'use strict';

  // ===========================================
  // CONSTANTS
  // ===========================================

  const NETWORKS = {
    sepolia: { name: 'Ethereum Sepolia', rpc: 'https://rpc.sepolia.org', explorer: 'https://sepolia.etherscan.io', chainId: 11155111, dotColor: '#8247E5' },
    mainnet: { name: 'Ethereum Mainnet', rpc: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', explorer: 'https://etherscan.io', chainId: 1, dotColor: '#28A745' },
    polygon: { name: 'Polygon', rpc: 'https://polygon-rpc.com', explorer: 'https://polygonscan.com', chainId: 137, dotColor: '#8247E5' },
    arbitrum: { name: 'Arbitrum One', rpc: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io', chainId: 42161, dotColor: '#28A8EC' }
  };

  // ===========================================
  // COINGECKO PRICE API
  // ===========================================

  const COINGECKO_API_KEY = 'CG-vXiLtgvzYPtYYJszgVcBcW9L';
  const COINGECKO_BASE   = 'https://api.coingecko.com/api/v3';

  // Cached price data
  let ethPriceUsd      = null;   // e.g. 3241.57
  let ethChange24h     = null;   // e.g. -1.23
  let priceCachedAt    = 0;      // timestamp ms
  let priceRefreshTimer = null;

  // ===========================================
  // STATE
  // ===========================================

  let provider = null;
  let currentNetworkKey = 'sepolia';
  let activeWallet = null;
  let activeWalletData = null;
  let draftGeneratedWallet = null;
  let txHistory = [];

  // Multi-Account
  let accounts = [];
  let activeAddress = '';
  let seedPhrase = '';
  let accountBalances = {};
  let renameTargetAddress = '';

  // Security (Phase 3)
  let masterPassword = '';
  let isLocked = false;
  let lastActivityTime = Date.now();
  let autoLockMinutes = 5;
  let autoLockInterval = null;
  let pendingCopyText = '';
  let pendingCopyMessage = '';
  let srpCountdownInterval = null;
  let pkCountdownInterval = null;

  // UI State
  let currentView = 'view-home';
  let currentAssetTab = 'tokens';
  let currentTheme = 'dark';

  // ===========================================
  // DOM CACHE
  // ===========================================

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ===========================================
  // JAZZICON GENERATOR (MetaMask style)
  // ===========================================

  function generateJazzicon(address, size = 32) {
    if (!address) return `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#ccc"/></svg>`;

    const seed = parseInt(address.slice(2, 10), 16);
    const colors = generateColors(seed, 5);
    const center = size / 2;
    const shapes = [];

    // Background
    shapes.push(`<circle cx="${center}" cy="${center}" r="${center}" fill="${colors[0]}"/>`);

    // Pseudo-random shapes
    let rng = seed;
    const next = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 4294967296; };

    for (let i = 0; i < 4; i++) {
      const x = next() * size;
      const y = next() * size;
      const w = next() * size * 0.7 + size * 0.1;
      const h = next() * size * 0.7 + size * 0.1;
      const rotation = Math.floor(next() * 360);
      shapes.push(`<rect x="${x - w/2}" y="${y - h/2}" width="${w}" height="${h}" fill="${colors[i + 1]}" transform="rotate(${rotation},${center},${center})" opacity="0.9"/>`);
    }

    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="border-radius:50%;overflow:hidden;">${shapes.join('')}</svg>`;
  }

  function generateColors(seed, count) {
    const colors = [];
    let h = (seed % 360 + 360) % 360;
    for (let i = 0; i < count; i++) {
      h = (h + 137.5) % 360;
      colors.push(`hsl(${h},65%,${40 + (i % 3) * 12}%)`);
    }
    return colors;
  }

  // ===========================================
  // TOAST NOTIFICATIONS
  // ===========================================

  function showToast(message, type = 'info', duration = 3000) {
    const container = $('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 280);
    }, duration);
  }

  // ===========================================
  // VIEW ROUTER
  // ===========================================

  function showView(viewId) {
    $$('.mm-view').forEach(v => v.classList.remove('active'));
    const target = $(viewId);
    if (target) {
      target.classList.add('active');
      currentView = viewId;
    }

    // Update bottom nav active state
    $$('.mm-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.navView === viewId);
    });
  }

  // ===========================================
  // ASSET TAB SWITCHER
  // ===========================================

  function showAssetTab(tabName) {
    $$('.mm-asset-tab').forEach(t => t.classList.toggle('active', t.dataset.assetTab === tabName));
    $$('.mm-asset-panel').forEach(p => p.classList.remove('active'));
    const panel = $(`asset-panel-${tabName}`);
    if (panel) panel.classList.add('active');
    currentAssetTab = tabName;
  }

  // ===========================================
  // THEME MANAGEMENT
  // ===========================================

  function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('apex_theme', theme);

    // Update theme buttons
    $$('.mm-theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  // ===========================================
  // NETWORK MANAGEMENT
  // ===========================================

  function setupProvider(netKey) {
    currentNetworkKey = netKey;
    const net = NETWORKS[netKey];
    try {
      if (window.ethers) provider = new ethers.JsonRpcProvider(net.rpc);
    } catch (e) { console.warn('RPC init error:', e); }

    if (activeWallet && provider) activeWallet = activeWallet.connect(provider);

    // Update network dot color
    const dot = $('mm-network-dot');
    if (dot) dot.style.background = net.dotColor;

    refreshNetworkStats();
    if (activeWalletData) refreshBalance();
  }

  async function refreshNetworkStats() {
    if (!provider) return;
    try {
      const [feeData, blockNum] = await Promise.all([
        provider.getFeeData(),
        provider.getBlockNumber()
      ]);
      const gasGwei = feeData.gasPrice ? parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei')).toFixed(1) : '—';
      const gasEl = $('dash-gas-price');
      const blockEl = $('dash-latest-block');
      if (gasEl) gasEl.textContent = gasGwei;
      if (blockEl) blockEl.textContent = `#${blockNum}`;
    } catch (e) { /* silent */ }
  }

  // ===========================================
  // WALLET STATE
  // ===========================================

  function updateActiveWalletState(acc) {
    if (!acc) return;
    activeAddress = acc.address;
    localStorage.setItem('apex_active_address', acc.address);

    try {
      if (acc.privateKey && window.ethers) {
        activeWallet = new ethers.Wallet(acc.privateKey, provider);
        activeWalletData = {
          walletAddress: acc.address,
          privateKey: acc.privateKey,
          mnemonicPhrase: seedPhrase || ''
        };
        localStorage.setItem('apex_active_wallet', JSON.stringify(activeWalletData));
      }
    } catch (e) { console.warn('Wallet init err:', e); }

    updateHeaderUI(acc);
    updateSendFromUI(acc);
    updateHomeBalanceUI();
    refreshBalance();
    renderActivityList();
  }

  function updateHeaderUI(acc) {
    const avatarEl = $('header-account-avatar');
    const nameLabel = $('mm-account-name-label');
    const sendFromAvatar = $('send-from-avatar');
    const sendFromName = $('send-from-name');
    const modalAvatar = $('modal-acc-avatar');
    const modalName = $('modal-acc-name');

    if (avatarEl) avatarEl.innerHTML = generateJazzicon(acc.address, 30);
    if (nameLabel) nameLabel.textContent = acc.name || 'Account 1';
    if (sendFromAvatar) sendFromAvatar.innerHTML = generateJazzicon(acc.address, 32);
    if (sendFromName) sendFromName.textContent = acc.name || 'Account 1';
    if (modalAvatar) modalAvatar.innerHTML = generateJazzicon(acc.address, 56);
    if (modalName) modalName.textContent = acc.name || 'Account 1';

    const addrEl = $('dash-wallet-address');
    const sendAddrEl = $('send-sender-address');
    const receiveAddr = $('mm-receive-address-box');
    const modalQrAddr = $('modal-qr-address');

    const shortAddr = acc.address.substring(0, 6) + '...' + acc.address.substring(38);
    const fullAddr = acc.address;

    if (addrEl) addrEl.textContent = shortAddr;
    if (sendAddrEl) sendAddrEl.textContent = shortAddr;
    if (receiveAddr) {
      const span = receiveAddr.querySelector('.mm-mono-addr');
      if (span) span.textContent = fullAddr;
    }
    if (modalQrAddr) modalQrAddr.textContent = fullAddr;

    // Populate swap balance display
    const swapEthBal = $('swap-eth-balance');
    if (swapEthBal) swapEthBal.textContent = accountBalances[acc.address.toLowerCase()] || '0.0000';
  }

  function updateSendFromUI(acc) {
    const sendAvailEl = $('send-available-eth');
    if (sendAvailEl) sendAvailEl.textContent = accountBalances[acc.address.toLowerCase()] || '0.0000';
  }

  function updateHomeBalanceUI() {
    const bal    = accountBalances[activeAddress.toLowerCase()] || '0.0000';
    const ethNum = parseFloat(bal) || 0;

    // Compute USD values
    const usdValue   = ethPriceUsd ? (ethNum * ethPriceUsd) : null;
    const usdStr     = usdValue !== null ? formatUsd(usdValue) : '$0.00';
    const usdDisplay = usdValue !== null ? `${usdStr} USD` : '$0.00 USD';

    // Token row USD + change badge
    const tokenUsdStr    = usdValue !== null ? usdStr : '$—';
    const changeStr      = ethChange24h !== null ? `${ethChange24h >= 0 ? '+' : ''}${ethChange24h.toFixed(2)}%` : '0.00%';
    const changeClass    = ethChange24h === null ? 'neutral' : ethChange24h >= 0 ? 'up' : 'down';

    const ethBalEl       = $('dash-eth-balance');
    const tokenAmountEl  = $('token-eth-amount');
    const tokenUsdEl     = $('token-eth-usd');
    const tokenChangeEl  = document.querySelector('.mm-token-change');
    const usdBalEl       = $('dash-usd-balance');

    if (ethBalEl)      ethBalEl.textContent      = bal;
    if (tokenAmountEl) tokenAmountEl.textContent  = bal;
    if (tokenUsdEl)    tokenUsdEl.textContent     = tokenUsdStr;
    if (tokenChangeEl) {
      tokenChangeEl.textContent  = changeStr;
      tokenChangeEl.className    = `mm-token-change ${changeClass}`;
    }
    if (usdBalEl) usdBalEl.textContent = usdDisplay;
  }

  // Fetch ETH price from CoinGecko (with 60-second cache)
  async function fetchEthPrice() {
    const now = Date.now();
    if (now - priceCachedAt < 60_000 && ethPriceUsd !== null) return; // cache hit
    try {
      const url = `${COINGECKO_BASE}/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`;
      const res = await fetch(url, {
        headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY }
      });
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const data = await res.json();
      ethPriceUsd  = data.ethereum?.usd             ?? null;
      ethChange24h = data.ethereum?.usd_24h_change   ?? null;
      priceCachedAt = now;
      updateHomeBalanceUI();          // re-render with real price
      updatePriceTicker();            // update optional header ticker
    } catch (e) {
      console.warn('CoinGecko price fetch failed:', e.message);
    }
  }

  // Update the ETH price ticker shown in the token row and stats bar
  function updatePriceTicker() {
    if (ethPriceUsd === null) return;

    const formatted = formatUsd(ethPriceUsd);
    const changeStr = ethChange24h !== null
      ? ` ${ethChange24h >= 0 ? '+' : ''}${ethChange24h.toFixed(2)}%`
      : '';

    // Below token amount in the token row
    const tickerEl = $('eth-price-ticker');
    if (tickerEl) {
      tickerEl.textContent = `${formatted} / ETH${changeStr}`;
      tickerEl.style.color = ethChange24h === null
        ? '' : ethChange24h >= 0 ? 'var(--mm-green)' : 'var(--mm-red)';
    }

    // Live badge in the network stats bar
    const liveBadgeEl = $('mm-eth-price-live');
    if (liveBadgeEl) liveBadgeEl.textContent = formatted;
  }

  function formatUsd(amount) {
    if (amount >= 1000) {
      return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '$' + amount.toFixed(2);
  }

  async function refreshBalance() {
    if (!provider || !activeWalletData) return;
    try {
      const balWei = await provider.getBalance(activeWalletData.walletAddress);
      const eth = parseFloat(ethers.formatEther(balWei)).toFixed(4);
      accountBalances[activeWalletData.walletAddress.toLowerCase()] = eth;
      // Fetch latest price in parallel (uses cache if fresh)
      await fetchEthPrice();
      updateHomeBalanceUI();
      updateSendFromUI({ address: activeWalletData.walletAddress });
      const swapBal = $('swap-eth-balance');
      if (swapBal) swapBal.textContent = eth;
    } catch (e) { /* silent */ }
  }

  // ===========================================
  // LOAD SAVED WALLET
  // ===========================================

  function loadSavedWallet() {
    const savedAccounts = localStorage.getItem('apex_accounts');
    const savedSeed = localStorage.getItem('apex_seed_phrase');
    const savedActiveAddress = localStorage.getItem('apex_active_address');

    if (savedSeed) seedPhrase = savedSeed;
    if (savedAccounts) {
      try { accounts = JSON.parse(savedAccounts); } catch (e) { accounts = []; }
    }

    if (accounts.length === 0 && seedPhrase) {
      // Derive first HD account
      try {
        const node = ethers.HDNodeWallet.fromPhrase(seedPhrase, '', "m/44'/60'/0'/0/0");
        accounts.push({ address: node.address, privateKey: node.privateKey, name: 'Account 1', type: 'hd', index: 0 });
        localStorage.setItem('apex_accounts', JSON.stringify(accounts));
      } catch (e) { console.warn('HD derivation err:', e); }
    }

    const savedWallet = localStorage.getItem('apex_active_wallet');
    if (savedWallet) {
      try { activeWalletData = JSON.parse(savedWallet); } catch (e) { activeWalletData = null; }
    }

    if (savedActiveAddress) activeAddress = savedActiveAddress;

    let activeAcc = accounts.find(a => a.address.toLowerCase() === (activeAddress || '').toLowerCase());
    if (!activeAcc && accounts.length > 0) activeAcc = accounts[0];
    if (activeAcc) updateActiveWalletState(activeAcc);

    renderActivityList();
  }

  function loadTxHistory() {
    const saved = localStorage.getItem('apex_tx_history');
    if (saved) { try { txHistory = JSON.parse(saved); } catch (e) { txHistory = []; } }
  }

  // ===========================================
  // ACCOUNTS DRAWER
  // ===========================================

  function renderAccountsDrawer() {
    populateExportAccountDropdown();
    const listEl = $('drawer-accounts-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    accounts.forEach(acc => {
      const isActive = acc.address.toLowerCase() === activeAddress.toLowerCase();
      const shortAddr = acc.address.substring(0, 6) + '...' + acc.address.substring(38);
      const bal = accountBalances[acc.address.toLowerCase()] || '--';
      const isImported = acc.type === 'imported';

      const item = document.createElement('div');
      item.className = `mm-drawer-acc-item ${isActive ? 'active' : ''}`;
      item.dataset.address = acc.address;
      item.innerHTML = `
        <div class="mm-drawer-acc-avatar">${generateJazzicon(acc.address, 36)}</div>
        <div class="mm-drawer-acc-info">
          <div class="mm-drawer-acc-name">
            ${acc.name}
            <span class="mm-drawer-acc-type ${acc.type}">${acc.type === 'hd' ? 'HD' : 'Imported'}</span>
          </div>
          <div class="mm-drawer-acc-addr">${shortAddr}</div>
          <div class="mm-drawer-acc-bal" id="drawer-bal-${acc.address}">${bal === '--' ? '—' : bal + ' ETH'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          ${isActive ? '<i class="fa-solid fa-circle-check mm-drawer-acc-check"></i>' : ''}
          <button class="mm-icon-btn btn-acc-rename" data-address="${acc.address}" title="Edit">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>
          ${isImported ? `<button class="mm-icon-btn btn-acc-delete" data-address="${acc.address}" title="Remove" style="color:var(--mm-red);">
            <i class="fa-solid fa-trash"></i>
          </button>` : ''}
        </div>
      `;

      // Click to switch account
      item.addEventListener('click', (e) => {
        if (e.target.closest('.mm-icon-btn')) return;
        switchToAccount(acc.address);
        closeDrawer();
      });

      listEl.appendChild(acc.address);
      listEl.appendChild(item);

      // Async balance fetch
      fetchAccountBalanceAsync(acc.address);
    });

    // Rename / delete button binds
    listEl.querySelectorAll('.btn-acc-rename').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openAccountDetails(btn.dataset.address);
      });
    });
    listEl.querySelectorAll('.btn-acc-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        deleteImportedAccount(btn.dataset.address);
      });
    });
  }

  async function fetchAccountBalanceAsync(address) {
    if (!provider) return;
    try {
      const wei = await provider.getBalance(address);
      const eth = parseFloat(ethers.formatEther(wei)).toFixed(4);
      accountBalances[address.toLowerCase()] = eth;
      const balEl = $(`drawer-bal-${address}`);
      if (balEl) balEl.textContent = `${eth} ETH`;
      if (address.toLowerCase() === activeAddress.toLowerCase()) updateHomeBalanceUI();
    } catch (e) { /* silent */ }
  }

  function switchToAccount(address) {
    const acc = accounts.find(a => a.address.toLowerCase() === address.toLowerCase());
    if (!acc) return;
    updateActiveWalletState(acc);
    showToast(`Switched to ${acc.name}`, 'success');
  }

  function openDrawer() {
    const drawer = $('accounts-drawer');
    if (drawer) {
      drawer.classList.remove('hidden');
      renderAccountsDrawer();
    }
  }

  function closeDrawer() {
    const drawer = $('accounts-drawer');
    if (drawer) drawer.classList.add('hidden');
  }

  function openAccountDetails(address) {
    renameTargetAddress = address;
    const acc = accounts.find(a => a.address.toLowerCase() === address.toLowerCase());
    if (!acc) return;

    const modal = $('account-details-modal');
    const nameInput = $('input-rename-acc-name');
    const modalAvatar = $('modal-acc-avatar');
    const modalName = $('modal-acc-name');
    const qrContainer = $('qrcode-container');
    const modalQrAddr = $('modal-qr-address');

    if (modalAvatar) modalAvatar.innerHTML = generateJazzicon(acc.address, 56);
    if (modalName) modalName.textContent = acc.name;
    if (nameInput) nameInput.value = acc.name;
    if (modalQrAddr) modalQrAddr.textContent = acc.address;

    if (qrContainer && window.QRCode) {
      qrContainer.innerHTML = '';
      new QRCode(qrContainer, { text: acc.address, width: 140, height: 140, colorDark: '#000000', colorLight: '#ffffff' });
    }

    // Set explorer link
    const explorerLink = $('tx-explorer-link');
    if (explorerLink) {
      explorerLink.href = `${NETWORKS[currentNetworkKey].explorer}/address/${acc.address}`;
    }

    if (modal) modal.classList.remove('hidden');
  }

  function deleteImportedAccount(address) {
    const acc = accounts.find(a => a.address.toLowerCase() === address.toLowerCase());
    if (!acc || acc.type !== 'imported') {
      showToast('Cannot delete HD accounts', 'error');
      return;
    }
    accounts = accounts.filter(a => a.address.toLowerCase() !== address.toLowerCase());
    localStorage.setItem('apex_accounts', JSON.stringify(accounts));

    if (activeAddress.toLowerCase() === address.toLowerCase() && accounts.length > 0) {
      updateActiveWalletState(accounts[0]);
    }
    renderAccountsDrawer();
    showToast('Account removed', 'info');
  }

  // ===========================================
  // WALLET CREATION
  // ===========================================

  async function handleGenerateWallet() {
    if (!window.ethers) { showToast('ethers.js not loaded', 'error'); return; }
    try {
      const wallet = ethers.Wallet.createRandom();
      draftGeneratedWallet = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
      };

      const display = $('generated-wallet-display');
      const genAddr = $('gen-address');
      const genPrivKey = $('gen-privkey');
      const mnemonicContainer = $('mnemonic-words-container');
      const eyeIcon = $('eye-icon');

      if (display) display.classList.remove('hidden');
      if (genAddr) genAddr.textContent = wallet.address;
      if (genPrivKey) {
        genPrivKey.textContent = wallet.privateKey;
        genPrivKey.className = 'mm-mono-sm privkey-masked';
        genPrivKey._fullText = wallet.privateKey;
      }
      if (eyeIcon) { eyeIcon.className = 'fa-regular fa-eye'; }

      if (mnemonicContainer) {
        mnemonicContainer.innerHTML = '';
        wallet.mnemonic.phrase.split(' ').forEach((word, i) => {
          const card = document.createElement('div');
          card.className = 'word-card';
          card.innerHTML = `<span class="word-num">${i + 1}.</span><span class="word-val">${word}</span>`;
          mnemonicContainer.appendChild(card);
        });
      }

      showToast('New wallet created!', 'success');
    } catch (e) {
      showToast('Error generating wallet: ' + e.message, 'error');
    }
  }

  function handleUseGenerated() {
    if (!draftGeneratedWallet) { showToast('No wallet generated yet.', 'error'); return; }
    const { address, privateKey, mnemonic } = draftGeneratedWallet;

    seedPhrase = mnemonic;
    localStorage.setItem('apex_seed_phrase', mnemonic);

    // Check if already exists
    const exists = accounts.find(a => a.address.toLowerCase() === address.toLowerCase());
    if (!exists) {
      const newAcc = { address, privateKey, name: `Account ${accounts.length + 1}`, type: 'hd', index: accounts.length };
      accounts.push(newAcc);
      localStorage.setItem('apex_accounts', JSON.stringify(accounts));
      updateActiveWalletState(newAcc);
    } else {
      updateActiveWalletState(exists);
    }

    showView('view-home');
    showToast('Wallet set as active!', 'success');
  }

  async function handleImportByMnemonic() {
    const input = $('input-import-mnemonic');
    if (!input) return;
    const phrase = input.value.trim();
    if (!phrase) { showToast('Please enter a recovery phrase', 'error'); return; }

    try {
      const words = phrase.split(/\s+/);
      if (words.length !== 12 && words.length !== 24) throw new Error('Must be 12 or 24 words');
      const node = ethers.HDNodeWallet.fromPhrase(phrase, '', "m/44'/60'/0'/0/0");

      seedPhrase = phrase;
      localStorage.setItem('apex_seed_phrase', phrase);

      const exists = accounts.find(a => a.address.toLowerCase() === node.address.toLowerCase());
      const acc = exists || { address: node.address, privateKey: node.privateKey, name: 'Account 1', type: 'hd', index: 0 };
      if (!exists) accounts.push(acc);
      localStorage.setItem('apex_accounts', JSON.stringify(accounts));
      updateActiveWalletState(acc);

      input.value = '';
      showView('view-home');
      showToast('Wallet imported successfully!', 'success');
    } catch (e) {
      showToast('Invalid phrase: ' + e.message, 'error');
    }
  }

  async function handleImportByPrivKey() {
    const input = $('input-import-privkey');
    if (!input) return;
    const pk = input.value.trim();
    if (!pk) { showToast('Please enter a private key', 'error'); return; }

    try {
      const wallet = new ethers.Wallet(pk);
      const exists = accounts.find(a => a.address.toLowerCase() === wallet.address.toLowerCase());
      if (exists) { showToast('Account already in wallet', 'info'); updateActiveWalletState(exists); return; }

      const acc = { address: wallet.address, privateKey: pk, name: `Imported ${accounts.length + 1}`, type: 'imported', index: -1 };
      accounts.push(acc);
      localStorage.setItem('apex_accounts', JSON.stringify(accounts));
      updateActiveWalletState(acc);

      input.value = '';
      showView('view-home');
      showToast('Account imported!', 'success');
    } catch (e) {
      showToast('Invalid private key', 'error');
    }
  }

  async function handleImportAccPrivKey() {
    const input = $('input-import-acc-privkey');
    if (!input) return;
    const pk = input.value.trim();
    if (!pk) { showToast('Please enter a private key', 'error'); return; }

    try {
      const wallet = new ethers.Wallet(pk);
      const exists = accounts.find(a => a.address.toLowerCase() === wallet.address.toLowerCase());
      if (exists) { showToast('Account already in wallet', 'info'); return; }

      const acc = { address: wallet.address, privateKey: pk, name: `Imported ${accounts.length + 1}`, type: 'imported', index: -1 };
      accounts.push(acc);
      localStorage.setItem('apex_accounts', JSON.stringify(accounts));
      updateActiveWalletState(acc);

      input.value = '';
      const modal = $('import-acc-modal');
      if (modal) modal.classList.add('hidden');
      showToast('Account imported!', 'success');
    } catch (e) {
      showToast('Invalid private key', 'error');
    }
  }

  function handleCreateNewHDAccount() {
    if (!seedPhrase) { showToast('No seed phrase found. Create or import a wallet first.', 'error'); return; }

    const hdAccounts = accounts.filter(a => a.type === 'hd');
    const nextIndex = hdAccounts.length;

    try {
      const node = ethers.HDNodeWallet.fromPhrase(seedPhrase, '', `m/44'/60'/0'/0/${nextIndex}`);
      const exists = accounts.find(a => a.address.toLowerCase() === node.address.toLowerCase());
      if (exists) { showToast('Account already exists', 'info'); return; }

      const newAcc = { address: node.address, privateKey: node.privateKey, name: `Account ${accounts.length + 1}`, type: 'hd', index: nextIndex };
      accounts.push(newAcc);
      localStorage.setItem('apex_accounts', JSON.stringify(accounts));
      updateActiveWalletState(newAcc);
      renderAccountsDrawer();
      showToast(`${newAcc.name} created!`, 'success');
    } catch (e) {
      showToast('Error creating account: ' + e.message, 'error');
    }
  }

  // ===========================================
  // SEND TRANSACTION
  // ===========================================

  async function handleSendTransaction(simulate = false) {
    if (!activeWallet || !activeWalletData) { showToast('No wallet loaded', 'error'); return; }

    const recipient = $('send-recipient')?.value?.trim();
    const amount = $('send-amount')?.value?.trim();
    const resultBox = $('tx-result-box');
    const hashLink = $('tx-hash-link');

    if (!recipient || !amount) { showToast('Fill in recipient and amount', 'error'); return; }

    try {
      if (!ethers.isAddress(recipient)) throw new Error('Invalid recipient address');
      const value = ethers.parseEther(amount);

      if (simulate) {
        showToast(`Simulated: ${amount} ETH to ${recipient.substring(0, 10)}...`, 'info');
        return;
      }

      const tx = await activeWallet.sendTransaction({ to: recipient, value });
      const explorer = NETWORKS[currentNetworkKey].explorer;
      const txUrl = `${explorer}/tx/${tx.hash}`;

      txHistory.unshift({
        type: 'send', hash: tx.hash, to: recipient, amount,
        timestamp: new Date().toISOString(), status: 'pending', network: currentNetworkKey
      });
      localStorage.setItem('apex_tx_history', JSON.stringify(txHistory));
      renderActivityList();

      if (resultBox) resultBox.classList.remove('hidden');
      if (hashLink) { hashLink.href = txUrl; hashLink.textContent = tx.hash.substring(0, 20) + '...'; }

      showToast('Transaction sent!', 'success');

      // Wait for confirmation
      try {
        await tx.wait();
        const idx = txHistory.findIndex(t => t.hash === tx.hash);
        if (idx >= 0) { txHistory[idx].status = 'confirmed'; localStorage.setItem('apex_tx_history', JSON.stringify(txHistory)); }
        renderActivityList();
        showToast('Transaction confirmed!', 'success');
        refreshBalance();
      } catch (e) {
        const idx = txHistory.findIndex(t => t.hash === tx.hash);
        if (idx >= 0) { txHistory[idx].status = 'failed'; localStorage.setItem('apex_tx_history', JSON.stringify(txHistory)); }
        renderActivityList();
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }

  // ===========================================
  // ACTIVITY LIST
  // ===========================================

  function renderActivityList() {
    const listEl = $('mm-activity-list');
    const emptyEl = $('mm-activity-empty');
    if (!listEl) return;

    // Clear old items (keep empty state)
    [...listEl.children].forEach(c => { if (!c.id) c.remove(); });

    const relevantTx = txHistory.filter(tx =>
      !activeAddress || (tx.from || '').toLowerCase() === activeAddress.toLowerCase() ||
      (tx.to || '').toLowerCase() === activeAddress.toLowerCase() || txHistory.length > 0
    );

    if (relevantTx.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');

    relevantTx.forEach(tx => {
      const isSend = tx.type === 'send';
      const date = new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const shortHash = tx.hash ? tx.hash.substring(0, 10) + '...' : 'Local';

      const item = document.createElement('div');
      item.className = 'mm-activity-item';
      item.innerHTML = `
        <div class="mm-activity-icon ${isSend ? 'send' : 'receive'}">
          <i class="fa-solid ${isSend ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
        </div>
        <div class="mm-activity-info">
          <div class="mm-activity-type">${isSend ? 'Send' : 'Receive'}</div>
          <div class="mm-activity-date">${date} · ${shortHash}</div>
        </div>
        <div style="text-align:right;">
          <div class="mm-activity-amount ${isSend ? 'send' : 'receive'}">
            ${isSend ? '-' : '+'}${tx.amount || '?'} ETH
          </div>
          <span class="mm-activity-status ${tx.status || 'pending'}">${tx.status || 'pending'}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        if (tx.hash) window.open(`${NETWORKS[currentNetworkKey].explorer}/tx/${tx.hash}`, '_blank');
      });

      listEl.appendChild(item);
    });
  }

  // ===========================================
  // SECURITY MODULE (Phase 3)
  // ===========================================

  function initSecurityModule() {
    const savedPass = localStorage.getItem('apex_master_password');
    if (savedPass) masterPassword = savedPass;

    const savedAutoLock = localStorage.getItem('apex_autolock_minutes');
    if (savedAutoLock) {
      autoLockMinutes = savedAutoLock === 'never' ? 'never' : parseInt(savedAutoLock, 10);
      const sel = $('select-autolock-time');
      if (sel) sel.value = savedAutoLock;
    }

    // Activity listeners
    ['mousemove', 'keydown', 'touchstart', 'click'].forEach(evt =>
      document.addEventListener(evt, () => { if (!isLocked) lastActivityTime = Date.now(); }, { passive: true })
    );

    if (autoLockInterval) clearInterval(autoLockInterval);
    autoLockInterval = setInterval(() => {
      if (isLocked || autoLockMinutes === 'never') return;
      const idle = Date.now() - lastActivityTime;
      if (idle >= autoLockMinutes * 60 * 1000) lockWallet();
    }, 5000);

    populateExportAccountDropdown();
  }

  function lockWallet() {
    isLocked = true;
    hideSRP(); hidePK();
    closeDrawer();
    const overlay = $('lock-screen-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      const passInput = $('input-unlock-password');
      if (passInput) passInput.value = '';
    }
    // Close options menu
    const dropdown = $('options-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    showToast('Wallet locked', 'info');
  }

  function unlockWallet() {
    const input = $('input-unlock-password');
    const pass = input?.value?.trim() || '';
    if (masterPassword && pass !== masterPassword) {
      showToast('Incorrect password', 'error');
      return;
    }
    isLocked = false;
    lastActivityTime = Date.now();
    const overlay = $('lock-screen-overlay');
    if (overlay) overlay.classList.add('hidden');
    showToast('Wallet unlocked', 'success');
  }

  function setupHoldToReveal(btnEl, barEl, textEl, passInputEl, onComplete) {
    if (!btnEl) return;
    let timer = null;
    const defaultText = textEl?.textContent || 'Hold to reveal';

    const start = (e) => {
      e.preventDefault();
      const pass = passInputEl?.value?.trim() || '';
      if (masterPassword && pass !== masterPassword) {
        showToast('Incorrect password', 'error');
        return;
      }
      btnEl.classList.add('holding');
      if (textEl) textEl.textContent = 'Hold for 3 seconds...';
      timer = setTimeout(() => {
        btnEl.classList.remove('holding');
        if (textEl) textEl.textContent = defaultText;
        onComplete();
      }, 3000);
    };

    const cancel = () => {
      clearTimeout(timer); timer = null;
      btnEl.classList.remove('holding');
      if (textEl) textEl.textContent = defaultText;
    };

    btnEl.addEventListener('mousedown', start);
    btnEl.addEventListener('touchstart', start);
    btnEl.addEventListener('mouseup', cancel);
    btnEl.addEventListener('mouseleave', cancel);
    btnEl.addEventListener('touchend', cancel);
  }

  function revealSRP() {
    if (!seedPhrase) { showToast('No seed phrase found', 'error'); return; }
    const authStep = $('srp-auth-step');
    const revealBox = $('srp-revealed-box');
    const grid = $('srp-secure-grid');
    const timerNum = $('srp-timer-num');

    if (authStep) authStep.classList.add('hidden');
    if (revealBox) revealBox.classList.remove('hidden');

    if (grid) {
      grid.innerHTML = '';
      seedPhrase.split(' ').forEach((word, i) => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.innerHTML = `<span class="word-num">${i+1}.</span><span class="word-val">${word}</span>`;
        grid.appendChild(card);
      });
    }

    let sec = 30;
    if (timerNum) timerNum.textContent = sec;
    if (srpCountdownInterval) clearInterval(srpCountdownInterval);
    srpCountdownInterval = setInterval(() => {
      sec--;
      if (timerNum) timerNum.textContent = sec;
      if (sec <= 0) { clearInterval(srpCountdownInterval); hideSRP(); showToast('Phrase auto-hidden', 'info'); }
    }, 1000);
  }

  function hideSRP() {
    if (srpCountdownInterval) clearInterval(srpCountdownInterval);
    const authStep = $('srp-auth-step');
    const revealBox = $('srp-revealed-box');
    const grid = $('srp-secure-grid');
    const passInput = $('input-srp-confirm-pass');
    if (revealBox) revealBox.classList.add('hidden');
    if (authStep) authStep.classList.remove('hidden');
    if (grid) grid.innerHTML = '';
    if (passInput) passInput.value = '';
  }

  function revealPK() {
    const sel = $('select-export-account');
    const addr = sel?.value || activeAddress;
    const acc = accounts.find(a => a.address.toLowerCase() === addr.toLowerCase());
    if (!acc || !acc.privateKey) { showToast('Private key unavailable', 'error'); return; }

    const authStep = $('pk-auth-step');
    const revealBox = $('pk-revealed-box');
    const pkInput = $('input-pk-secure-val');
    const timerNum = $('pk-timer-num');

    if (authStep) authStep.classList.add('hidden');
    if (revealBox) revealBox.classList.remove('hidden');
    if (pkInput) pkInput.value = acc.privateKey;

    let sec = 30;
    if (timerNum) timerNum.textContent = sec;
    if (pkCountdownInterval) clearInterval(pkCountdownInterval);
    pkCountdownInterval = setInterval(() => {
      sec--;
      if (timerNum) timerNum.textContent = sec;
      if (sec <= 0) { clearInterval(pkCountdownInterval); hidePK(); showToast('Key auto-hidden', 'info'); }
    }, 1000);
  }

  function hidePK() {
    if (pkCountdownInterval) clearInterval(pkCountdownInterval);
    const authStep = $('pk-auth-step');
    const revealBox = $('pk-revealed-box');
    const pkInput = $('input-pk-secure-val');
    const passInput = $('input-pk-confirm-pass');
    if (revealBox) revealBox.classList.add('hidden');
    if (authStep) authStep.classList.remove('hidden');
    if (pkInput) pkInput.value = '';
    if (passInput) passInput.value = '';
  }

  function populateExportAccountDropdown() {
    const sel = $('select-export-account');
    if (!sel) return;
    sel.innerHTML = '';
    accounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.address;
      opt.textContent = `${acc.name} (${acc.address.substring(0, 6)}...${acc.address.substring(38)})`;
      sel.appendChild(opt);
    });
  }

  function copyToClipboardWithWarning(text, message) {
    pendingCopyText = text;
    pendingCopyMessage = message;
    const modal = $('copy-warning-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function copyToClipboard(text, message = 'Copied!') {
    navigator.clipboard.writeText(text)
      .then(() => showToast(message, 'success'))
      .catch(() => showToast('Copy failed', 'error'));
  }

  // ===========================================
  // FILE DROP ZONE
  // ===========================================

  function setupFileDropzone() {
    const zone = $('file-dropzone');
    const fileInput = $('file-input');
    if (!zone || !fileInput) return;

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--mm-orange)'; });
    zone.addEventListener('dragleave', () => zone.style.borderColor = '');
    zone.addEventListener('drop', e => { e.preventDefault(); zone.style.borderColor = ''; handleJsonFile(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', e => handleJsonFile(e.target.files[0]));
  }

  async function handleJsonFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const acc = { address: json.address || json.walletAddress, privateKey: json.privateKey, name: `JSON Import`, type: 'imported', index: -1 };
      if (!acc.address) throw new Error('Invalid JSON wallet file');
      accounts.push(acc);
      localStorage.setItem('apex_accounts', JSON.stringify(accounts));
      updateActiveWalletState(acc);
      showView('view-home');
      showToast('JSON wallet imported!', 'success');
    } catch (e) {
      showToast('Invalid JSON file: ' + e.message, 'error');
    }
  }

  // ===========================================
  // EVENT LISTENERS
  // ===========================================

  function setupEventListeners() {
    // ---- Header / Options ----
    $('btn-active-account')?.addEventListener('click', () => {
      openDrawer();
      $('options-dropdown')?.classList.add('hidden');
    });

    $('btn-options-menu')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const dd = $('options-dropdown');
      if (dd) dd.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      const dd = $('options-dropdown');
      if (dd && !dd.classList.contains('hidden') && !e.target.closest('#btn-options-menu') && !e.target.closest('#options-dropdown')) {
        dd.classList.add('hidden');
      }
    });

    // Options menu items
    $('opt-account-details')?.addEventListener('click', () => {
      if (activeAddress) openAccountDetails(activeAddress);
      $('options-dropdown')?.classList.add('hidden');
    });

    $('opt-view-explorer')?.addEventListener('click', () => {
      if (activeAddress) window.open(`${NETWORKS[currentNetworkKey].explorer}/address/${activeAddress}`, '_blank');
      $('options-dropdown')?.classList.add('hidden');
    });

    $('opt-create-wallet')?.addEventListener('click', () => {
      showView('view-create');
      $('options-dropdown')?.classList.add('hidden');
    });

    $('opt-import-wallet')?.addEventListener('click', () => {
      showView('view-import');
      $('options-dropdown')?.classList.add('hidden');
    });

    $('opt-settings')?.addEventListener('click', () => {
      showView('view-settings');
      $('options-dropdown')?.classList.add('hidden');
    });

    $('opt-lock-wallet')?.addEventListener('click', () => {
      lockWallet();
      $('options-dropdown')?.classList.add('hidden');
    });

    // ---- Network Select ----
    $('network-select')?.addEventListener('change', (e) => {
      setupProvider(e.target.value);
      showToast(`Switched to ${NETWORKS[e.target.value].name}`, 'info');
    });

    // ---- Bottom Nav ----
    $$('.mm-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => showView(btn.dataset.navView));
    });

    // ---- Back Buttons ----
    $$('.mm-back-btn').forEach(btn => {
      btn.addEventListener('click', () => showView(btn.dataset.targetView || 'view-home'));
    });

    // ---- Asset Tabs ----
    $$('.mm-asset-tab').forEach(tab => {
      tab.addEventListener('click', () => showAssetTab(tab.dataset.assetTab));
    });

    // ---- Action Buttons (Home) ----
    $('btn-action-send')?.addEventListener('click', () => showView('view-send'));
    $('btn-action-swap')?.addEventListener('click', () => showView('view-swap'));
    $('btn-action-bridge')?.addEventListener('click', () => showView('view-bridge'));
    $('btn-action-buy')?.addEventListener('click', () => showView('view-buy'));
    $('btn-action-receive')?.addEventListener('click', () => {
      // Build QR for receive view
      const container = $('qrcode-container');
      if (container && activeWalletData && window.QRCode) {
        container.innerHTML = '';
        new QRCode(container, { text: activeWalletData.walletAddress, width: 160, height: 160, colorDark: '#000', colorLight: '#fff' });
      }
      showView('view-receive');
    });

    // ---- Account name / copy ----
    $('mm-account-name-label')?.closest('.mm-account-name-btn')?.addEventListener('click', () => {
      if (activeWalletData) copyToClipboard(activeWalletData.walletAddress, 'Address copied!');
    });

    $('btn-account-name-copy')?.addEventListener('click', () => {
      if (activeWalletData) copyToClipboard(activeWalletData.walletAddress, 'Address copied!');
    });

    $('btn-copy-dash-address')?.addEventListener('click', () => {
      if (activeWalletData) copyToClipboard(activeWalletData.walletAddress, 'Address copied!');
    });

    // ---- Refresh Balance ----
    $('btn-refresh-balance')?.addEventListener('click', () => {
      refreshBalance();
      refreshNetworkStats();
      const icon = document.querySelector('#btn-refresh-balance i');
      if (icon) { icon.style.animation = 'spin 0.5s linear'; setTimeout(() => icon.style.animation = '', 500); }
    });

    // ---- Create Wallet ----
    $('btn-generate-wallet')?.addEventListener('click', handleGenerateWallet);
    $('btn-use-generated')?.addEventListener('click', handleUseGenerated);
    $('btn-export-gen-json')?.addEventListener('click', () => {
      if (!draftGeneratedWallet) return;
      const data = JSON.stringify({ address: draftGeneratedWallet.address, privateKey: draftGeneratedWallet.privateKey }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `apex-wallet-${draftGeneratedWallet.address.substring(0, 8)}.json`; a.click();
    });

    $('btn-toggle-privkey')?.addEventListener('click', () => {
      const el = $('gen-privkey');
      const icon = $('eye-icon');
      if (!el || !el._fullText) return;
      const isMasked = el.classList.contains('privkey-masked');
      if (isMasked) {
        el.textContent = el._fullText;
        el.classList.remove('privkey-masked');
        if (icon) icon.className = 'fa-regular fa-eye-slash';
      } else {
        el.textContent = el._fullText;
        el.classList.add('privkey-masked');
        if (icon) icon.className = 'fa-regular fa-eye';
      }
    });

    $('btn-copy-gen-address')?.addEventListener('click', () => { const t = $('gen-address')?.textContent; if (t) copyToClipboard(t, 'Address copied!'); });
    $('btn-copy-gen-privkey')?.addEventListener('click', () => { const el = $('gen-privkey'); if (el?._fullText) copyToClipboardWithWarning(el._fullText, 'Private key copied!'); });
    $('btn-copy-mnemonic')?.addEventListener('click', () => { if (draftGeneratedWallet?.mnemonic) copyToClipboardWithWarning(draftGeneratedWallet.mnemonic, 'Phrase copied!'); });

    // ---- Import Wallet ----
    $('btn-submit-import-mnemonic')?.addEventListener('click', handleImportByMnemonic);
    $('btn-submit-import-privkey')?.addEventListener('click', handleImportByPrivKey);

    // ---- Send ----
    $('btn-send-tx')?.addEventListener('click', () => handleSendTransaction(false));
    $('btn-simulate-tx')?.addEventListener('click', () => handleSendTransaction(true));

    $$('.mm-pct-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = parseFloat(btn.dataset.percent);
        const avail = parseFloat(accountBalances[activeAddress.toLowerCase()] || 0);
        const val = (avail * pct).toFixed(6);
        const inp = $('send-amount');
        if (inp) { inp.value = val; $('tx-total-amount').textContent = val + ' ETH'; }
      });
    });

    $('btn-send-max')?.addEventListener('click', () => {
      const avail = parseFloat(accountBalances[activeAddress.toLowerCase()] || 0);
      const val = Math.max(0, avail - 0.001).toFixed(6);
      const inp = $('send-amount');
      if (inp) inp.value = val;
    });

    $('send-amount')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      const total = $('tx-total-amount');
      if (total) total.textContent = val.toFixed(6) + ' ETH';
    });

    // ---- Swap ----
    $('btn-swap-flip')?.addEventListener('click', () => {
      showToast('Swap direction flipped (Testnet: simulated)', 'info');
    });

    $('btn-do-swap')?.addEventListener('click', () => {
      showToast('Swap submitted (Testnet: simulated)', 'info');
    });

    // ---- Bridge ----
    $('btn-do-bridge')?.addEventListener('click', () => {
      showToast('Bridge submitted (Testnet: simulated)', 'info');
    });

    // ---- Drawer ----
    $('btn-close-drawer')?.addEventListener('click', closeDrawer);
    $('accounts-drawer')?.addEventListener('click', (e) => { if (e.target === $('accounts-drawer')) closeDrawer(); });
    $('drawer-btn-create-acc')?.addEventListener('click', () => { handleCreateNewHDAccount(); closeDrawer(); });
    $('drawer-btn-import-acc')?.addEventListener('click', () => {
      closeDrawer();
      const modal = $('import-acc-modal');
      if (modal) modal.classList.remove('hidden');
    });

    // ---- Account Details Modal ----
    $('btn-close-acc-details')?.addEventListener('click', () => $('account-details-modal')?.classList.add('hidden'));
    $('account-details-modal')?.addEventListener('click', (e) => { if (e.target === $('account-details-modal')) $('account-details-modal').classList.add('hidden'); });

    $('btn-copy-modal-address')?.addEventListener('click', () => {
      const addr = $('modal-qr-address')?.textContent;
      if (addr) copyToClipboard(addr, 'Address copied!');
    });

    $('btn-submit-rename-acc')?.addEventListener('click', () => {
      const newName = $('input-rename-acc-name')?.value?.trim();
      if (!newName || !renameTargetAddress) return;
      const acc = accounts.find(a => a.address.toLowerCase() === renameTargetAddress.toLowerCase());
      if (acc) {
        acc.name = newName;
        localStorage.setItem('apex_accounts', JSON.stringify(accounts));
        if (acc.address.toLowerCase() === activeAddress.toLowerCase()) updateHeaderUI(acc);
        showToast('Account renamed!', 'success');
      }
      $('account-details-modal')?.classList.add('hidden');
    });

    // ---- Import Account Modal ----
    $('btn-close-import-modal')?.addEventListener('click', () => $('import-acc-modal')?.classList.add('hidden'));
    $('import-acc-modal')?.addEventListener('click', (e) => { if (e.target === $('import-acc-modal')) $('import-acc-modal').classList.add('hidden'); });
    $('btn-submit-import-acc')?.addEventListener('click', handleImportAccPrivKey);

    // ---- Lock Screen ----
    $('form-unlock-wallet')?.addEventListener('submit', (e) => { e.preventDefault(); unlockWallet(); });
    $('btn-unlock-submit')?.addEventListener('click', unlockWallet);

    // ---- Copy Warning ----
    $('btn-close-copy-modal')?.addEventListener('click', () => $('copy-warning-modal')?.classList.add('hidden'));
    $('copy-warning-modal')?.addEventListener('click', (e) => { if (e.target === $('copy-warning-modal')) $('copy-warning-modal').classList.add('hidden'); });
    $('btn-confirm-copy-action')?.addEventListener('click', () => {
      if (pendingCopyText) copyToClipboard(pendingCopyText, pendingCopyMessage);
      $('copy-warning-modal')?.classList.add('hidden');
    });

    // ---- Settings ----
    $('btn-save-password')?.addEventListener('click', () => {
      const pass = $('input-master-password')?.value?.trim();
      if (!pass) { showToast('Enter a password', 'error'); return; }
      masterPassword = pass;
      localStorage.setItem('apex_master_password', pass);
      $('input-master-password').value = '';
      showToast('Password saved!', 'success');
    });

    $('select-autolock-time')?.addEventListener('change', (e) => {
      const val = e.target.value;
      autoLockMinutes = val === 'never' ? 'never' : parseInt(val, 10);
      localStorage.setItem('apex_autolock_minutes', val);
      showToast(`Auto-lock: ${val === 'never' ? 'Never' : val + ' min'}`, 'info');
    });

    $('btn-lock-now')?.addEventListener('click', lockWallet);

    // Theme buttons
    $$('.mm-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    // Hold-to-Reveal SRP
    setupHoldToReveal($('btn-hold-srp'), $('srp-progress-bar'), $('srp-hold-text'), $('input-srp-confirm-pass'), revealSRP);
    $('btn-hide-srp-now')?.addEventListener('click', hideSRP);
    $('btn-copy-srp-secure')?.addEventListener('click', () => { if (seedPhrase) copyToClipboardWithWarning(seedPhrase, 'Phrase copied!'); });

    // Hold-to-Reveal PK
    setupHoldToReveal($('btn-hold-pk'), $('pk-progress-bar'), $('pk-hold-text'), $('input-pk-confirm-pass'), revealPK);
    $('btn-hide-pk-now')?.addEventListener('click', hidePK);
    $('btn-copy-pk-secure')?.addEventListener('click', () => {
      const val = $('input-pk-secure-val')?.value;
      if (val) copyToClipboardWithWarning(val, 'Private key copied!');
    });
  }

  // ===========================================
  // INIT
  // ===========================================

  function init() {
    // Load theme
    const savedTheme = localStorage.getItem('apex_theme') || 'dark';
    setTheme(savedTheme);

    // Setup provider
    setupProvider(currentNetworkKey);

    // Setup file zone
    setupFileDropzone();

    // Load wallet data
    loadTxHistory();
    loadSavedWallet();

    // Security module
    initSecurityModule();

    // Event listeners
    setupEventListeners();

    // Initial view
    showView('view-home');
    showAssetTab('tokens');

    // CoinGecko: fetch price immediately, then every 60 seconds
    fetchEthPrice();
    if (priceRefreshTimer) clearInterval(priceRefreshTimer);
    priceRefreshTimer = setInterval(fetchEthPrice, 60_000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
