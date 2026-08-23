import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/store';
import { SMMProviderClient } from './src/services/smmProvider';
import { ServiceSyncEngine } from './src/services/serviceSync';
import { Order, Ticket, ChildPanel } from './src/types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Disable x-powered-by for security
app.disable('x-powered-by');

// API ROUTES

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1b. Public Categories endpoint
app.get('/api/categories', (req, res) => {
  db.cleanEmptyCategories();
  res.json({ categories: db.getCategories() });
});

// 2. Public / User Services & Categories (with Child Panel support)
app.get('/api/services', (req, res) => {
  db.cleanEmptyCategories();
  const { panel } = req.query;
  const panelQuery = panel ? String(panel).trim() : undefined;

  let categories = db.getCategories();
  let services = db.getServices(true);
  let resolved = db.resolvePanelBranding(panelQuery);

  if (panelQuery && resolved.isChildPanel && resolved.childPanel) {
    services = db.getChildPanelServices(resolved.childPanel.id, true);
    if (resolved.childPanel.allowedCategoryIds && resolved.childPanel.allowedCategoryIds.length > 0) {
      categories = categories.filter((c) => resolved.childPanel!.allowedCategoryIds!.includes(c.name) || resolved.childPanel!.allowedCategoryIds!.includes(c.id));
    }
  }

  res.json({
    categories,
    services,
    settings: resolved.settings,
    isChildPanel: resolved.isChildPanel,
    childPanel: resolved.childPanel,
    branding: resolved.branding,
    contact: resolved.contact,
    payment: resolved.payment,
  });
});

// 2b. Public Child Panel White-Label Info Endpoint
app.get('/api/panel/info', (req, res) => {
  const { panel } = req.query;
  const panelQuery = panel ? String(panel).trim() : undefined;
  const resolved = db.resolvePanelBranding(panelQuery);
  res.json(resolved);
});

app.get('/api/panel-branding', (req, res) => {
  const { panel } = req.query;
  const panelQuery = panel ? String(panel).trim() : undefined;
  const resolved = db.resolvePanelBranding(panelQuery);
  res.json(resolved);
});

