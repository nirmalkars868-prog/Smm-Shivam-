import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/store';
import { SMMProviderClient } from './src/services/smmProvider';
import { ServiceSyncEngine } from './src/services/serviceSync';
import { Order, Ticket } from './src/types';

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

// 2. Public / User Services & Categories
app.get('/api/services', (req, res) => {
  db.cleanEmptyCategories();
  const categories = db.getCategories();
  const services = db.getServices(true); // only active services
  const settings = db.getSettings();

  res.json({
    categories,
    services,
    settings,
  });
});

// 3. Place Order
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

    // Financial calculations
    const qtyMultiplier = numQty / 1000;
    const totalSellingPrice = Number((service.sellingRate * qtyMultiplier).toFixed(4));
    const totalProviderCost = Number((service.providerRate * qtyMultiplier).toFixed(4));
    const netProfit = Number((totalSellingPrice - totalProviderCost).toFixed(4));

    if (user.balance < totalSellingPrice) {
      return res.status(400).json({
        error: `Insufficient balance. Required: ₹${totalSellingPrice.toFixed(2)}, Available: ₹${user.balance.toFixed(2)}`,
      });
    }

    // Get provider info
    const provider = db.getProvider(service.providerId);
    let providerOrderId: string | undefined = undefined;

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

    // Deduct user balance only after provider check or order confirmation
    db.deductUserBalance(userId, totalSellingPrice);

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
      createdAt: new Date().toISOString(),
    };

    db.addOrder(newOrder);

    res.json({
      success: true,
      message: 'Order placed successfully!',
      order: newOrder,
      newBalance: db.getUser(userId)?.balance,
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
    const { userId = 'usr-demo', amount, utr } = req.body;
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

    if (isAutoVerified) {
      db.approveDepositRequest(deposit.id);
    }

    // Format WhatsApp Message for Admin
    const cleanWaNum = settings.whatsappNumber.replace(/\D/g, '') || '9516862495';
    const waText =
      `*SMM SHIVAM PANEL - PAYMENT TOPUP REQUEST*\n` +
      `----------------------------------------\n` +
      `👤 *User:* ${username} (ID: ${userId})\n` +
      `💰 *Amount:* ₹${numAmount.toLocaleString('en-IN')}\n` +
      `📌 *UTR / Ref No:* \`${String(utr).trim()}\` \n` +
      `🕒 *Time:* ${new Date().toLocaleString()}\n` +
      `----------------------------------------\n` +
      `Please verify payment and credit funds to my SMM SHIVAM account balance. Thanks!`;

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

// Tickets API
app.get('/api/tickets', (req, res) => {
  res.json({ tickets: db.getAdminStats() });
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

// Admin Bulk Profit Margin % Update for ALL Services
app.post('/api/admin/services/bulk-margin', (req, res) => {
  const { marginPercentage } = req.body;
  const numericMargin = Number(marginPercentage);

  if (isNaN(numericMargin) || numericMargin < 0) {
    return res.status(400).json({ error: 'Valid non-negative margin percentage is required' });
  }

  const result = db.updateBulkProfitMargin(numericMargin);
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
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SMM Panel Server running at http://0.0.0.0:${PORT}`);
  });
}

start();

export default app;
