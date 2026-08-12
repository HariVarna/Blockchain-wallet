/* ==========================================================================
   APEX WEB3 ETHEREUM WALLET APPLICATION LOGIC
   Powered by Ethers.js v6
   ========================================================================== */

(function () {
  'use strict';

  // --- Network Configurations ---
  const NETWORKS = {
    sepolia: {
      name: 'Sepolia Testnet',
      rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
      chainId: 11155111,
      explorer: 'https://sepolia.etherscan.io'
    },
    mainnet: {
      name: 'Ethereum Mainnet',
      rpc: 'https://cloudflare-eth.com',
      chainId: 1,
      explorer: 'https://etherscan.io'
    },
    polygon: {
      name: 'Polygon Mainnet',
      rpc: 'https://polygon-rpc.com',
      chainId: 137,
      explorer: 'https://polygonscan.com'
    },
    arbitrum: {
      name: 'Arbitrum One',
      rpc: 'https://arb1.arbitrum.io/rpc',
      chainId: 42161,
      explorer: 'https://arbiscan.io'
    }
  };

  // --- App State ---
  let currentNetworkKey = 'sepolia';
  let provider = null;
  let activeWallet = null; // Ethers Wallet instance
  let activeWalletData = null; // { walletAddress, privateKey, mnemonicPhrase }
  let draftGeneratedWallet = null; // Temporary wallet object during generation
  let txHistory = [];

  // --- DOM Elements ---
  const el = {
    // Network & Status
    networkSelect: document.getElementById('network-select'),
    statusText: document.getElementById('status-text'),
    statusBadge: document.getElementById('status-badge'),

    // Dashboard
    dashEthBalance: document.getElementById('dash-eth-balance'),
    dashUsdBalance: document.getElementById('dash-usd-balance'),
    dashWalletAddress: document.getElementById('dash-wallet-address'),
    btnRefreshBalance: document.getElementById('btn-refresh-balance'),
    btnCopyDashAddress: document.getElementById('btn-copy-dash-address'),
    btnQrModal: document.getElementById('btn-qr-modal'),
    dashGasPrice: document.getElementById('dash-gas-price'),
    dashLatestBlock: document.getElementById('dash-latest-block'),
    cardNetworkName: document.getElementById('card-network-name'),
    btnQuickSend: document.getElementById('btn-quick-send'),
    btnQuickCreate: document.getElementById('btn-quick-create'),
    btnDownloadJson: document.getElementById('btn-download-json'),

    // Generator
    btnGenerateWallet: document.getElementById('btn-generate-wallet'),
    generatedWalletDisplay: document.getElementById('generated-wallet-display'),
    genAddress: document.getElementById('gen-address'),
    genPrivKey: document.getElementById('gen-privkey'),
    mnemonicContainer: document.getElementById('mnemonic-words-container'),
    btnCopyGenAddress: document.getElementById('btn-copy-gen-address'),
    btnCopyGenPrivkey: document.getElementById('btn-copy-gen-privkey'),
    btnCopyMnemonic: document.getElementById('btn-copy-mnemonic'),
    btnTogglePrivkey: document.getElementById('btn-toggle-privkey'),
    eyeIcon: document.getElementById('eye-icon'),
    eyeText: document.getElementById('eye-text'),
    btnUseGenerated: document.getElementById('btn-use-generated'),
    btnExportGenJson: document.getElementById('btn-export-gen-json'),

    // Import
    inputImportPrivkey: document.getElementById('input-import-privkey'),
    btnSubmitImportPrivkey: document.getElementById('btn-submit-import-privkey'),
    inputImportMnemonic: document.getElementById('input-import-mnemonic'),
    btnSubmitImportMnemonic: document.getElementById('btn-submit-import-mnemonic'),
    fileDropzone: document.getElementById('file-dropzone'),
    fileInput: document.getElementById('file-input'),

    // Send Form
    sendSenderAddress: document.getElementById('send-sender-address'),
    sendRecipient: document.getElementById('send-recipient'),
    sendAmount: document.getElementById('send-amount'),
    sendAvailableEth: document.getElementById('send-available-eth'),
    txEstimatedGas: document.getElementById('tx-estimated-gas'),
    txNetworkDisplay: document.getElementById('tx-network-display'),
    txTotalAmount: document.getElementById('tx-total-amount'),
    btnSendTx: document.getElementById('btn-send-tx'),
    btnSimulateTx: document.getElementById('btn-simulate-tx'),
    txResultBox: document.getElementById('tx-result-box'),
    txHashLink: document.getElementById('tx-hash-link'),
    txExplorerLink: document.getElementById('tx-explorer-link'),
    formSendEth: document.getElementById('form-send-eth'),

    // History
    historyTableBody: document.getElementById('history-table-body'),
    btnClearHistory: document.getElementById('btn-clear-history'),

    // QR Modal
    qrModal: document.getElementById('qr-modal'),
    btnCloseQrModal: document.getElementById('btn-close-qr-modal'),
    qrcodeContainer: document.getElementById('qrcode-container'),
    modalQrAddress: document.getElementById('modal-qr-address'),

    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  // ==========================================
  // INITIALIZATION
  // ==========================================

  function init() {
    setupProvider(currentNetworkKey);
    setupEventListeners();
    loadSavedWallet();
    loadTxHistory();
    updateNetworkUI();
  }

  function setupProvider(netKey) {
    currentNetworkKey = netKey;
    const net = NETWORKS[netKey];
    try {
      if (window.ethers) {
        provider = new ethers.JsonRpcProvider(net.rpc);
      }
    } catch (err) {
      console.warn('RPC Provider initialization error:', err);
    }
    if (activeWallet && provider) {
      activeWallet = activeWallet.connect(provider);
    }
    refreshNetworkStats();
    if (activeWalletData) {
      refreshBalance();
    }
  }

  function updateNetworkUI() {
    const net = NETWORKS[currentNetworkKey];
    el.statusText.textContent = `Connected (${net.name})`;
    el.cardNetworkName.textContent = net.name;
    el.txNetworkDisplay.textContent = net.name;
  }

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==========================================
  // TAB NAVIGATION
  // ==========================================

  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });
  }

  function switchSubtab(subtabId) {
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-subtab') === subtabId);
    });
    document.querySelectorAll('.subtab-content').forEach(content => {
      content.classList.toggle('active', content.id === subtabId);
    });
  }

  // ==========================================
  // WALLET MANAGEMENT
  // ==========================================

  function setActiveWallet(address, privateKey, mnemonicPhrase = '') {
    activeWalletData = {
      walletAddress: address,
      privateKey: privateKey,
      mnemonicPhrase: mnemonicPhrase
    };

    if (window.ethers && privateKey) {
      try {
        activeWallet = new ethers.Wallet(privateKey, provider);
      } catch (err) {
        console.warn('Error instantiating active wallet:', err);
      }
    }

    // Persist active wallet locally
    localStorage.setItem('apex_active_wallet', JSON.stringify(activeWalletData));

    // Update UI elements
    el.dashWalletAddress.textContent = address;
    el.sendSenderAddress.textContent = address.substring(0, 8) + '...' + address.substring(36);
    el.btnDownloadJson.disabled = false;

    refreshBalance();
    showToast('Active wallet loaded!', 'success');
  }

  function loadSavedWallet() {
    const saved = localStorage.getItem('apex_active_wallet');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setActiveWallet(data.walletAddress, data.privateKey, data.mnemonicPhrase || '');
        return;
      } catch (e) {
        console.error('Failed to parse saved wallet:', e);
      }
    }
    
    // Default fallback wallet from initial project state if available
    const defaultAddress = "0xB10853700655dfd4F58FAdf05ffA93F49cAE39A6";
    const defaultPrivKey = "0x3f17ded2369347d8909cbbb880489661abcaad607f96716392e675a22cb376d6";
    const defaultMnemonic = "gather child gold beach fire regret trade canoe saddle mammal crane oxygen";
    
    setActiveWallet(defaultAddress, defaultPrivKey, defaultMnemonic);
  }

  // ==========================================
  // BALANCE & NETWORK STATS
  // ==========================================

  async function refreshBalance() {
    if (!activeWalletData) return;

    el.dashEthBalance.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size:24px"></i> <span class="eth-unit">ETH</span>`;
    
    try {
      let balanceWei = 0n;
      if (provider) {
        balanceWei = await provider.getBalance(activeWalletData.walletAddress);
      }
      const ethFormatted = parseFloat(ethers.formatEther(balanceWei)).toFixed(4);
      
      el.dashEthBalance.innerHTML = `${ethFormatted} <span class="eth-unit">ETH</span>`;
      el.sendAvailableEth.textContent = `${ethFormatted} ETH`;

      // Mock USD conversion calculation (1 ETH = $3000 USD approx for demonstration)
      const usdValue = (parseFloat(ethFormatted) * 3000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      el.dashUsdBalance.textContent = `≈ $${usdValue} USD`;

    } catch (err) {
      console.warn('RPC Balance Query Failed:', err);
      // Fallback display if offline/unreachable RPC
      el.dashEthBalance.innerHTML = `0.0000 <span class="eth-unit">ETH</span>`;
      el.dashUsdBalance.textContent = `≈ $0.00 USD`;
    }
  }

  async function refreshNetworkStats() {
    if (!provider) return;
    try {
      const blockNum = await provider.getBlockNumber();
      el.dashLatestBlock.textContent = `#${blockNum}`;

      const feeData = await provider.getFeeData();
      if (feeData && feeData.gasPrice) {
        const gwei = ethers.formatUnits(feeData.gasPrice, 'gwei');
        el.dashGasPrice.textContent = `${parseFloat(gwei).toFixed(1)} Gwei`;
      }
    } catch (err) {
      el.dashLatestBlock.textContent = 'Offline';
      el.dashGasPrice.textContent = '-- Gwei';
    }
  }

  // ==========================================
  // GENERATE WALLET LOGIC
  // ==========================================

  function generateNewWallet() {
    if (!window.ethers) {
      showToast('Ethers library not loaded yet.', 'error');
      return;
    }

    try {
      const wallet = ethers.Wallet.createRandom();
      draftGeneratedWallet = {
        walletAddress: wallet.address,
        privateKey: wallet.privateKey,
        mnemonicPhrase: wallet.mnemonic ? wallet.mnemonic.phrase : ''
      };

      // Display Address
      el.genAddress.value = draftGeneratedWallet.walletAddress;
      
      // Display Private Key (Hidden by default)
      el.genPrivKey.value = draftGeneratedWallet.privateKey;
      el.genPrivKey.type = 'password';
      el.eyeText.textContent = 'Show Private Key';
      el.eyeIcon.className = 'fa-solid fa-eye';

      // Render 12 Seed Words Grid
      el.mnemonicContainer.innerHTML = '';
      if (draftGeneratedWallet.mnemonicPhrase) {
        const words = draftGeneratedWallet.mnemonicPhrase.split(' ');
        words.forEach((word, idx) => {
          const card = document.createElement('div');
          card.className = 'word-card';
          card.innerHTML = `
            <span class="word-num">${idx + 1}.</span>
            <span class="word-val">${word}</span>
          `;
          el.mnemonicContainer.appendChild(card);
        });
      }

      el.generatedWalletDisplay.classList.remove('hidden');
      showToast('New Ethereum HD wallet generated!', 'success');

    } catch (err) {
      console.error('Failed to generate wallet:', err);
      showToast('Error generating wallet: ' + err.message, 'error');
    }
  }

  // ==========================================
  // IMPORT WALLET LOGIC
  // ==========================================

  function importViaPrivateKey() {
    let key = el.inputImportPrivkey.value.trim();
    if (!key) {
      showToast('Please enter a Private Key', 'error');
      return;
    }
    if (!key.startsWith('0x')) key = '0x' + key;

    try {
      const tempWallet = new ethers.Wallet(key);
      setActiveWallet(tempWallet.address, key, '');
      el.inputImportPrivkey.value = '';
      switchTab('tab-dashboard');
      showToast('Wallet imported successfully!', 'success');
    } catch (err) {
      showToast('Invalid Private Key format', 'error');
    }
  }

  function importViaMnemonic() {
    const phrase = el.inputImportMnemonic.value.trim();
    if (!phrase) {
      showToast('Please enter a seed phrase', 'error');
      return;
    }

    try {
      const tempWallet = ethers.Wallet.fromPhrase(phrase);
      setActiveWallet(tempWallet.address, tempWallet.privateKey, phrase);
      el.inputImportMnemonic.value = '';
      switchTab('tab-dashboard');
      showToast('Wallet restored from Mnemonic!', 'success');
    } catch (err) {
      showToast('Invalid Seed Phrase. Make sure it is 12 or 24 valid BIP-39 words.', 'error');
    }
  }

  function handleJsonFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.privateKey || data.walletAddress) {
          let pk = data.privateKey;
          let addr = data.walletAddress;
          let mnem = data.mnemonicPhrase || '';

          if (pk && !addr) {
            addr = new ethers.Wallet(pk).address;
          }
          if (addr && pk) {
            setActiveWallet(addr, pk, mnem);
            switchTab('tab-dashboard');
            showToast('Loaded wallet from wallet.json!', 'success');
            return;
          }
        }
        showToast('JSON file does not contain valid walletAddress or privateKey', 'error');
      } catch (err) {
        showToast('Error reading JSON file', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ==========================================
  // SEND & SIMULATE TRANSACTIONS
  // ==========================================

  async function handleSendTransaction(isSimulation = false) {
    const recipient = el.sendRecipient.value.trim();
    const amountStr = el.sendAmount.value.trim();

    if (!recipient || !ethers.isAddress(recipient)) {
      showToast('Invalid recipient Ethereum address!', 'error');
      return;
    }

    if (!amountStr || parseFloat(amountStr) <= 0) {
      showToast('Please enter a valid ETH amount', 'error');
      return;
    }

    if (isSimulation) {
      // Simulate transaction execution
      const fakeHash = ethers.id(Date.now().toString() + recipient);
      const simulatedTx = {
        type: 'Transfer (Simulated)',
        hash: fakeHash,
        recipient: recipient,
        amount: `${amountStr} ETH`,
        status: 'Simulated',
        time: new Date().toLocaleTimeString()
      };

      addTxToHistory(simulatedTx);

      // Render Result
      const net = NETWORKS[currentNetworkKey];
      el.txHashLink.textContent = fakeHash.substring(0, 18) + '...';
      el.txHashLink.href = `${net.explorer}/tx/${fakeHash}`;
      el.txExplorerLink.href = `${net.explorer}/tx/${fakeHash}`;
      el.txResultBox.classList.remove('hidden');

      showToast('Transaction simulated successfully!', 'success');
      return;
    }

    // Real Execution
    if (!activeWallet) {
      showToast('No active private key available to sign transaction.', 'error');
      return;
    }

    try {
      showToast('Signing & broadcasting transaction...', 'info');
      const tx = await activeWallet.sendTransaction({
        to: recipient,
        value: ethers.parseEther(amountStr)
      });

      const net = NETWORKS[currentNetworkKey];
      el.txHashLink.textContent = tx.hash.substring(0, 18) + '...';
      el.txHashLink.href = `${net.explorer}/tx/${tx.hash}`;
      el.txExplorerLink.href = `${net.explorer}/tx/${tx.hash}`;
      el.txResultBox.classList.remove('hidden');

      addTxToHistory({
        type: 'Transfer',
        hash: tx.hash,
        recipient: recipient,
        amount: `${amountStr} ETH`,
        status: 'Pending',
        time: new Date().toLocaleTimeString()
      });

      showToast('Transaction Broadcasted! Hash: ' + tx.hash.substring(0, 10) + '...', 'success');
      refreshBalance();

    } catch (err) {
      console.error('Send Tx Error:', err);
      showToast('Transaction failed: ' + (err.reason || err.message), 'error');
    }
  }

  // ==========================================
  // HISTORY & LOCALSTORAGE
  // ==========================================

  function addTxToHistory(item) {
    txHistory.unshift(item);
    localStorage.setItem('apex_tx_history', JSON.stringify(txHistory));
    renderTxHistory();
  }

  function loadTxHistory() {
    const saved = localStorage.getItem('apex_tx_history');
    if (saved) {
      try {
        txHistory = JSON.parse(saved);
      } catch (e) {
        txHistory = [];
      }
    }
    renderTxHistory();
  }

  function renderTxHistory() {
    if (txHistory.length === 0) {
      el.historyTableBody.innerHTML = `
        <tr id="empty-history-row">
          <td colspan="6" class="text-center empty-cell">
            <i class="fa-solid fa-inbox empty-icon"></i>
            <p>No transaction history recorded yet.</p>
          </td>
        </tr>
      `;
      return;
    }

    const net = NETWORKS[currentNetworkKey];
    el.historyTableBody.innerHTML = txHistory.map(tx => `
      <tr>
        <td><strong>${tx.type}</strong></td>
        <td><a href="${net.explorer}/tx/${tx.hash}" target="_blank" class="mono-text link-text">${tx.hash.substring(0, 10)}...</a></td>
        <td class="mono-text">${tx.recipient.substring(0, 8)}...${tx.recipient.substring(36)}</td>
        <td><strong>${tx.amount}</strong></td>
        <td><span class="badge-status ${tx.status === 'Simulated' ? 'status-simulated' : 'status-success'}">${tx.status}</span></td>
        <td class="text-muted">${tx.time}</td>
      </tr>
    `).join('');
  }

  // ==========================================
  // UTILITIES & EXPORTS
  // ==========================================

  function downloadJsonFile(dataObject, filename = 'wallet.json') {
    const jsonStr = JSON.stringify(dataObject, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
  }

  function copyToClipboard(text, message = 'Copied to clipboard!') {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(message, 'info');
    }).catch(() => {
      showToast('Copy failed', 'error');
    });
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  function setupEventListeners() {
    // Network Switcher
    el.networkSelect.addEventListener('change', (e) => {
      setupProvider(e.target.value);
      updateNetworkUI();
      showToast(`Switched network to ${NETWORKS[e.target.value].name}`, 'info');
    });

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
    });

    // Subtab Navigation
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchSubtab(btn.getAttribute('data-subtab')));
    });

    // Quick Action Buttons
    el.btnQuickSend.addEventListener('click', () => switchTab('tab-send'));
    el.btnQuickCreate.addEventListener('click', () => switchTab('tab-create'));
    el.btnRefreshBalance.addEventListener('click', () => refreshBalance());
    el.btnCopyDashAddress.addEventListener('click', () => {
      if (activeWalletData) copyToClipboard(activeWalletData.walletAddress, 'Wallet address copied!');
    });

    // Download JSON
    el.btnDownloadJson.addEventListener('click', () => {
      if (activeWalletData) downloadJsonFile(activeWalletData, 'wallet.json');
    });

    // Generate Wallet Tab Events
    el.btnGenerateWallet.addEventListener('click', generateNewWallet);
    el.btnCopyGenAddress.addEventListener('click', () => copyToClipboard(el.genAddress.value, 'Address copied!'));
    el.btnCopyGenPrivkey.addEventListener('click', () => copyToClipboard(el.genPrivKey.value, 'Private key copied!'));
    el.btnCopyMnemonic.addEventListener('click', () => {
      if (draftGeneratedWallet && draftGeneratedWallet.mnemonicPhrase) {
        copyToClipboard(draftGeneratedWallet.mnemonicPhrase, 'Seed phrase copied!');
      }
    });

    el.btnTogglePrivkey.addEventListener('click', () => {
      if (el.genPrivKey.type === 'password') {
        el.genPrivKey.type = 'text';
        el.eyeText.textContent = 'Hide Private Key';
        el.eyeIcon.className = 'fa-solid fa-eye-slash';
      } else {
        el.genPrivKey.type = 'password';
        el.eyeText.textContent = 'Show Private Key';
        el.eyeIcon.className = 'fa-solid fa-eye';
      }
    });

    el.btnUseGenerated.addEventListener('click', () => {
      if (draftGeneratedWallet) {
        setActiveWallet(draftGeneratedWallet.walletAddress, draftGeneratedWallet.privateKey, draftGeneratedWallet.mnemonicPhrase);
        switchTab('tab-dashboard');
      }
    });

    el.btnExportGenJson.addEventListener('click', () => {
      if (draftGeneratedWallet) downloadJsonFile(draftGeneratedWallet, 'wallet.json');
    });

    // Import Tab Events
    el.btnSubmitImportPrivkey.addEventListener('click', importViaPrivateKey);
    el.btnSubmitImportMnemonic.addEventListener('click', importViaMnemonic);

    // Dropzone Events
    el.fileDropzone.addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleJsonFile(e.target.files[0]);
    });

    el.fileDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.fileDropzone.style.borderColor = 'var(--accent-cyan)';
    });

    el.fileDropzone.addEventListener('dragleave', () => {
      el.fileDropzone.style.borderColor = 'var(--border-color)';
    });

    el.fileDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.fileDropzone.style.borderColor = 'var(--border-color)';
      if (e.dataTransfer.files.length > 0) {
        handleJsonFile(e.dataTransfer.files[0]);
      }
    });

    // Send Form Events
    el.btnSendTx.addEventListener('click', () => handleSendTransaction(false));
    el.btnSimulateTx.addEventListener('click', () => handleSendTransaction(true));

    // Percent Chips for Send
    document.querySelectorAll('.percent-buttons .btn-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const pct = parseFloat(e.target.getAttribute('data-percent'));
        let av = 0;
        if (el.sendAvailableEth.textContent) {
          av = parseFloat(el.sendAvailableEth.textContent) || 0;
        }
        const calc = (av * pct).toFixed(4);
        el.sendAmount.value = calc;
        el.txTotalAmount.textContent = `${calc} ETH`;
      });
    });

    el.sendAmount.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      el.txTotalAmount.textContent = `${val.toFixed(4)} ETH`;
    });

    // QR Modal Events
    el.btnQrModal.addEventListener('click', () => {
      if (!activeWalletData) return;
      el.qrcodeContainer.innerHTML = '';
      if (window.QRCode) {
        new QRCode(el.qrcodeContainer, {
          text: activeWalletData.walletAddress,
          width: 180,
          height: 180,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      }
      el.modalQrAddress.textContent = activeWalletData.walletAddress;
      el.qrModal.classList.remove('hidden');
    });

    el.btnCloseQrModal.addEventListener('click', () => el.qrModal.classList.add('hidden'));
    el.qrModal.addEventListener('click', (e) => {
      if (e.target === el.qrModal) el.qrModal.classList.add('hidden');
    });

    // Clear History
    el.btnClearHistory.addEventListener('click', () => {
      txHistory = [];
      localStorage.removeItem('apex_tx_history');
      renderTxHistory();
      showToast('Transaction history cleared.', 'info');
    });
  }

  // Launch app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