// 3. Place Order (with Child Panel Profit Split & API Isolation)
app.post('/api/orders', async (req, res) => {
  try {
    const {
      userId = 'usr-demo',
      serviceId,
      link,
      quantity,
      userEmail,
      username,
      whatsappNo,
      userBalance,
      childPanelId,
    } = req.body;

    if (!serviceId || !link || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Please provide valid service ID, link, and quantity' });
    }

    const service = db.getService(serviceId);
    if (!service || service.status !== 'active') {
      return res.status(400).json({ error: 'Selected service is currently unavailable or inactive' });
    }

    const numQty = Number(quantity);
    if (numQty < service.min || numQty > service.max) {
      return res.status(400).json({
        error: `Quantity must be between ${service.min} and ${service.max} for this service`,
      });
    }

    let user = db.getUser(userId);
    if (!user && (userEmail || username)) {
      user = db.getUser(userEmail || username);
    }

    // Auto-create/register authenticated user if not found in server store
    if (!user) {
      const cleanUsername = username || (userEmail ? userEmail.split('@')[0] : `user_${String(userId).substring(0, 6)}`);
      const cleanEmail = userEmail || (String(userId).includes('@') ? userId : `${cleanUsername}@gmail.com`);
      const refCode = cleanUsername.substring(0, 5).toUpperCase() + Math.floor(100 + Math.random() * 900);
      user = db.saveUser({
        id: userId,
        firebaseUid: userId,
        username: cleanUsername,
        email: cleanEmail,
        whatsappNo: whatsappNo || '',
        balance: typeof userBalance === 'number' ? userBalance : 0,
        totalSpent: 0,
        role: 'user',
        childPanelId: childPanelId || undefined,
        apiKey: 'usr_api_key_' + Math.random().toString(36).substring(2, 11),
        status: 'active',
        referralCode: refCode,
        referralBalance: 0,
        totalReferralEarnings: 0,
        totalReferralWithdrawn: 0,
        referralEligible: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Sync balance if client balance state from Firebase RTDB is higher/available
    if (typeof userBalance === 'number' && userBalance > user.balance) {
      user.balance = userBalance;
      db.saveUser(user);
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account is blocked by Admin. You cannot place new orders.' });
    }

    // Determine Child Panel association
    const effectiveChildPanelId = childPanelId || user.childPanelId;
    let childPanel: ChildPanel | undefined = undefined;
    if (effectiveChildPanelId) {
      childPanel = db.getChildPanel(effectiveChildPanelId);
    }

    if (childPanel && childPanel.status === 'disabled') {
      return res.status(403).json({
        error: 'This child panel is temporarily disabled by Main Admin. Please contact support.',
      });
    }

    // Financial calculations
    const qtyMultiplier = numQty / 1000;
    const baseAdminSellingRate = service.sellingRate;
    const baseProviderRate = service.providerRate;

    let effectiveSellingRate = baseAdminSellingRate;
    let childOwnerProfit = 0;
    let mainAdminProfit = Number(((baseAdminSellingRate - baseProviderRate) * qtyMultiplier).toFixed(4));

    if (childPanel) {
      // Calculate child panel customized selling rate
      const defaultMargin = childPanel.pricing?.defaultMarginPercent ?? 20;
      const customPrices = childPanel.pricing?.serviceCustomPrices || {};
      const custom = customPrices[service.id];

      if (custom && typeof custom.sellingRate === 'number' && custom.sellingRate > 0) {
        effectiveSellingRate = custom.sellingRate;
      } else {
        effectiveSellingRate = Number((baseAdminSellingRate * (1 + defaultMargin / 100)).toFixed(4));
      }

      const totalChildCustomerCost = Number((effectiveSellingRate * qtyMultiplier).toFixed(4));
      const totalMainAdminCost = Number((baseAdminSellingRate * qtyMultiplier).toFixed(4));
      childOwnerProfit = Number(Math.max(0, totalChildCustomerCost - totalMainAdminCost).toFixed(4));
    }

    const totalSellingPrice = Number((effectiveSellingRate * qtyMultiplier).toFixed(4));
    const totalProviderCost = Number((baseProviderRate * qtyMultiplier).toFixed(4));
    const netProfit = Number((totalSellingPrice - totalProviderCost).toFixed(4));

    if (user.balance < totalSellingPrice) {
      return res.status(400).json({
        error: `Insufficient balance. Required: ₹${totalSellingPrice.toFixed(2)}, Available: ₹${user.balance.toFixed(2)}`,
      });
    }

    // Order API Routing: Check if Child Panel uses Option B (Custom Own Provider API)
    let providerOrderId: string | undefined = undefined;
    let providerApiUsed = 'Main Admin Provider';

    if (childPanel && !childPanel.apiSettings?.useMainAdminApi && childPanel.apiSettings?.apiUrl && childPanel.apiSettings?.apiKey) {
      // Option B: Child panel forwards order to their own external API provider
      try {
        const customClient = new SMMProviderClient(childPanel.apiSettings.apiUrl, childPanel.apiSettings.apiKey);
        const providerRes = await customClient.placeOrder(
          service.providerServiceId,
          link,
          quantity
        );
        if (providerRes.error) {
          return res.status(400).json({
            error: `Child Panel Provider API Error: ${providerRes.error}. Order was not placed.`,
          });
        }
        if (providerRes.orderId) {
          providerOrderId = providerRes.orderId;
          providerApiUsed = childPanel.apiSettings.apiProviderName || 'Child Panel Custom API';
        }
      } catch (cpApiErr: any) {
        return res.status(500).json({
          error: `Failed to connect to Child Panel's provider API: ${cpApiErr.message || cpApiErr}`,
        });
      }
    } else {
      // Option A (Default): Forward via Main Admin Provider Client
      const provider = db.getProvider(service.providerId);
      if (provider && provider.status === 'active') {
        try {
          const providerClient = new SMMProviderClient(provider.apiUrl, provider.apiKey);
          const providerRes = await providerClient.placeOrder(
            service.providerServiceId,
            link,
            quantity
          );
          if (providerRes.error) {
            return res.status(400).json({
              error: `Provider API Error: ${providerRes.error}. Your order was not placed and balance remains unchanged.`,
            });
          }
          if (providerRes.orderId) {
            providerOrderId = providerRes.orderId;
          }
        } catch (prvErr: any) {
          return res.status(500).json({
            error: `Failed to connect to provider API: ${prvErr.message || prvErr}. Balance refunded.`,
          });
        }
      }
    }

    // Deduct user balance only after provider check or order confirmation
    db.deductUserBalance(userId, totalSellingPrice);

    // If Child Panel order, credit child owner wallet with their profit
    if (childPanel && childOwnerProfit > 0) {
      db.updateChildPanelWallet(childPanel.id, childOwnerProfit, 'add');
    }

    const orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
    const newOrder: Order = {
      id: orderId,
      userId: user.id,
      userName: user.username,
      serviceId: service.id,
      serviceName: service.serviceName,
      category: service.category,
      providerId: service.providerId,
      providerServiceId: service.providerServiceId,
      providerOrderId,
      link,
      quantity,
      sellingPrice: totalSellingPrice,
      providerCost: totalProviderCost,
      profit: netProfit,
      startCount: Math.floor(Math.random() * 500) + 10,
      remains: quantity,
      status: 'Pending',
      childPanelId: childPanel ? childPanel.id : undefined,
      childOwnerProfit: childPanel ? childOwnerProfit : undefined,
      mainAdminProfit: childPanel ? mainAdminProfit : undefined,
      createdAt: new Date().toISOString(),
    };

    db.addOrder(newOrder);

    res.json({
      success: true,
      message: 'Order placed successfully!',
      order: newOrder,
      newBalance: db.getUser(userId)?.balance,
      childPanelId: childPanel?.id,
      childOwnerProfit: childPanel ? childOwnerProfit : 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to place order' });
  }
});

// Get User Orders
app.get('/api/orders', (req, res) => {
  const { userId = 'usr-demo' } = req.query;
  const orders = db.getOrders(String(userId));
  res.json({ orders });
});

// Refill Order Request
app.post('/api/orders/:id/refill', (req, res) => {
  const { id } = req.params;
  const order = db.getOrders().find((o) => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.refillStatus = 'Requested';
  res.json({ success: true, message: 'Refill requested successfully!', order });
});

// User Account API
app.get('/api/user/me', (req, res) => {
  const { userId = 'usr-demo' } = req.query;
  const user = db.getUser(String(userId));
  res.json({ user });
});

app.post('/api/user/add-funds', (req, res) => {
  return res.status(403).json({
    error: 'Direct balance addition is disabled. Please submit a deposit request via QR/UPI for admin approval.',
  });
});

// QR UPI Deposit Request with WhatsApp Redirect Integration
app.post('/api/user/deposit-request', async (req, res) => {
  try {
    const { userId = 'usr-demo', amount, utr, childPanelId } = req.body;
    const settings = db.getSettings();

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid deposit amount' });
    }

    if (!utr || String(utr).trim().length < 4) {
      return res.status(400).json({ error: 'Please enter a valid 12-digit UTR or Transaction ID' });
    }

    const user = db.getUser(userId);
    const username = user ? user.username : 'demouser';
    const effectiveChildPanelId = childPanelId || user?.childPanelId;
    const childPanel = effectiveChildPanelId ? db.getChildPanel(effectiveChildPanelId) : undefined;

    // Check if auto verify with merchant is enabled
    let isAutoVerified = false;
    if (settings.autoVerifyMerchant && settings.merchantId) {
      // In merchant auto-verification mode, if merchant auto-verify is configured, verify & auto-credit
      isAutoVerified = true;
    }

    const deposit = await db.addDepositRequest({
      userId: String(userId),
      username,
      amount: numAmount,
      utr: String(utr).trim(),
      paymentMethod: 'QR_UPI',
    });

    if (childPanel) {
      deposit.childPanelId = childPanel.id;
    }

    if (isAutoVerified) {
      db.approveDepositRequest(deposit.id);
    }

    // Format WhatsApp Message for Admin or Child Owner
    const panelName = childPanel?.branding?.panelName || settings.siteName || 'SMM SHIVAM';
    const cleanWaNum = (childPanel?.contact?.supportWhatsapp || childPanel?.contact?.whatsappNumber || settings.whatsappNumber).replace(/\D/g, '') || '9516862495';
    const waText =
      `*${panelName.toUpperCase()} - PAYMENT TOPUP REQUEST*\n` +
      `----------------------------------------\n` +
      `👤 *User:* ${username} (ID: ${userId})\n` +
      `💰 *Amount:* ₹${numAmount.toLocaleString('en-IN')}\n` +
      `📌 *UTR / Ref No:* \`${String(utr).trim()}\` \n` +
      `🕒 *Time:* ${new Date().toLocaleString()}\n` +
      `----------------------------------------\n` +
      `Please verify payment and credit funds to my ${panelName} account balance. Thanks!`;

    const encodedText = encodeURIComponent(waText);
    const whatsappUrl = `https://wa.me/91${cleanWaNum}?text=${encodedText}`;

    res.json({
      success: true,
      autoVerified: isAutoVerified,
      message: isAutoVerified
        ? 'Payment verified via Merchant ID! Funds added to your balance.'
        : 'Payment details submitted! Opening WhatsApp chat for instant approval...',
      deposit,
      whatsappUrl,
      whatsappNumber: cleanWaNum,
      formattedText: waText,
    });
  } catch (err: any) {
    console.error('API Deposit Request Error:', err);
    res.status(500).json({ error: err.message || 'Deposit request failed in Firebase RTDB' });
  }
});

// User Deposit Requests History
app.get('/api/user/deposits', (req, res) => {
  const userId = (req.query.userId as string) || 'usr-demo';
  const allDeposits = db.getDepositRequests();
  const userDeposits = allDeposits.filter(
    (d) => d.userId === userId || d.username === userId
  );
  res.json({ deposits: userDeposits });
});

// Admin Panel Settings Get & Post
app.get('/api/settings', (req, res) => {
  res.json({ settings: db.getSettings() });
});

app.post('/api/admin/settings', async (req, res) => {
  try {
    const updated = await db.updateSettings(req.body);
    res.json({ success: true, message: 'Settings saved successfully!', settings: updated });
  } catch (err: any) {
    console.error('API Admin Settings Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update settings in Firebase RTDB' });
  }
});

// Audio Upload Storage Directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create uploads directory:', e);
}

// 1. Audio Streaming Endpoint (Streams uploaded MP3/WAV/WebM/M4A directly with range headers & CORS)
app.get('/api/welcome-audio', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const possibleFiles = [
    'welcome_voice.mp3',
    'welcome_voice.m4a',
    'welcome_voice.wav',
    'welcome_voice.aac',
    'welcome_voice.webm',
    'welcome_voice.ogg',
  ];
  let audioFilePath = '';

  for (const file of possibleFiles) {
    const fullPath = path.join(UPLOADS_DIR, file);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 100) {
      audioFilePath = fullPath;
      break;
    }
  }

  if (!audioFilePath) {
    const pubDir = path.join(process.cwd(), 'public');
    for (const file of possibleFiles) {
      const fullPath = path.join(pubDir, file);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 100) {
        audioFilePath = fullPath;
        break;
      }
    }
  }

  // If still not on disk (e.g. fresh container startup after Render sleep), restore from cloud store
  if (!audioFilePath) {
    const restored = await db.restoreWelcomeAudioFile();
    if (restored) {
      const target = path.join(UPLOADS_DIR, 'welcome_voice.mp3');
      if (fs.existsSync(target) && fs.statSync(target).size > 100) {
        audioFilePath = target;
      }
    }
  }

  if (!audioFilePath || !fs.existsSync(audioFilePath)) {
    // If no uploaded audio on disk, check if settings has external URL
    const s = db.getSettings();
    if (s.welcomeVoiceUrl && s.welcomeVoiceUrl.startsWith('http')) {
      return res.redirect(302, s.welcomeVoiceUrl);
    }
    // Fallback to high quality royalty-free music stream URL so audio decoder never fails
    return res.redirect(302, 'https://assets.mixkit.co/music/preview/mixkit-cyber-city-108.mp3');
  }

  const stat = fs.statSync(audioFilePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const ext = path.extname(audioFilePath).toLowerCase();
  const contentType =
    ext === '.mp3'
      ? 'audio/mpeg'
      : ext === '.m4a'
      ? 'audio/mp4'
      : ext === '.aac'
      ? 'audio/aac'
      : ext === '.wav'
      ? 'audio/wav'
      : ext === '.webm'
      ? 'audio/webm'
      : ext === '.ogg'
      ? 'audio/ogg'
      : 'audio/mpeg';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(audioFilePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    };
    res.writeHead(200, head);
    fs.createReadStream(audioFilePath).pipe(res);
  }
});

// 2. Welcome Voice Public Info API
app.get('/api/welcome-voice', (req, res) => {
  const s = db.getSettings();
  res.json({
    enabled: s.welcomeVoiceEnabled !== false,
    audioUrl: s.welcomeVoiceUrl || '',
    name: s.welcomeVoiceName || '',
    text: s.welcomeVoiceText || 'WELCOME TO SMM SHIVAM OFFICIAL',
    volume: s.welcomeVoiceVolume !== undefined ? s.welcomeVoiceVolume : 0.9,
    playOnReload: s.welcomeVoicePlayOnReload !== false,
    mode: s.welcomeVoiceMode || 'custom_audio',
  });
});

// Helper: Save Base64 Audio data directly to uploads, public folder and Firebase Cloud Store
function saveBase64AudioFile(base64Data: string, originalName?: string): string {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    let ext = 'mp3';
    let base64Payload = base64Data;

    // Properly extract clean base64 payload without metadata header
    const commaIdx = base64Data.indexOf(',');
    if (commaIdx !== -1) {
      const header = base64Data.substring(0, commaIdx).toLowerCase();
      base64Payload = base64Data.substring(commaIdx + 1);

      if (header.includes('wav')) ext = 'wav';
      else if (header.includes('webm')) ext = 'webm';
      else if (header.includes('ogg')) ext = 'ogg';
      else if (header.includes('m4a') || header.includes('mp4') || header.includes('aac')) ext = 'm4a';
      else ext = 'mp3';
    }

    if (originalName) {
      const origExt = path.extname(originalName).replace('.', '').toLowerCase();
      if (['mp3', 'wav', 'webm', 'ogg', 'm4a', 'aac'].includes(origExt)) {
        ext = origExt;
      }
    }

    // Clean whitespace/newlines
    base64Payload = base64Payload.replace(/[^A-Za-z0-9+/=]/g, '');
    const buffer = Buffer.from(base64Payload, 'base64');

    const fileName = `welcome_voice.${ext}`;
    const targetPath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(targetPath, buffer);

    // Also write to public folder for static file serving fallback
    try {
      const pubDir = path.join(process.cwd(), 'public');
      if (fs.existsSync(pubDir)) {
        fs.writeFileSync(path.join(pubDir, 'welcome_voice.mp3'), buffer);
      }
    } catch (e) {}

    // Cloud Persistence: Sync to Firebase Realtime Database dedicated audio node
    try {
      fetch('https://smm-shivam-2-default-rtdb.firebaseio.com/welcome_audio_store.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Data,
          name: originalName || 'Official Welcome Audio',
          updatedAt: new Date().toISOString(),
        }),
      }).catch((e) => console.warn('Cloud audio store PUT notice:', e));
    } catch (e) {}

    return `/api/welcome-audio?t=${Date.now()}`;
  } catch (err) {
    console.error('Error saving audio file to disk:', err);
    return base64Data;
  }
}

// 3. Direct Audio File Upload Handler
app.post('/api/admin/welcome-voice/upload', async (req, res) => {
  try {
    const { audioData, base64Audio, fileName, name } = req.body;
    const rawAudio = audioData || base64Audio;

    if (!rawAudio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const audioUrl = saveBase64AudioFile(rawAudio, fileName || name);
    const audioName = fileName || name || 'Uploaded Audio Song.mp3';

    const updated = await db.updateSettings({
      welcomeVoiceEnabled: true,
      welcomeVoiceUrl: audioUrl,
      welcomeVoiceName: audioName,
      welcomeVoiceMode: 'custom_audio',
    });

    res.json({
      success: true,
      message: 'Audio song uploaded and saved successfully! Ready to play.',
      audioUrl,
      name: audioName,
      settings: updated,
    });
  } catch (err: any) {
    console.error('Audio upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to process audio upload' });
  }
});

// 4. Admin Welcome Voice Settings Save Handler
app.post('/api/admin/welcome-voice', async (req, res) => {
  try {
    const enabled = req.body.welcomeVoiceEnabled !== undefined ? req.body.welcomeVoiceEnabled : req.body.enabled;
    let audioUrl = req.body.welcomeVoiceUrl !== undefined ? req.body.welcomeVoiceUrl : req.body.audioUrl;
    const name = req.body.welcomeVoiceName !== undefined ? req.body.welcomeVoiceName : req.body.name;
    const text = req.body.welcomeVoiceText !== undefined ? req.body.welcomeVoiceText : req.body.text;
    const volume = req.body.welcomeVoiceVolume !== undefined ? req.body.welcomeVoiceVolume : req.body.volume;
    const playOnReload = req.body.welcomeVoicePlayOnReload !== undefined ? req.body.welcomeVoicePlayOnReload : req.body.playOnReload;
    const mode = req.body.welcomeVoiceMode !== undefined ? req.body.welcomeVoiceMode : req.body.mode;

    const payload: any = {};
    if (enabled !== undefined) payload.welcomeVoiceEnabled = Boolean(enabled);

    // If audioUrl is a large Base64 string, write it to disk and convert to fast streaming url
    if (audioUrl !== undefined) {
      if (typeof audioUrl === 'string' && audioUrl.startsWith('data:audio/')) {
        audioUrl = saveBase64AudioFile(audioUrl, name);
      }
      payload.welcomeVoiceUrl = String(audioUrl);
    }

    if (name !== undefined) payload.welcomeVoiceName = String(name);
    if (text !== undefined) payload.welcomeVoiceText = String(text);
    if (volume !== undefined) payload.welcomeVoiceVolume = Number(volume);
    if (playOnReload !== undefined) payload.welcomeVoicePlayOnReload = Boolean(playOnReload);
    if (mode !== undefined) payload.welcomeVoiceMode = mode;

    const updated = await db.updateSettings(payload);
    res.json({
      success: true,
      message: 'Welcome Voice updated successfully! All users will now hear this greeting on load.',
      settings: updated,
    });
  } catch (err: any) {
    console.error('Save welcome voice error:', err);
    res.status(500).json({ error: err.message || 'Failed to update Welcome Voice' });
  }
});

app.delete('/api/admin/welcome-voice', async (req, res) => {
  try {
    const updated = await db.updateSettings({
      welcomeVoiceEnabled: false,
      welcomeVoiceUrl: '',
      welcomeVoiceAudioData: '',
      welcomeVoiceName: '',
      welcomeVoiceText: '',
      welcomeVoiceMode: 'none',
    });
    res.json({
      success: true,
      message: 'Welcome Voice removed and disabled.',
      settings: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to remove Welcome Voice' });
  }
});

// Admin Deposit Requests List & Verification
app.get('/api/admin/deposits', (req, res) => {
  const deposits = db.getDepositRequests();
  res.json({ deposits });
});

app.post('/api/admin/deposits/:id/approve', (req, res) => {
  const { id } = req.params;
  const result = db.approveDepositRequest(id);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: 'Deposit approved and user balance updated!', ...result });
});

app.post('/api/admin/deposits/:id/reject', (req, res) => {
  const { id } = req.params;
  const deposit = db.rejectDepositRequest(id);
  if (!deposit) {
    return res.status(404).json({ error: 'Deposit request not found' });
  }
  res.json({ success: true, message: 'Deposit rejected', deposit });
});


// SMM API v2 Standard endpoint for panel clients
app.post('/api/v2', async (req, res) => {
  const { action, key, service, link, quantity, order } = req.body;

  // Validate API Key
  const users = db.getUsers();
  const user = users.find((u) => u.apiKey === key);

  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  if (action === 'services') {
    const activeServices = db.getServices(true);
    const formatted = activeServices.map((s) => ({
      service: s.id,
      name: s.serviceName,
      type: s.type || 'Default',
      category: s.category,
      rate: s.sellingRate.toFixed(4),
      min: s.min,
      max: s.max,
      refill: s.refill,
      cancel: s.cancel,
    }));
    return res.json(formatted);
  }

  if (action === 'balance') {
    return res.json({ balance: user.balance.toFixed(2), currency: 'USD' });
  }

  if (action === 'add') {
    const srv = db.getService(service);
    if (!srv || srv.status !== 'active') return res.json({ error: 'Invalid service ID' });

    const qty = Number(quantity);
    if (qty < srv.min || qty > srv.max) return res.json({ error: `Quantity must be ${srv.min} - ${srv.max}` });

    const totalSellingPrice = Number(((qty / 1000) * srv.sellingRate).toFixed(4));
    const totalProviderCost = Number(((qty / 1000) * srv.providerRate).toFixed(4));

    if (user.balance < totalSellingPrice) return res.json({ error: 'Not enough balance' });

    db.deductUserBalance(user.id, totalSellingPrice);

    const orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
    db.addOrder({
      id: orderId,
      userId: user.id,
      userName: user.username,
      serviceId: srv.id,
      serviceName: srv.serviceName,
      category: srv.category,
      providerId: srv.providerId,
      providerServiceId: srv.providerServiceId,
      link,
      quantity: qty,
      sellingPrice: totalSellingPrice,
      providerCost: totalProviderCost,
      profit: totalSellingPrice - totalProviderCost,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    });

    return res.json({ order: orderId });
  }

  if (action === 'status') {
    const existingOrder = db.getOrders().find((o) => o.id === order);
    if (!existingOrder) return res.json({ error: 'Incorrect order ID' });

    return res.json({
      charge: existingOrder.sellingPrice.toFixed(4),
      start_count: existingOrder.startCount || '0',
      status: existingOrder.status,
      remains: existingOrder.remains || '0',
      currency: 'USD',
    });
  }

  return res.json({ error: 'Invalid action parameter' });
});

// Support Tickets API
app.get('/api/tickets', (req, res) => {
  const { userId } = req.query;
  if (userId) {
    const userTickets = db.getUserTickets(String(userId));
    return res.json({ tickets: userTickets });
  }
  const allTickets = db.getTickets();
  res.json({ tickets: allTickets });
});

app.get('/api/admin/tickets', (req, res) => {
  const tickets = db.getTickets();
  res.json({ tickets });
});

app.post('/api/tickets', (req, res) => {
  const { userId, username, userEmail, whatsappNo, subject, orderId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'User ID and message are required' });
  }

  const newTicket = db.createTicket({
    userId,
    username,
    userEmail,
    whatsappNo,
    subject,
    orderId,
    message,
  });

  res.json({ success: true, message: 'Ticket created successfully!', ticket: newTicket });
});

app.post('/api/tickets/:id/reply', (req, res) => {
  const { id } = req.params;
  const { sender = 'user', text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Reply text cannot be empty' });
  }

  const result = db.replyTicket(id, sender, text);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, message: 'Reply sent successfully!', ticket: result.ticket });
});

app.post('/api/admin/tickets/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Open', 'In Progress', 'Answered', 'Closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid ticket status' });
  }

  const updated = db.updateTicketStatus(id, status);
  if (!updated) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  res.json({ success: true, message: `Ticket status updated to ${status}`, ticket: updated });
});

app.delete('/api/admin/tickets/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteTicket(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  res.json({ success: true, message: 'Ticket deleted successfully!' });
});

// ADMIN ROUTES

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  const stats = db.getAdminStats();
  res.json({ stats });
});

// Get Providers (Masking API Keys for security!)
app.get('/api/admin/providers', (req, res) => {
  const providers = db.getProviders();
  const safeProviders = providers.map((p) => {
    let maskedKey = '••••••••';
    if (p.apiKey && p.apiKey.length > 6) {
      maskedKey = p.apiKey.substring(0, 4) + '••••••••' + p.apiKey.substring(p.apiKey.length - 2);
    }
    return {
      ...p,
      apiKey: maskedKey, // Never return raw key to frontend
    };
  });
  res.json({ providers: safeProviders });
});

// Create/Update Provider
app.post('/api/admin/providers', (req, res) => {
  const { id, name, apiUrl, apiKey, status, markupPercentage, autoSync, autoSyncInterval } = req.body;

  if (!id || !apiUrl) {
    return res.status(400).json({ error: 'Provider ID and API URL are required' });
  }

  const existingProvider = db.getProvider(id);
  let finalKey = existingProvider?.apiKey || '';

  // Only update API key if a new unmasked key was provided
  if (apiKey && !apiKey.includes('••••')) {
    finalKey = apiKey.trim();
  }

  const updated = db.saveProvider({
    id,
    name: name || 'SMM Provider',
    apiUrl: apiUrl.trim(),
    apiKey: finalKey,
    status: status || 'active',
    markupPercentage: Number(markupPercentage) || 0,
    autoSync: autoSync ?? true,
    autoSyncInterval: autoSyncInterval || '6h',
  });

  // If markup changed, recalculate rates
  if (existingProvider && existingProvider.markupPercentage !== updated.markupPercentage) {
    ServiceSyncEngine.applyMarkupChange(updated.id, updated.markupPercentage);
  }

  res.json({
    success: true,
    message: 'Provider settings updated successfully!',
    provider: {
      ...updated,
      apiKey: '••••••••',
    },
  });
});

// Test Provider Connection
app.post('/api/admin/providers/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const provider = db.getProvider(id);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const client = new SMMProviderClient(provider.apiUrl, provider.apiKey);
    const result = await client.testConnection();

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Test connection failed' });
  }
});

// Preview Service Import
app.post('/api/admin/providers/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const preview = await ServiceSyncEngine.previewImport(id);
    res.json({ success: true, preview });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate preview' });
  }
});

// Import All Services
app.post('/api/admin/providers/:id/import', async (req, res) => {
  try {
    const { id } = req.params;
    const summary = await ServiceSyncEngine.syncProviderServices(id);
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Service import failed' });
  }
});

// Sync Services
app.post('/api/admin/providers/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const summary = await ServiceSyncEngine.syncProviderServices(id);
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Service synchronization failed' });
  }
});

// Categories Management Routes
app.get('/api/admin/categories', (req, res) => {
  const categories = db.getCategories();
  res.json({ categories });
});

app.post('/api/admin/categories', (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const cat = db.findOrCreateCategory(name.trim(), icon);
    res.json({ success: true, message: `Category "${cat.name}" added successfully!`, category: cat });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add category' });
  }
});

app.delete('/api/admin/categories/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteCategory(id);
  if (!deleted) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true, message: 'Category deleted successfully!' });
});

// Admin Get Services (Includes inactive)
app.get('/api/admin/services', (req, res) => {
  const services = db.getServices(false);
  const categories = db.getCategories();
  const providers = db.getProviders();

  res.json({ services, categories, providers });
});

// Admin Create Custom Service (written manually by Admin)
app.post('/api/admin/services', (req, res) => {
  try {
    const { serviceName, category, providerId, providerServiceId, providerRate, sellingRate, min, max, refill, cancel, description, status, type } = req.body;

    if (!serviceName || !serviceName.trim()) {
      return res.status(400).json({ error: 'Service name is required' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const newService = db.createService({
      serviceName: serviceName.trim(),
      category: category.trim(),
      providerId: providerId || 'manual',
      providerServiceId: providerServiceId ? providerServiceId.trim() : undefined,
      providerRate: Number(providerRate) || 0,
      sellingRate: Number(sellingRate) || 0,
      min: Number(min) || 10,
      max: Number(max) || 100000,
      refill: Boolean(refill),
      cancel: Boolean(cancel),
      description: description || '',
      status: status || 'active',
      type: type || 'Default',
    });

    res.json({ success: true, message: 'Custom service created successfully!', service: newService });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create service' });
  }
});

// Update Service Attributes / Selling Rate / Status
app.put('/api/admin/services/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updated = db.updateService(id, updates);
  if (!updated) return res.status(404).json({ error: 'Service not found' });

  res.json({ success: true, service: updated });
});

// Delete Service
app.delete('/api/admin/services/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteService(id);
  if (!deleted) return res.status(404).json({ error: 'Service not found' });

  res.json({ success: true, message: 'Service deleted successfully!' });
});

// Delete API Provider
app.delete('/api/admin/providers/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteProvider(id);
  if (!deleted) return res.status(404).json({ error: 'Provider not found' });

  res.json({ success: true, message: 'Provider deleted successfully!' });
});

// Admin Reset Data to Clean Fresh State
app.post('/api/admin/reset-data', (req, res) => {
  try {
    const refreshed = db.resetDataToFresh();
    res.json({ success: true, message: 'Platform data refreshed to clean fresh state successfully!', data: refreshed });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to refresh data' });
  }
});

// Admin Bulk Profit Margin % Update for ALL Services or Specific Category
app.post('/api/admin/services/bulk-margin', (req, res) => {
  const { marginPercentage, category } = req.body;
  const numericMargin = Number(marginPercentage);

  if (isNaN(numericMargin) || numericMargin < 0) {
    return res.status(400).json({ error: 'Valid non-negative margin percentage is required' });
  }

  const result = db.updateBulkProfitMargin(numericMargin, category);
  res.json({ success: true, ...result });
});

// Admin Get Orders (with Profit breakdown)
app.get('/api/admin/orders', (req, res) => {
  const orders = db.getOrders();
  res.json({ orders });
});

// Admin Update Order Status
app.put('/api/admin/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status, providerOrderId, remains } = req.body;

  const updated = db.updateOrderStatus(id, status, providerOrderId, remains);
  if (!updated) return res.status(404).json({ error: 'Order not found' });

  res.json({ success: true, order: updated });
});

// USER PROFILE SYNC ROUTE
app.post('/api/user/sync', (req, res) => {
  const userProfile = req.body;
  if (!userProfile || !userProfile.id || !userProfile.email) {
    return res.status(400).json({ error: 'Invalid user profile data' });
  }
  const saved = db.saveUser(userProfile);
  res.json({ success: true, user: saved });
});

// Check Username & Email Availability endpoint
app.get('/api/auth/check-username', (req, res) => {
  const queryUsername = String(req.query.username || '').trim().toLowerCase();
  const queryEmail = String(req.query.email || '').trim().toLowerCase();
  const users = db.getUsers();

  let usernameTaken = false;
  let emailTaken = false;

  if (queryUsername) {
    usernameTaken = users.some((u) => u.username && u.username.trim().toLowerCase() === queryUsername);
  }
  if (queryEmail) {
    emailTaken = users.some((u) => u.email && u.email.trim().toLowerCase() === queryEmail);
  }

  res.json({
    usernameTaken,
    emailTaken,
    available: !usernameTaken && !emailTaken,
    message: usernameTaken
      ? 'This username is already registered. Please choose a different username.'
      : emailTaken
      ? 'An account with this email address already exists. Please log in.'
      : 'Available',
  });
});

// REFERRAL & WITHDRAWAL API ROUTES
app.get('/api/user/referral', (req, res) => {
  const { userId = 'usr-demo' } = req.query;
  const data = db.getUserReferralData(String(userId));
  if (!data) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, ...data });
});

app.post('/api/user/referral/withdraw', (req, res) => {
  const { userId = 'usr-demo', amount, upiId, upiName } = req.body;
  const result = db.requestReferralWithdrawal(String(userId), Number(amount), String(upiId), String(upiName));
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: 'Withdrawal request submitted successfully!', withdrawal: result.withdrawal });
});

// ADMIN REFERRAL MANAGEMENT ROUTES
app.get('/api/admin/referral/stats', (req, res) => {
  const stats = db.getAdminReferralOverviewStats();
  res.json({ stats });
});

app.get('/api/admin/referral/withdrawals', (req, res) => {
  const withdrawals = db.getReferralWithdrawals();
  res.json({ withdrawals });
});

app.post('/api/admin/referral/withdrawals/:id/approve', (req, res) => {
  const { id } = req.params;
  const result = db.approveReferralWithdrawal(id);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: 'Withdrawal approved successfully!', withdrawal: result.withdrawal });
});

app.post('/api/admin/referral/withdrawals/:id/reject', (req, res) => {
  const { id } = req.params;
  const { adminNote } = req.body;
  const result = db.rejectReferralWithdrawal(id, adminNote);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: 'Withdrawal rejected and amount safely returned to user referral balance.', withdrawal: result.withdrawal });
});

app.get('/api/admin/referral/settings', (req, res) => {
  const settings = db.getReferralSettings();
  res.json({ settings });
});

app.post('/api/admin/referral/settings', (req, res) => {
  const settings = db.updateReferralSettings(req.body);
  res.json({ success: true, message: 'Referral settings updated successfully!', settings });
});

// Admin Get Users
app.get('/api/admin/users', (req, res) => {
  const users = db.getUsers();
  res.json({ users });
});

// Admin Update User Balance (Add or Reduce)
app.post('/api/admin/users/:id/balance', (req, res) => {
  const { id } = req.params;
  const { amount, action, currency = 'USD' } = req.body;

  let numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Valid positive amount is required' });
  }

  const settings = db.getSettings();
  const exchangeRate = settings.exchangeRateINR || 86;

  // Convert INR input to USD base balance if currency is INR
  if (currency === 'INR') {
    numericAmount = Number((numericAmount / exchangeRate).toFixed(4));
  }

  const user = db.getUser(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let updatedUser;
  if (action === 'reduce') {
    updatedUser = db.reduceUserBalance(id, numericAmount);
  } else {
    updatedUser = db.addUserBalance(id, numericAmount);
  }

  res.json({ success: true, user: updatedUser });
});

// Admin Update User Status (Block / Unblock)
app.post('/api/admin/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'active' && status !== 'blocked') {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updatedUser = db.updateUserStatus(id, status);
  if (!updatedUser) return res.status(404).json({ error: 'User not found' });

  res.json({ success: true, user: updatedUser });
});

// Admin Reset / Update User Password
app.post('/api/admin/users/:id/password', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Password cannot be empty' });
  }

  const updatedUser = db.updateUserPassword(id, password.trim());
  if (!updatedUser) return res.status(404).json({ error: 'User not found' });

  res.json({ success: true, message: 'Password updated successfully!', user: updatedUser });
});

// Admin Delete User
app.delete('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteUser(id);
  if (!deleted) {
    return res.status(400).json({ error: 'Cannot delete user or user is the primary Admin account' });
  }
  res.json({ success: true, message: 'User deleted successfully!' });
});

// Admin Clear All Registered Users (Fresh Platform Reset)
app.post('/api/admin/users/clear-all', (req, res) => {
  try {
    const result = db.clearAllNonAdminUsers();
    res.json({
      success: true,
      message: `All ${result.removedCount} non-admin user accounts removed. Platform is completely fresh!`,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear users' });
  }
});

// Admin Sync Logs
app.get('/api/admin/logs', (req, res) => {
  const logs = db.getSyncLogs();
  res.json({ logs });
});

// ============================================================================
// CHILD PANEL WHITE-LABEL & OWNER PORTAL API ROUTES
// ============================================================================

// 1. Test Custom API Connection
app.post('/api/panel/test-api', async (req, res) => {
  try {
    const { apiUrl, apiKey } = req.body;
    if (!apiUrl || !apiKey) {
      return res.status(400).json({ error: 'API URL and API Key are required' });
    }
    const client = new SMMProviderClient(apiUrl, apiKey);
    const result = await client.testConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Connection test failed' });
  }
});

// 1.5 Main Admin: Get and Update Global Child Panel Margin Rules
app.get('/api/admin/child-panels/margin-rules', (req, res) => {
  const settings = db.getSettings();
  res.json({
    childPanelAdminMarginPercentage: settings.childPanelAdminMarginPercentage ?? 15,
    childPanelDefaultOwnerMarginPercentage: settings.childPanelDefaultOwnerMarginPercentage ?? 25,
    childPanelMinMarginPercentage: settings.childPanelMinMarginPercentage ?? 5,
    childPanelMaxMarginPercentage: settings.childPanelMaxMarginPercentage ?? 300,
    childPanelPriceINR: settings.childPanelPriceINR ?? 499,
  });
});

app.post('/api/admin/child-panels/margin-rules', (req, res) => {
  try {
    const {
      adminMarginPercentage,
      defaultOwnerMarginPercentage,
      minMarginPercentage,
      maxMarginPercentage,
      childPanelPriceINR,
      applyToAllExistingPanels,
    } = req.body;

    if (adminMarginPercentage === undefined || isNaN(Number(adminMarginPercentage))) {
      return res.status(400).json({ error: 'Valid Admin margin percentage is required' });
    }

    const result = db.updateChildPanelAdminMarginRules({
      adminMarginPercentage: Number(adminMarginPercentage),
      defaultOwnerMarginPercentage: defaultOwnerMarginPercentage !== undefined ? Number(defaultOwnerMarginPercentage) : undefined,
      minMarginPercentage: minMarginPercentage !== undefined ? Number(minMarginPercentage) : undefined,
      maxMarginPercentage: maxMarginPercentage !== undefined ? Number(maxMarginPercentage) : undefined,
      childPanelPriceINR: childPanelPriceINR !== undefined ? Number(childPanelPriceINR) : undefined,
      applyToAllExistingPanels: Boolean(applyToAllExistingPanels),
    });

    res.json({
      success: true,
      message: `Admin Child Panel margin set to ${adminMarginPercentage}% successfully!${result.updatedCount > 0 ? ` Updated ${result.updatedCount} child panels.` : ''}`,
      settings: result.settings,
      updatedCount: result.updatedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update child panel margin rules' });
  }
});

// 2. Main Admin: Get All Child Panels
app.get('/api/admin/child-panels', (req, res) => {
  try {
    const childPanels = db.getChildPanels();
    const enriched = childPanels.map((p) => {
      const orders = db.getChildPanelOrders(p.id);
      const users = db.getChildPanelUsers(p.id);
      const totalRevenue = orders.reduce((sum, o) => sum + (o.sellingPrice || 0), 0);
      const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
      const totalChildProfit = orders.reduce((sum, o) => sum + (o.childOwnerProfit || 0), 0);
      const totalMainAdminProfit = orders.reduce((sum, o) => sum + (o.mainAdminProfit || 0), 0);

      return {
        ...p,
        totalOrdersCount: orders.length,
        totalUsersCount: users.length,
        totalRevenueINR: Number(totalRevenue.toFixed(2)),
        totalProfitINR: Number(totalProfit.toFixed(2)),
        totalChildProfitINR: Number(totalChildProfit.toFixed(2)),
        totalMainAdminProfitINR: Number(totalMainAdminProfit.toFixed(2)),
      };
    });
    res.json({ childPanels: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch child panels' });
  }
});

// 3. Main Admin: Get Single Child Panel Details
app.get('/api/admin/child-panels/:id', (req, res) => {
  const { id } = req.params;
  const childPanel = db.getChildPanel(id);
  if (!childPanel) return res.status(404).json({ error: 'Child panel not found' });

  const orders = db.getChildPanelOrders(childPanel.id);
  const users = db.getChildPanelUsers(childPanel.id);
  const deposits = db.getChildPanelDeposits(childPanel.id);
  const tickets = db.getChildPanelTickets(childPanel.id);
  const stats = db.getChildPanelStats(childPanel.id);

  res.json({
    childPanel,
    orders,
    users,
    deposits,
    tickets,
    stats,
  });
});

// 4. Main Admin: Create Child Panel
app.post('/api/admin/child-panels', (req, res) => {
  try {
    const result = db.createChildPanel(req.body);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({
      success: true,
      message: `Child panel "${result.childPanel?.name}" created successfully!`,
      childPanel: result.childPanel,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create child panel' });
  }
});

// 5. Main Admin: Update Child Panel
app.put('/api/admin/child-panels/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.updateChildPanel(id, req.body);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({
      success: true,
      message: 'Child panel updated successfully!',
      childPanel: result.childPanel,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update child panel' });
  }
});

// 6. Main Admin: Delete Child Panel
app.delete('/api/admin/child-panels/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.deleteChildPanel(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to delete child panel' });
    }
    res.json({ success: true, message: 'Child panel deleted successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete child panel' });
  }
});

// 7. Main Admin: Toggle Child Panel Status (Active / Disabled)
app.post('/api/admin/child-panels/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (status !== 'active' && status !== 'disabled') {
    return res.status(400).json({ error: 'Status must be active or disabled' });
  }
  const result = db.updateChildPanelStatus(id, status);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({
    success: true,
    message: `Child panel is now ${status}!`,
    childPanel: result.childPanel,
  });
});

// 8. Main Admin: Add or Reduce Wallet Balance for Child Panel
app.post('/api/admin/child-panels/:id/wallet', (req, res) => {
  const { id } = req.params;
  const { amount, action } = req.body;
  if (!amount || !action) {
    return res.status(400).json({ error: 'Amount and action (add/reduce) are required' });
  }
  const result = db.updateChildPanelWallet(id, Number(amount), action);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({
    success: true,
    message: `Wallet ${action === 'add' ? 'credited' : 'debited'} successfully!`,
    childPanel: result.childPanel,
  });
});

// 9. Main Admin: Get Isolated Child Panel Orders, Users, Deposits, Stats
app.get('/api/admin/child-panels/:id/orders', (req, res) => {
  const { id } = req.params;
  res.json({ orders: db.getChildPanelOrders(id) });
});

app.get('/api/admin/child-panels/:id/users', (req, res) => {
  const { id } = req.params;
  res.json({ users: db.getChildPanelUsers(id) });
});

app.get('/api/admin/child-panels/:id/deposits', (req, res) => {
  const { id } = req.params;
  res.json({ deposits: db.getChildPanelDeposits(id) });
});

app.get('/api/admin/child-panels/:id/stats', (req, res) => {
  const { id } = req.params;
  const { timeframe = 'all' } = req.query;
  res.json({ stats: db.getChildPanelStats(id, String(timeframe)) });
});

// --- CHILD PANEL OWNER PORTAL ROUTES ---

// Child Owner: Get My Panel & Profile
app.get('/api/child-owner/me', (req, res) => {
  const { ownerId, childPanelId } = req.query;
  const query = String(childPanelId || ownerId || '');
  const childPanel = db.getChildPanel(query);
  if (!childPanel) return res.status(404).json({ error: 'Child panel not found for this user' });

  const owner = db.getUser(childPanel.ownerId) || db.getUser(childPanel.ownerEmail);
  const stats = db.getChildPanelStats(childPanel.id);

  res.json({
    childPanel,
    owner,
    stats,
  });
});

// Child Owner: Update Branding
app.put('/api/child-owner/branding', (req, res) => {
  const { childPanelId, branding } = req.body;
  if (!childPanelId) return res.status(400).json({ error: 'Child panel ID is required' });
  const result = db.updateChildPanelBranding(childPanelId, branding);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({
    success: true,
    message: 'Child panel branding updated successfully! Main Admin branding remains completely intact.',
    childPanel: result.childPanel,
  });
});

// Child Owner: Update Pricing
app.put('/api/child-owner/pricing', (req, res) => {
  const { childPanelId, pricing } = req.body;
  if (!childPanelId) return res.status(400).json({ error: 'Child panel ID is required' });
  const result = db.updateChildPanelPricing(childPanelId, pricing);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({
    success: true,
    message: 'Pricing settings and margins updated successfully!',
    childPanel: result.childPanel,
  });
});

// Child Owner: Update Payment Methods (UPI / QR)
app.put('/api/child-owner/payment', (req, res) => {
  const { childPanelId, payment } = req.body;
  if (!childPanelId) return res.status(400).json({ error: 'Child panel ID is required' });
  const result = db.updateChildPanelPayment(childPanelId, payment);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({
    success: true,
    message: 'Payment methods updated successfully!',
    childPanel: result.childPanel,
  });
});

// Child Owner: Update Contact & Support
app.put('/api/child-owner/contact', (req, res) => {
  const { childPanelId, contact } = req.body;
  if (!childPanelId) return res.status(400).json({ error: 'Child panel ID is required' });
  const result = db.updateChildPanelContact(childPanelId, contact);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({
    success: true,
    message: 'Contact & support information updated successfully!',
    childPanel: result.childPanel,
  });
});

// Child Owner: Update API Settings (Option A / Option B)
app.put('/api/child-owner/api', (req, res) => {
  const { childPanelId, apiSettings } = req.body;
  if (!childPanelId) return res.status(400).json({ error: 'Child panel ID is required' });
  const result = db.updateChildPanelApi(childPanelId, apiSettings);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({
    success: true,
    message: 'API configuration updated successfully!',
    childPanel: result.childPanel,
  });
});

// Child Owner: Isolated Orders List
app.get('/api/child-owner/orders', (req, res) => {
  const { childPanelId } = req.query;
  if (!childPanelId) return res.status(400).json({ error: 'Child panel ID is required' });
  const orders = db.getChildPanelOrders(String(childPanelId));
  res.json({ orders });
});

// Child Owner: Isolated Users List
app.get('/api/child-owner/users', (req, res) => {
  const { childPanelId } = req.query;
  if (!childPanelId) return res.status(400).json({ error: 'Child panel ID is required' });
  const users = db.getChildPanelUsers(String(childPanelId));
  res.json({ users });
});

// Child Owner: Isolated Deposits List & Actions
app.get('/api/child-owner/deposits', (req, res) => {
  const { childPanelId } = req.query;
  if (!childPanelId) return res.status(400).json({ error: 'Child panel ID is required' });
  const deposits = db.getChildPanelDeposits(String(childPanelId));
  res.json({ deposits });
});

// Child Owner: Approve Deposit
app.post('/api/child-owner/deposits/:id/approve', (req, res) => {
  const { id } = req.params;
  const { childPanelId } = req.body;
  const deposit = db.getDepositRequests().find((d) => d.id === id);
  if (!deposit) return res.status(404).json({ error: 'Deposit request not found' });

  if (childPanelId && deposit.childPanelId && deposit.childPanelId !== childPanelId) {
    return res.status(403).json({ error: 'Unauthorized to approve deposits of another panel' });
  }

  const updated = db.approveDepositRequest(id);
  if (updated.error || !updated.deposit) return res.status(400).json({ error: updated.error || 'Could not approve deposit request' });

  res.json({
    success: true,
    message: `₹${updated.deposit.amount} approved and credited to ${updated.deposit.username}!`,
    deposit: updated.deposit,
  });
});

// Child Owner: Reject Deposit
app.post('/api/child-owner/deposits/:id/reject', (req, res) => {
  const { id } = req.params;
  const { childPanelId } = req.body;
  const deposit = db.getDepositRequests().find((d) => d.id === id);
  if (!deposit) return res.status(404).json({ error: 'Deposit request not found' });

  if (childPanelId && deposit.childPanelId && deposit.childPanelId !== childPanelId) {
    return res.status(403).json({ error: 'Unauthorized to reject deposits of another panel' });
  }

  const updated = db.rejectDepositRequest(id);
  if (!updated) return res.status(400).json({ error: 'Could not reject deposit request' });

  res.json({
    success: true,
    message: 'Deposit request rejected.',
    deposit: updated,
  });
});

// Child Owner: Isolated Tickets List
app.get('/api/child-owner/tickets', (req, res) => {
  const { childPanelId } = req.query;
  if (!childPanelId) return res.status(400).json({ error: 'Child panel ID is required' });
  const tickets = db.getChildPanelTickets(String(childPanelId));
  res.json({ tickets });
});

// Child Owner: Stats Analytics
app.get('/api/child-owner/stats', (req, res) => {
  const { childPanelId, timeframe = 'all' } = req.query;
  if (!childPanelId) return res.status(400).json({ error: 'Child panel ID is required' });
  const stats = db.getChildPanelStats(String(childPanelId), String(timeframe));
  res.json({ stats });
});

// --- CHILD PANEL PURCHASE REQUESTS API ---

// List Purchase Requests (Filtered by user, or all for Admin)
app.get('/api/child-panel-requests', (req, res) => {
  const { userId } = req.query;
  const requests = db.getChildPanelRequests(userId ? String(userId) : undefined);
  res.json({ requests });
});

// User: Submit Buy Child Panel Request
app.post('/api/child-panel-requests', (req, res) => {
  const {
    userId,
    username,
    userEmail,
    whatsappNo,
    requestedPanelName,
    requestedSlug,
    requestedDomain,
    amount,
    utr,
  } = req.body;

  if (!requestedPanelName || !requestedPanelName.trim()) {
    return res.status(400).json({ error: 'Desired Panel Name is required.' });
  }
  if (!requestedSlug || !requestedSlug.trim()) {
    return res.status(400).json({ error: 'Desired Panel Slug (for /panel/slug) is required.' });
  }
  if (!utr || !utr.trim()) {
    return res.status(400).json({ error: 'Payment UTR / Transaction Reference Number is required.' });
  }

  const result = db.createChildPanelRequest({
    userId,
    username,
    userEmail,
    whatsappNo,
    requestedPanelName,
    requestedSlug,
    requestedDomain,
    amount: Number(amount) || undefined,
    utr,
  });

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const settings = db.getSettings();
  const cleanWaNum = (settings.whatsappNumber || '9516862495').replace(/\D/g, '');
  const panelName = settings.siteName || 'SMM SHIVAM';

  const waText =
    `*⚡ ${panelName.toUpperCase()} - BUY CHILD PANEL REQUEST ⚡*\n` +
    `----------------------------------------\n` +
    `👤 *Username:* ${result.request?.username || username || 'User'}\n` +
    `📧 *Email:* ${result.request?.userEmail || userEmail}\n` +
    `📱 *WhatsApp:* +${result.request?.whatsappNo || whatsappNo}\n` +
    `🔑 *Reg Password:* ${result.request?.password || (db.getUser(userId)?.password || 'Saved in Admin')}\n` +
    `🏷️ *Panel Name:* ${result.request?.requestedPanelName}\n` +
    `🌐 *Slug / URL:* /panel/${result.request?.requestedSlug}\n` +
    (result.request?.requestedDomain ? `🌐 *Custom Domain:* ${result.request.requestedDomain}\n` : '') +
    `💰 *Amount Paid:* ₹${result.request?.amount || 499}\n` +
    `📌 *UTR / Ref No:* \`${result.request?.utr}\`\n` +
    `🕒 *Date/Time:* ${new Date().toLocaleString()}\n` +
    `----------------------------------------\n` +
    `Hello Admin, I have submitted payment for my Child Panel. Please verify my payment and approve my Child Panel. Thanks!`;

  const encodedText = encodeURIComponent(waText);
  const whatsappUrl = `https://wa.me/91${cleanWaNum}?text=${encodedText}`;

  res.json({
    success: true,
    message: 'Child panel purchase request submitted successfully! Opening WhatsApp chat for instant approval...',
    request: result.request,
    whatsappUrl,
    whatsappNumber: cleanWaNum,
    formattedText: waText,
  });
});

// Main Admin: Approve Child Panel Request
// Converts SAME existing user into CHILD_OWNER, creates unique childPanelId and panel, keeps all user data
app.post('/api/admin/child-panel-requests/:id/approve', (req, res) => {
  const { id } = req.params;
  const { adminNote } = req.body;

  const result = db.approveChildPanelRequest(id, adminNote);
  if (!result.success || result.error) {
    return res.status(400).json({ error: result.error || 'Failed to approve request' });
  }

  res.json({
    success: true,
    message: `Purchase request approved! User "${result.user?.username}" has been converted to Child Owner with panel "${result.childPanel?.name}".`,
    request: result.request,
    childPanel: result.childPanel,
    user: result.user,
  });
});

// Main Admin: Reject Child Panel Request
app.post('/api/admin/child-panel-requests/:id/reject', (req, res) => {
  const { id } = req.params;
  const { adminNote } = req.body;

  const result = db.rejectChildPanelRequest(id, adminNote);
  if (!result.success || result.error) {
    return res.status(400).json({ error: result.error || 'Failed to reject request' });
  }

  res.json({
    success: true,
    message: 'Child panel purchase request has been rejected.',
    request: result.request,
  });
});

// START SERVER / VITE MIDDLEWARE

async function start() {
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.SERVERLESS) {
    // In Netlify / Lambda serverless environment, express app is exported to serverless handler
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application build not found. Please run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SMM Panel Server running at http://0.0.0.0:${PORT}`);
  });
}

start();

export default app;
