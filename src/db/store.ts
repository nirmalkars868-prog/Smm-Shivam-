import fs from 'fs';
import path from 'path';
import { rtdb, serverAuth } from './firebase.js';
import { getDatabase, ref, get, set, update, push, remove, runTransaction, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

let rtdbWriteDisabled = false;
import {
  AdminSettings,
  Category,
  ChildPanel,
  ChildPanelApiSettings,
  ChildPanelBranding,
  ChildPanelContact,
  ChildPanelPayment,
  ChildPanelPermissions,
  ChildPanelPricing,
  ChildPanelPurchaseRequest,
  DepositRequest,
  Order,
  Provider,
  ReferralCommission,
  ReferralSettings,
  ReferralWithdrawal,
  Service,
  ServiceUpdateLog,
  SyncLog,
  SyncSummary,
  Ticket,
  User,
} from '../types.js';

interface DatabaseSchema {
  providers: Provider[];
  categories: Category[];
  services: Service[];
  orders: Order[];
  users: User[];
  syncLogs: SyncLog[];
  serviceUpdates: ServiceUpdateLog[];
  tickets: Ticket[];
  depositRequests: DepositRequest[];
  referralCommissions?: ReferralCommission[];
  referralWithdrawals?: ReferralWithdrawal[];
  childPanels?: ChildPanel[];
  childPanelRequests?: ChildPanelPurchaseRequest[];
  settings: AdminSettings;
}

const defaultReferralSettings: ReferralSettings = {
  enabled: true,
  level1Percentage: 25,
  level2Percentage: 5,
  minimumDepositINR: 100,
  minimumWithdrawalINR: 100,
};

const defaultSettings: AdminSettings = {
  siteName: 'SMM SHIVAM',
  whatsappNumber: '9516862495',
  orderWhatsappNumber: '9516862395',
  whatsappChatUrl: 'https://wa.me/919516862495',
  whatsappChannelUrl: 'https://whatsapp.com/channel/smm_shivam_official',
  telegramUrl: 'https://t.me/smm_shivam_official',
  youtubeUrl: 'https://youtube.com/@smmshivam',
  youtubeSubscribersText: 'YouTube Subscribe',
  upiId: '9770571091@ybl',
  merchantId: 'SHIVAM_MERCHANT_9770',
  merchantSecret: process.env.MERCHANT_SECRET || '',
  autoVerifyMerchant: true,
  minDepositINR: 10,
  exchangeRateINR: 86,
  childPanelPriceINR: 499,
  childPanelDescription: 'Start your own automated SMM panel business with instant white-label branding, your own UPI payment QR, custom domain & /panel/slug access.',
  childPanelAdminMarginPercentage: 15,
  childPanelDefaultOwnerMarginPercentage: 25,
  childPanelMinMarginPercentage: 5,
  childPanelMaxMarginPercentage: 300,
  notice: '⚡ Welcome to SMM SHIVAM Panel! Scan QR Code to add funds instantly via UPI & WhatsApp auto-verification.',
  popupNoticeEnabled: true,
  popupNoticeTitle: '🔥 SPECIAL ANNOUNCEMENT & OFFER',
  popupNoticeText: 'Welcome to SMM SHIVAM Panel! Get extra bonuses on UPI Add Funds, lightning fast server speeds, and 24/7 WhatsApp customer support.',
  popupNoticeType: 'offer',
  popupNoticeButtonText: 'Add Funds Now',
  popupNoticeButtonLink: '#add-funds',
  topAlertBarEnabled: true,
  topAlertBarText: '⚡ SMM SHIVAM: Instant UPI Deposits Live | WhatsApp Support: +91 9516862495 | Best High-Speed SMM Services!',
  defaultProfitMarginPercentage: 20,
  currency: 'USD',
  currencySymbol: '$',
  theme: 'default-dark',
  snowEffect: false,
  referralSettings: defaultReferralSettings,
  // Welcome Voice default settings
  welcomeVoiceEnabled: true,
  welcomeVoiceUrl: '',
  welcomeVoiceAudioData: '',
  welcomeVoiceName: '',
  welcomeVoiceText: 'WELCOME TO SMM SHIVAM OFFICIAL',
  welcomeVoiceVolume: 0.95,
  welcomeVoicePlayOnReload: true,
  welcomeVoiceMode: 'custom_audio',
};

// Initial Seed Data
const defaultProviders: Provider[] = [
  {
    id: 'smmdip',
    name: 'SMMDIP Main Provider',
    apiUrl: 'https://smmdip.com/api/v2',
    apiKey: process.env.SMMDIP_API_KEY || '',
    status: 'active',
    markupPercentage: 20,
    autoSync: true,
    autoSyncInterval: '6h',
    lastSyncAt: new Date().toISOString(),
    lastSyncStatus: 'success',
    lastSyncSummary: {
      checked: 16,
      newServices: 16,
      updatedServices: 0,
      inactiveServices: 0,
      errors: 0,
      message: 'Initial auto-import complete.',
      timestamp: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Instagram Followers', icon: 'Instagram', sortOrder: 1 },
  { id: 'cat-2', name: 'Instagram Likes', icon: 'Heart', sortOrder: 2 },
  { id: 'cat-3', name: 'Instagram Views', icon: 'Play', sortOrder: 3 },
  { id: 'cat-4', name: 'YouTube Services', icon: 'Youtube', sortOrder: 4 },
  { id: 'cat-5', name: 'Telegram Members', icon: 'Send', sortOrder: 5 },
];

const defaultServices: Service[] = [
  {
    id: 'srv-1',
    providerId: 'smmdip',
    providerServiceId: '1001',
    serviceName: 'Instagram Real Followers | 30 Days Auto Refill | High Speed',
    category: 'Instagram Followers',
    type: 'Default',
    providerRate: 0.45,
    sellingRate: 0.54, // 20% markup
    min: 100,
    max: 500000,
    refill: true,
    cancel: true,
    description: 'Instant start. Safe for account. 30 days guaranteed button refill.',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'srv-2',
    providerId: 'smmdip',
    providerServiceId: '1002',
    serviceName: 'Instagram Guaranteed Followers | Non Drop | 365 Days Refill',
    category: 'Instagram Followers',
    type: 'Default',
    providerRate: 0.85,
    sellingRate: 1.02, // 20% markup
    min: 100,
    max: 1000000,
    refill: true,
    cancel: true,
    description: 'Premium quality HQ followers. 365 days auto refill guarantee.',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'srv-3',
    providerId: 'smmdip',
    providerServiceId: '1003',
    serviceName: 'Instagram Organic Likes | Instant Start | Real Accounts',
    category: 'Instagram Likes',
    type: 'Default',
    providerRate: 0.12,
    sellingRate: 0.144, // 20% markup
    min: 50,
    max: 100000,
    refill: false,
    cancel: true,
    description: 'Real active profile likes. Instant delivery within 5-10 minutes.',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'srv-4',
    providerId: 'smmdip',
    providerServiceId: '1004',
    serviceName: 'Instagram Reel Views + Impressions | Instant 100K/day',
    category: 'Instagram Views',
    type: 'Default',
    providerRate: 0.04,
    sellingRate: 0.048,
    min: 500,
    max: 5000000,
    refill: false,
    cancel: true,
    description: 'Boost viral reach on Instagram Reels. High speed delivery.',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'srv-5',
    providerId: 'smmdip',
    providerServiceId: '2001',
    serviceName: 'YouTube High Retention Views | Monetizable | 60 Days Refill',
    category: 'YouTube Services',
    type: 'Default',
    providerRate: 1.20,
    sellingRate: 1.44,
    min: 500,
    max: 500000,
    refill: true,
    cancel: false,
    description: 'Watch time booster, safe for YouTube Partner Program channels.',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'srv-6',
    providerId: 'smmdip',
    providerServiceId: '2002',
    serviceName: 'YouTube Real Subscribers | Non-Drop | 100-200/day Speed',
    category: 'YouTube Services',
    type: 'Default',
    providerRate: 8.50,
    sellingRate: 10.20,
    min: 100,
    max: 10000,
    refill: true,
    cancel: false,
    description: 'Real subscribers with natural speed dripfeed to avoid drop.',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'srv-7',
    providerId: 'smmdip',
    providerServiceId: '3001',
    serviceName: 'Telegram Channel Members | Global Accounts | Silent Join',
    category: 'Telegram Members',
    type: 'Default',
    providerRate: 0.35,
    sellingRate: 0.42,
    min: 200,
    max: 200000,
    refill: true,
    cancel: true,
    description: 'High quality channel subscribers. Speed up to 50k per day.',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'srv-8',
    providerId: 'smmdip',
    providerServiceId: '4001',
    serviceName: 'TikTok Followers | Fast Start | High Retention',
    category: 'TikTok Services',
    type: 'Default',
    providerRate: 0.95,
    sellingRate: 1.14,
    min: 100,
    max: 100000,
    refill: true,
    cancel: true,
    description: 'High quality TikTok profile followers.',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultUsers: User[] = [
  {
    id: 'usr-admin',
    username: 'yourshivamff_',
    email: 'admin@smmshivam.com',
    whatsappNo: '919516862495',
    balance: 500.0,
    totalSpent: 0,
    role: 'admin',
    apiKey: 'usr_api_key_88f910a2b',
    status: 'active',
    referralCode: 'ADMIN09',
    referralBalance: 0,
    totalReferralEarnings: 0,
    totalReferralWithdrawn: 0,
    referralEligible: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-child-owner-1',
    username: 'abcdigital_owner',
    email: 'owner@abcdigital.com',
    whatsappNo: '919876543210',
    password: 'abcownerpassword123',
    balance: 1250.0,
    totalSpent: 3640.0,
    role: 'child_owner',
    childPanelId: 'cp-abc101',
    apiKey: 'cp_owner_api_key_abc77',
    status: 'active',
    referralCode: 'ABCOWN01',
    referralBalance: 0,
    totalReferralEarnings: 0,
    totalReferralWithdrawn: 0,
    referralEligible: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'usr-child-customer-1',
    username: 'rohit_customer',
    email: 'rohit@gmail.com',
    whatsappNo: '919123456780',
    password: 'customerpass123',
    balance: 340.0,
    totalSpent: 1200.0,
    role: 'user',
    childPanelId: 'cp-abc101',
    apiKey: 'usr_cp_cust_881',
    status: 'active',
    referralCode: 'ROHIT01',
    referralBalance: 0,
    totalReferralEarnings: 0,
    totalReferralWithdrawn: 0,
    referralEligible: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

const defaultChildPanels: ChildPanel[] = [
  {
    id: 'cp-abc101',
    name: 'ABC DIGITAL SMM',
    slug: 'abc',
    subdomain: 'abc.smmshivam.com',
    customDomain: 'www.abcdigitalsmm.com',
    ownerId: 'usr-child-owner-1',
    ownerName: 'Rahul Verma (ABC Digital)',
    ownerEmail: 'owner@abcdigital.com',
    ownerPassword: 'abcownerpassword123',
    ownerWhatsapp: '919876543210',
    status: 'active',
    permissions: {
      brandingCustomization: true,
      apiAccess: true,
      pricingCustomization: true,
      paymentCustomization: true,
      categoryServiceSelection: true,
    },
    branding: {
      panelName: 'ABC DIGITAL SMM',
      logoUrl: '',
      faviconUrl: '',
      theme: 'cyberpunk-neon',
      accentColor: '#38bdf8',
      loginPageTitle: 'ABC Digital SMM - Wholesale Social Panel',
      footerText: '© 2026 ABC Digital SMM. All rights reserved.',
    },
    contact: {
      whatsappNumber: '919876543210',
      supportWhatsapp: '919876543210',
      supportEmail: 'support@abcdigital.com',
      supportTelegram: 'https://t.me/abcdigital_support',
      contactNumber: '+91 98765 43210',
      supportMessage: '⚡ ABC DIGITAL 24x7 Customer Support. Instant response via WhatsApp!',
    },
    payment: {
      upiId: 'abcdigital@upi',
      upiName: 'ABC DIGITAL SMM',
      qrCodeUrl: '',
      minDepositINR: 50,
      instructions: 'Pay using any UPI app (GPay / PhonePe / Paytm) and enter the 12-digit UTR number.',
    },
    pricing: {
      defaultMarginPercent: 30, // 30% markup on top of Main Admin price
      minAllowedMarginPercent: 10,
      maxAllowedMarginPercent: 300,
      serviceCustomPrices: {},
    },
    apiSettings: {
      useMainAdminApi: true,
      apiProviderName: 'Main SMM API Proxy',
      apiUrl: 'https://smmshivam.com/api/v2',
      apiKey: 'sec_cp_abc_99281x',
      status: 'connected',
      lastTestedAt: new Date().toISOString(),
    },
    allowedCategoryIds: [],
    allowedServiceIds: [],
    walletBalance: 1250.0,
    totalRevenueINR: 4890.0,
    totalOrdersCount: 28,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultOrders: Order[] = [];

function cleanForFirebase(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj === 'number' || typeof obj === 'string' || typeof obj === 'boolean') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanForFirebase(item));
  }
  if (typeof obj === 'object') {
    const cleanObj: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleanObj[key] = cleanForFirebase(val);
      }
    }
    return cleanObj;
  }
  return obj;
}

function ensureArray<T>(data: any): T[] {
  if (!data) return [];
  let arr: T[] = [];
  if (Array.isArray(data)) {
    arr = data.filter(Boolean);
  } else if (typeof data === 'object') {
    arr = Object.values(data).filter(Boolean) as T[];
  }
  const map = new Map<string, T>();
  const withoutId: T[] = [];
  for (const item of arr) {
    if (item && typeof item === 'object' && 'id' in item && (item as any).id) {
      map.set(String((item as any).id), item);
    } else {
      withoutId.push(item);
    }
  }
  return Array.from(map.values()).concat(withoutId);
}

class DatabaseStore {
  private memoryDb: DatabaseSchema;
  private filePath = path.join(process.cwd(), 'smm_store_data.json');

  constructor() {
    this.memoryDb = {
      providers: defaultProviders,
      categories: defaultCategories,
      services: defaultServices,
      orders: defaultOrders,
      users: defaultUsers,
      syncLogs: [],
      serviceUpdates: [],
      tickets: [],
      depositRequests: [],
      childPanels: defaultChildPanels,
      childPanelRequests: [],
      settings: defaultSettings,
    };

    this.loadFromDisk();
    this.initRtdbStore();
  }

  private saveToDisk() {
    try {
      const dataStr = JSON.stringify(this.memoryDb, null, 2);
      fs.writeFileSync(this.filePath, dataStr, 'utf-8');
    } catch (err) {
      console.warn('store.ts saveToDisk warning:', err);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.providers && Array.isArray(parsed.providers) && parsed.providers.length > 0) {
            this.memoryDb.providers = parsed.providers;
          }
          if (parsed.categories && Array.isArray(parsed.categories)) {
            this.memoryDb.categories = parsed.categories;
          }
          if (parsed.services && Array.isArray(parsed.services) && parsed.services.length > 0) {
            this.memoryDb.services = parsed.services;
          }
          if (parsed.orders && Array.isArray(parsed.orders)) {
            this.memoryDb.orders = parsed.orders;
          }
          if (parsed.users && Array.isArray(parsed.users) && parsed.users.length > 0) {
            this.memoryDb.users = parsed.users;
          }
          if (parsed.depositRequests && Array.isArray(parsed.depositRequests)) {
            this.memoryDb.depositRequests = parsed.depositRequests;
          }
          if (parsed.referralCommissions && Array.isArray(parsed.referralCommissions)) {
            this.memoryDb.referralCommissions = parsed.referralCommissions;
          }
          if (parsed.referralWithdrawals && Array.isArray(parsed.referralWithdrawals)) {
            this.memoryDb.referralWithdrawals = parsed.referralWithdrawals;
          }
          if (parsed.childPanels && Array.isArray(parsed.childPanels) && parsed.childPanels.length > 0) {
            this.memoryDb.childPanels = parsed.childPanels;
          }
          if (parsed.childPanelRequests && Array.isArray(parsed.childPanelRequests)) {
            this.memoryDb.childPanelRequests = parsed.childPanelRequests;
          }
          if (parsed.settings) {
            this.memoryDb.settings = {
              ...defaultSettings,
              ...parsed.settings,
              referralSettings: {
                ...defaultReferralSettings,
                ...((parsed.settings && parsed.settings.referralSettings) || {}),
              },
            };
            this.restoreWelcomeAudioFile();
          }
          console.log('⚡ Loaded store data from local persistent disk JSON file');
        }
      }
    } catch (err) {
      console.warn('store.ts loadFromDisk warning:', err);
    }
  }

  public restoreWelcomeAudioFile(): void {
    try {
      const audioData = this.memoryDb.settings?.welcomeVoiceAudioData;
      if (!audioData || typeof audioData !== 'string' || audioData.length < 50) {
        return;
      }
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const targetFile = path.join(uploadsDir, 'welcome_voice.mp3');
      if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size < 100) {
        let base64Payload = audioData;
        const commaIdx = audioData.indexOf(',');
        if (commaIdx !== -1) {
          base64Payload = audioData.substring(commaIdx + 1);
        }
        base64Payload = base64Payload.replace(/[^A-Za-z0-9+/=]/g, '');
        const buffer = Buffer.from(base64Payload, 'base64');
        fs.writeFileSync(targetFile, buffer);
        console.log('⚡ Restored persistent welcome voice song from cloud store to disk (' + buffer.length + ' bytes)');
      }
    } catch (e) {
      console.warn('restoreWelcomeAudioFile warning:', e);
    }
  }

  private static RTDB_REST_URL = 'https://smm-shivam-2-default-rtdb.firebaseio.com';

  private async fetchCloudRtdbData(): Promise<void> {
    try {
      const res = await fetch(`${DatabaseStore.RTDB_REST_URL}/smm_store.json`);
      if (res.ok) {
        const parsed = await res.json();
        if (parsed && typeof parsed === 'object') {
          console.log('⚡ Successfully fetched persistent cloud database from Firebase RTDB REST API');
          if (parsed.providers) this.memoryDb.providers = ensureArray<Provider>(parsed.providers);
          if (parsed.categories) this.memoryDb.categories = ensureArray<Category>(parsed.categories);
          if (parsed.services) this.memoryDb.services = ensureArray<Service>(parsed.services);
          if (parsed.orders) this.memoryDb.orders = ensureArray<Order>(parsed.orders);
          if (parsed.users) this.memoryDb.users = ensureArray<User>(parsed.users);
          if (parsed.syncLogs) this.memoryDb.syncLogs = ensureArray<SyncLog>(parsed.syncLogs);
          if (parsed.serviceUpdates) this.memoryDb.serviceUpdates = ensureArray<ServiceUpdateLog>(parsed.serviceUpdates);
          if (parsed.tickets) this.memoryDb.tickets = ensureArray<Ticket>(parsed.tickets);
          if (parsed.depositRequests) this.memoryDb.depositRequests = ensureArray<DepositRequest>(parsed.depositRequests);
          if (parsed.referralCommissions) this.memoryDb.referralCommissions = ensureArray<ReferralCommission>(parsed.referralCommissions);
          if (parsed.referralWithdrawals) this.memoryDb.referralWithdrawals = ensureArray<ReferralWithdrawal>(parsed.referralWithdrawals);
          if (parsed.childPanels) this.memoryDb.childPanels = ensureArray<ChildPanel>(parsed.childPanels);
          if (parsed.childPanelRequests) this.memoryDb.childPanelRequests = ensureArray<ChildPanelPurchaseRequest>(parsed.childPanelRequests);
          if (parsed.settings) {
            this.memoryDb.settings = {
              ...defaultSettings,
              ...parsed.settings,
              referralSettings: {
                ...defaultReferralSettings,
                ...((parsed.settings && parsed.settings.referralSettings) || {}),
              },
            };
            this.restoreWelcomeAudioFile();
          }
          this.cleanEmptyCategories();
          this.ensureAdminUserCredentials();
          this.saveToDisk();
        }
      }
    } catch (err) {
      console.warn('Firebase RTDB REST initial fetch warning:', err);
    }
  }

  private initRtdbStore() {
    this.cleanEmptyCategories();
    this.sanitizeUsersReferralCodes();
    this.ensureAdminUserCredentials();

    // 1. Immediately fetch persistent cloud data via REST
    this.fetchCloudRtdbData();

    if (rtdb) {
      const storeRef = ref(rtdb, 'smm_store');
      get(storeRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const parsed = snapshot.val();
            if (parsed) {
              console.log('⚡ Loaded store data from Firebase Realtime Database SDK');
              if (parsed.providers) this.memoryDb.providers = ensureArray<Provider>(parsed.providers);
              if (parsed.categories) this.memoryDb.categories = ensureArray<Category>(parsed.categories);
              if (parsed.services) this.memoryDb.services = ensureArray<Service>(parsed.services);
              if (parsed.orders) this.memoryDb.orders = ensureArray<Order>(parsed.orders);
              if (parsed.users) this.memoryDb.users = ensureArray<User>(parsed.users);
              if (parsed.syncLogs) this.memoryDb.syncLogs = ensureArray<SyncLog>(parsed.syncLogs);
              if (parsed.serviceUpdates) this.memoryDb.serviceUpdates = ensureArray<ServiceUpdateLog>(parsed.serviceUpdates);
              if (parsed.tickets) this.memoryDb.tickets = ensureArray<Ticket>(parsed.tickets);
              if (parsed.depositRequests) this.memoryDb.depositRequests = ensureArray<DepositRequest>(parsed.depositRequests);
              if (parsed.referralCommissions) this.memoryDb.referralCommissions = ensureArray<ReferralCommission>(parsed.referralCommissions);
              if (parsed.referralWithdrawals) this.memoryDb.referralWithdrawals = ensureArray<ReferralWithdrawal>(parsed.referralWithdrawals);
              if (parsed.childPanels) this.memoryDb.childPanels = ensureArray<ChildPanel>(parsed.childPanels);
              if (parsed.childPanelRequests) this.memoryDb.childPanelRequests = ensureArray<ChildPanelPurchaseRequest>(parsed.childPanelRequests);
              if (parsed.settings) {
                this.memoryDb.settings = {
                  ...defaultSettings,
                  ...parsed.settings,
                  referralSettings: {
                    ...defaultReferralSettings,
                    ...((parsed.settings && parsed.settings.referralSettings) || {}),
                  },
                };
                this.restoreWelcomeAudioFile();
              }
              this.cleanEmptyCategories();
              this.ensureAdminUserCredentials();
              this.saveToDisk();
            }
          }
        })
        .catch(() => {});

      // Realtime listener for server memory cache synchronization
      onValue(
        storeRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const parsed = snapshot.val();
            if (parsed) {
              if (parsed.providers) this.memoryDb.providers = ensureArray<Provider>(parsed.providers);
              if (parsed.categories) this.memoryDb.categories = ensureArray<Category>(parsed.categories);
              if (parsed.services) this.memoryDb.services = ensureArray<Service>(parsed.services);
              if (parsed.orders) this.memoryDb.orders = ensureArray<Order>(parsed.orders);
              if (parsed.users) this.memoryDb.users = ensureArray<User>(parsed.users);
              if (parsed.tickets) this.memoryDb.tickets = ensureArray<Ticket>(parsed.tickets);
              if (parsed.depositRequests) this.memoryDb.depositRequests = ensureArray<DepositRequest>(parsed.depositRequests);
              if (parsed.referralCommissions) this.memoryDb.referralCommissions = ensureArray<ReferralCommission>(parsed.referralCommissions);
              if (parsed.referralWithdrawals) this.memoryDb.referralWithdrawals = ensureArray<ReferralWithdrawal>(parsed.referralWithdrawals);
              if (parsed.childPanels) this.memoryDb.childPanels = ensureArray<ChildPanel>(parsed.childPanels);
              if (parsed.childPanelRequests) this.memoryDb.childPanelRequests = ensureArray<ChildPanelPurchaseRequest>(parsed.childPanelRequests);
              if (parsed.settings) {
                this.memoryDb.settings = {
                  ...defaultSettings,
                  ...parsed.settings,
                  referralSettings: {
                    ...defaultReferralSettings,
                    ...((parsed.settings && parsed.settings.referralSettings) || {}),
                  },
                };
                this.restoreWelcomeAudioFile();
              }
              this.ensureAdminUserCredentials();
              this.saveToDisk();
            }
          }
        },
        () => {}
      );
    }
  }

  private sanitizeAndDeduplicateUsers() {
    if (!this.memoryDb.users || !Array.isArray(this.memoryDb.users)) {
      this.memoryDb.users = defaultUsers;
      return;
    }
    const deduped: User[] = [];
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const seenUids = new Set<string>();

    for (const u of this.memoryDb.users) {
      if (!u) continue;
      const id = u.id ? String(u.id).trim() : '';
      const email = u.email ? String(u.email).toLowerCase().trim() : '';
      const uid = u.firebaseUid ? String(u.firebaseUid).trim() : '';

      if (id && seenIds.has(id)) continue;
      if (email && seenEmails.has(email)) continue;
      if (uid && seenUids.has(uid)) continue;

      if (id) seenIds.add(id);
      if (email) seenEmails.add(email);
      if (uid) seenUids.add(uid);
      deduped.push(u);
    }
    this.memoryDb.users = deduped;
  }

  private ensureAdminUserCredentials() {
    this.sanitizeAndDeduplicateUsers();
    let admin = this.memoryDb.users.find(
      (u) => u.role === 'admin' || u.id === 'usr-admin' || u.username === 'admin' || u.username === 'yourshivamff_'
    );
    if (admin) {
      admin.username = 'yourshivamff_';
      admin.role = 'admin';
      admin.status = 'active';
      admin.referralCode = 'ADMIN09';
      admin.email = admin.email || 'admin@smmshivam.com';
      admin.whatsappNo = admin.whatsappNo || '919516862495';
    } else {
      admin = {
        id: 'usr-admin',
        username: 'yourshivamff_',
        email: 'admin@smmshivam.com',
        whatsappNo: '919516862495',
        balance: 500.0,
        totalSpent: 1245.5,
        role: 'admin',
        apiKey: 'usr_api_key_88f910a2b',
        status: 'active',
        referralCode: 'ADMIN09',
        referralBalance: 0,
        totalReferralEarnings: 0,
        totalReferralWithdrawn: 0,
        referralEligible: true,
        createdAt: new Date().toISOString(),
      };
      this.memoryDb.users.unshift(admin);
    }
  }

  private syncToRtdb() {
    this.saveToDisk();
    const sanitized = cleanForFirebase(this.sanitizeDbForRtdb(this.memoryDb));

    // Cloud REST Sync (Guarantees persistence across server restarts / Render deployments)
    try {
      fetch(`${DatabaseStore.RTDB_REST_URL}/smm_store.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
      }).catch(() => {});

      if (this.memoryDb.services && this.memoryDb.services.length > 0) {
        fetch(`${DatabaseStore.RTDB_REST_URL}/services.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanForFirebase(this.memoryDb.services)),
        }).catch(() => {});
      }

      if (this.memoryDb.categories && this.memoryDb.categories.length > 0) {
        fetch(`${DatabaseStore.RTDB_REST_URL}/categories.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanForFirebase(this.memoryDb.categories)),
        }).catch(() => {});
      }

      if (this.memoryDb.settings) {
        const cleanSettings = cleanForFirebase({ ...this.memoryDb.settings });
        if (cleanSettings.welcomeVoiceAudioData) {
          delete cleanSettings.welcomeVoiceAudioData;
        }
        fetch(`${DatabaseStore.RTDB_REST_URL}/settings.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanSettings),
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('REST cloud sync notice:', err);
    }

    if (rtdb) {
      try {
        set(ref(rtdb, 'smm_store'), sanitized).catch((err) => {
          const msg = String(err?.message || err);
          if (err?.code !== 'PERMISSION_DENIED' && !msg.toLowerCase().includes('permission_denied')) {
            console.warn('RTDB sync warning:', msg);
          }
        });

        // Also sync active services & categories directly to top-level nodes for realtime listeners
        if (this.memoryDb.services && this.memoryDb.services.length > 0) {
          set(ref(rtdb, 'services'), cleanForFirebase(this.memoryDb.services)).catch(() => {});
        }
        if (this.memoryDb.categories && this.memoryDb.categories.length > 0) {
          set(ref(rtdb, 'categories'), cleanForFirebase(this.memoryDb.categories)).catch(() => {});
        }
      } catch (e) {
        console.warn('RTDB sync exception:', e);
      }
    }
  }

  private syncUserToRtdb(user: User) {
    if (user) {
      try {
        const cleanUser = cleanForFirebase(user);
        if (user.id) {
          fetch(`${DatabaseStore.RTDB_REST_URL}/users/${encodeURIComponent(user.id)}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanUser),
          }).catch(() => {});
        }
        if (user.firebaseUid && user.firebaseUid !== user.id) {
          fetch(`${DatabaseStore.RTDB_REST_URL}/users/${encodeURIComponent(user.firebaseUid)}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanUser),
          }).catch(() => {});
        }

        if (rtdb) {
          if (user.id) {
            set(ref(rtdb, `users/${user.id}`), cleanUser).catch(() => {});
          }
          if (user.firebaseUid && user.firebaseUid !== user.id) {
            set(ref(rtdb, `users/${user.firebaseUid}`), cleanUser).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('syncUserToRtdb exception:', err);
      }
    }
  }

  private sanitizeDbForRtdb(db: DatabaseSchema): any {
    const cleanSettings = { ...db.settings };
    if (cleanSettings.welcomeVoiceAudioData) {
      delete cleanSettings.welcomeVoiceAudioData;
    }
    return {
      ...db,
      settings: cleanSettings,
      users: db.users || [],
    };
  }

  // --- FIREBASE REALTIME DATABASE DIRECT HELPER API ---
  async updateRtdbNode(pathSuffix: string, value: any) {
    if (rtdb) {
      try {
        await update(ref(rtdb, `smm_store/${pathSuffix}`), value);
      } catch (e) {
        console.warn('RTDB update error:', e);
      }
    }
  }

  async pushRtdbNode(pathSuffix: string, value: any) {
    if (rtdb) {
      try {
        return await push(ref(rtdb, `smm_store/${pathSuffix}`), value);
      } catch (e) {
        console.warn('RTDB push error:', e);
      }
    }
  }

  async removeRtdbNode(pathSuffix: string) {
    if (rtdb) {
      try {
        await remove(ref(rtdb, `smm_store/${pathSuffix}`));
      } catch (e) {
        console.warn('RTDB remove error:', e);
      }
    }
  }

  async transactionRtdbNode(pathSuffix: string, transactionUpdateFn: (currentData: any) => any) {
    if (rtdb) {
      try {
        await runTransaction(ref(rtdb, `smm_store/${pathSuffix}`), transactionUpdateFn);
      } catch (e) {
        console.warn('RTDB transaction error:', e);
      }
    }
  }

  // --- PROVIDERS ---
  getProviders(): Provider[] {
    return this.memoryDb.providers;
  }

  getProvider(id: string): Provider | undefined {
    return this.memoryDb.providers.find((p) => p.id === id);
  }

  saveProvider(provider: Partial<Provider> & { id: string }): Provider {
    const existingIndex = this.memoryDb.providers.findIndex((p) => p.id === provider.id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const current = this.memoryDb.providers[existingIndex];
      const updated: Provider = {
        ...current,
        ...provider,
        updatedAt: now,
      };
      this.memoryDb.providers[existingIndex] = updated;
      this.syncToRtdb();
      return updated;
    } else {
      const created: Provider = {
        id: provider.id,
        name: provider.name || 'New Provider',
        apiUrl: provider.apiUrl || 'https://smmdip.com/api/v2',
        apiKey: provider.apiKey || '',
        status: provider.status || 'active',
        markupPercentage: provider.markupPercentage ?? 20,
        autoSync: provider.autoSync ?? true,
        autoSyncInterval: provider.autoSyncInterval || '6h',
        createdAt: now,
        updatedAt: now,
      };
      this.memoryDb.providers.push(created);
      this.syncToRtdb();
      return created;
    }
  }

  // --- CATEGORIES ---
  cleanEmptyCategories(): Category[] {
    // Preserve all categories added by admin or active services
    this.memoryDb.services.forEach((s) => {
      if (s.status === 'active' && s.category) {
        this.findOrCreateCategory(s.category);
      }
    });
    this.syncToRtdb();
    return this.memoryDb.categories;
  }

  getCategories(): Category[] {
    const catMap = new Map<string, Category>();
    this.memoryDb.categories.forEach((c) => {
      if (c && c.name) catMap.set(c.name.trim().toLowerCase(), c);
    });

    // Automatically ensure all categories from active services exist
    let updated = false;
    this.memoryDb.services.forEach((s) => {
      if (s.status === 'active' && s.category) {
        const key = s.category.trim().toLowerCase();
        if (!catMap.has(key)) {
          const newCat: Category = {
            id: 'cat-' + key.replace(/[^a-z0-9]/g, '-'),
            name: s.category.trim(),
            sortOrder: this.memoryDb.categories.length + 1,
          };
          this.memoryDb.categories.push(newCat);
          catMap.set(key, newCat);
          updated = true;
        }
      }
    });

    if (updated) {
      this.syncToRtdb();
    }

    return this.memoryDb.categories
      .filter((c) => c && c.name && c.name.trim())
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  findOrCreateCategory(categoryName: string, icon?: string): Category {
    const cleanName = (categoryName || 'General Services').trim();
    let found = this.memoryDb.categories.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (!found) {
      found = {
        id: 'cat-' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: cleanName,
        icon: icon || 'Tag',
        sortOrder: this.memoryDb.categories.length + 1,
      };
      this.memoryDb.categories.push(found);
      this.syncToRtdb();
    }
    return found;
  }

  deleteCategory(id: string): boolean {
    const idx = this.memoryDb.categories.findIndex((c) => c.id === id);
    if (idx >= 0) {
      this.memoryDb.categories.splice(idx, 1);
      this.syncToRtdb();
      return true;
    }
    return false;
  }

  // --- SERVICES ---
  getServices(onlyActive = false): Service[] {
    if (onlyActive) {
      return this.memoryDb.services.filter((s) => s.status === 'active');
    }
    return this.memoryDb.services;
  }

  getService(id: string): Service | undefined {
    return this.memoryDb.services.find((s) => s.id === id);
  }

  saveService(service: Service): Service {
    if (service.category) {
      this.findOrCreateCategory(service.category);
    }
    const index = this.memoryDb.services.findIndex((s) => s.id === service.id);
    if (index >= 0) {
      this.memoryDb.services[index] = service;
    } else {
      this.memoryDb.services.push(service);
    }
    this.syncToRtdb();
    return service;
  }

  createService(serviceData: Partial<Service>): Service {
    const categoryName = (serviceData.category || 'General Services').trim();
    this.findOrCreateCategory(categoryName);

    const now = new Date().toISOString();
    const id = serviceData.id || 'srv-custom-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const providerServiceId = serviceData.providerServiceId || ('CUST-' + Math.floor(1000 + Math.random() * 9000));

    const newService: Service = {
      id,
      providerId: serviceData.providerId || 'manual',
      providerServiceId,
      serviceName: serviceData.serviceName || 'Custom Service',
      category: categoryName,
      type: serviceData.type || 'Default',
      providerRate: Number(serviceData.providerRate) || 0,
      sellingRate: Number(serviceData.sellingRate) || 0,
      min: Number(serviceData.min) || 10,
      max: Number(serviceData.max) || 100000,
      refill: Boolean(serviceData.refill),
      cancel: Boolean(serviceData.cancel),
      description: serviceData.description || '',
      status: serviceData.status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.memoryDb.services.unshift(newService);
    this.syncToRtdb();
    return newService;
  }

  updateService(id: string, updates: Partial<Service>): Service | undefined {
    const index = this.memoryDb.services.findIndex((s) => s.id === id);
    if (index === -1) return undefined;

    if (updates.category) {
      this.findOrCreateCategory(updates.category);
    }

    const current = this.memoryDb.services[index];
    const updated: Service = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.memoryDb.services[index] = updated;
    this.syncToRtdb();
    return updated;
  }

  deleteService(id: string): boolean {
    const initialLen = this.memoryDb.services.length;
    this.memoryDb.services = this.memoryDb.services.filter((s) => s.id !== id);
    if (this.memoryDb.services.length !== initialLen) {
      this.cleanEmptyCategories();
      this.syncToRtdb();
      return true;
    }
    return false;
  }

  deleteProvider(id: string): boolean {
    const initialLen = this.memoryDb.providers.length;
    this.memoryDb.providers = this.memoryDb.providers.filter((p) => p.id !== id);
    if (this.memoryDb.providers.length !== initialLen) {
      this.syncToRtdb();
      return true;
    }
    return false;
  }

  resetDataToFresh(): DatabaseSchema {
    this.memoryDb.providers = JSON.parse(JSON.stringify(defaultProviders));
    this.memoryDb.categories = JSON.parse(JSON.stringify(defaultCategories));
    this.memoryDb.services = JSON.parse(JSON.stringify(defaultServices));
    this.memoryDb.orders = JSON.parse(JSON.stringify(defaultOrders));
    this.memoryDb.depositRequests = [];
    this.memoryDb.referralCommissions = [];
    this.memoryDb.referralWithdrawals = [];
    this.ensureAdminUserCredentials();
    this.syncToRtdb();
    return this.memoryDb;
  }

  /**
   * Price calculation helper safely handling markup percentage
   */
  calculateSellingRate(providerRate: number, markupPercentage: number): number {
    const safeRate = Number(providerRate) || 0;
    const safeMarkup = Number(markupPercentage) || 0;
    const rateWithMarkup = safeRate * (1 + safeMarkup / 100);
    // Round cleanly to 4 decimal places for micro services or 2 decimal places
    return Number(rateWithMarkup.toFixed(4));
  }

  updateBulkProfitMargin(marginPercentage: number, category?: string): { updatedCount: number; marginPercentage: number } {
    const margin = Number(marginPercentage) || 0;
    let updatedCount = 0;

    this.memoryDb.services.forEach((service) => {
      if (!category || category === 'ALL' || service.category === category) {
        service.sellingRate = this.calculateSellingRate(service.providerRate, margin);
        service.updatedAt = new Date().toISOString();
        updatedCount++;
      }
    });

    // Recalculate existing order selling prices and profits to reflect new configured profit margin
    this.memoryDb.orders.forEach((order) => {
      const srv = this.memoryDb.services.find(
        (s) => s.id === order.serviceId || s.providerServiceId === order.providerServiceId
      );
      if (srv) {
        const qtyMultiplier = order.quantity / 1000;
        order.providerCost = Number((srv.providerRate * qtyMultiplier).toFixed(4));
        order.sellingPrice = Number((srv.sellingRate * qtyMultiplier).toFixed(4));
        order.profit = Number((order.sellingPrice - order.providerCost).toFixed(4));
      }
    });

    this.memoryDb.settings.defaultProfitMarginPercentage = margin;
    this.saveToDisk();
    this.syncToRtdb();

    return { updatedCount, marginPercentage: margin };
  }

  // --- ORDERS ---
  getOrders(userId?: string): Order[] {
    if (userId) {
      return this.memoryDb.orders.filter((o) => o.userId === userId);
    }
    return this.memoryDb.orders;
  }

  addOrder(order: Order): Order {
    this.memoryDb.orders.unshift(order);
    this.syncToRtdb();
    return order;
  }

  updateOrderStatus(
    orderId: string,
    status: Order['status'],
    providerOrderId?: string,
    remains?: number
  ): Order | undefined {
    const order = this.memoryDb.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      if (providerOrderId) order.providerOrderId = providerOrderId;
      if (remains !== undefined) order.remains = remains;
      this.syncToRtdb();

      // Trigger referral commission processing if order is Completed
      if (status === 'Completed') {
        this.processOrderReferralCommissions(order);
      }
    }
    return order;
  }

  // --- USERS & BALANCES ---
  getUsers(): User[] {
    return this.memoryDb.users;
  }

  getUser(userId: string): User | undefined {
    if (!userId) return undefined;
    const cleanId = userId.trim().toLowerCase();
    return this.memoryDb.users.find(
      (u) =>
        u.id === userId ||
        (u.firebaseUid && u.firebaseUid === userId) ||
        u.username.toLowerCase() === cleanId ||
        u.email.toLowerCase() === cleanId
    );
  }

  saveUser(userProfile: User): User {
    const copy = { ...userProfile };
    const cleanId = copy.id ? String(copy.id).trim() : '';
    const cleanEmail = copy.email ? String(copy.email).toLowerCase().trim() : '';
    const cleanUid = copy.firebaseUid ? String(copy.firebaseUid).trim() : '';

    const existingIndex = this.memoryDb.users.findIndex(
      (u) =>
        (cleanId && u.id === cleanId) ||
        (cleanUid && (u.firebaseUid === cleanUid || u.id === cleanUid)) ||
        (cleanId && u.firebaseUid === cleanId) ||
        (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)
    );
    if (existingIndex >= 0) {
      const existing = this.memoryDb.users[existingIndex];
      const merged = {
        ...existing,
        ...copy,
        id: existing.id || copy.id,
        firebaseUid: copy.firebaseUid || existing.firebaseUid || (copy.id && copy.id.length > 20 ? copy.id : existing.id),
        password: copy.password || existing.password || '',
        whatsappNo: copy.whatsappNo || existing.whatsappNo || '',
        createdAt: existing.createdAt || copy.createdAt || new Date().toISOString(),
      };
      this.memoryDb.users[existingIndex] = merged;
      this.sanitizeAndDeduplicateUsers();
      this.saveToDisk();
      this.syncToRtdb();
      this.syncUserToRtdb(merged);
      return merged;
    } else {
      if (!copy.createdAt) {
        copy.createdAt = new Date().toISOString();
      }
      this.memoryDb.users.push(copy);
      this.sanitizeAndDeduplicateUsers();
      this.saveToDisk();
      this.syncToRtdb();
      this.syncUserToRtdb(copy);
      return copy;
    }
  }

  updateUserPassword(userId: string, newPassword: string): User | undefined {
    const user = this.getUser(userId);
    if (user && newPassword && newPassword.trim()) {
      user.password = newPassword.trim();
      this.saveToDisk();
      this.syncToRtdb();
      this.syncUserToRtdb(user);
    }
    return user;
  }

  deductUserBalance(userId: string, amount: number): boolean {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) return false;
    const user = this.getUser(userId);
    if (!user || user.balance < num) return false;
    user.balance = Number((user.balance - num).toFixed(2));
    user.totalSpent = Number((user.totalSpent + num).toFixed(2));
    this.syncToRtdb();
    this.syncUserToRtdb(user);
    return true;
  }

  addUserBalance(userId: string, amount: number): User | undefined {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) return undefined;
    let user = this.getUser(userId);
    if (!user) {
      user = this.memoryDb.users.find(
        (u) =>
          u.id === userId ||
          u.username.toLowerCase() === userId.toLowerCase() ||
          u.email.toLowerCase() === userId.toLowerCase()
      );
    }
    if (user) {
      user.balance = Number((user.balance + num).toFixed(2));
      this.syncToRtdb();
      this.syncUserToRtdb(user);
    }
    return user;
  }

  reduceUserBalance(userId: string, amount: number): User | undefined {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) return undefined;
    const user = this.getUser(userId);
    if (user) {
      user.balance = Math.max(0, Number((user.balance - num).toFixed(2)));
      this.syncToRtdb();
      this.syncUserToRtdb(user);
    }
    return user;
  }

  updateUserStatus(userId: string, status: 'active' | 'blocked'): User | undefined {
    const user = this.getUser(userId);
    if (user) {
      user.status = status;
      this.syncToRtdb();
      this.syncUserToRtdb(user);
    }
    return user;
  }

  deleteUser(userId: string): boolean {
    const user = this.getUser(userId);
    if (!user || user.role === 'admin' || user.id === 'usr-admin' || user.username === 'yourshivamff_') {
      return false; // Protect admin account
    }
    const initialLen = this.memoryDb.users.length;
    this.memoryDb.users = this.memoryDb.users.filter((u) => u.id !== user.id);
    if (this.memoryDb.users.length !== initialLen) {
      this.syncToRtdb();
      if (rtdb && user.id) {
        remove(ref(rtdb, `users/${user.id}`)).catch(() => {});
        remove(ref(rtdb, `smm_store/users/${user.id}`)).catch(() => {});
      }
      return true;
    }
    return false;
  }

  clearAllNonAdminUsers(): { removedCount: number } {
    const initialLen = this.memoryDb.users.length;
    // Keep only the official admin
    this.memoryDb.users = this.memoryDb.users.filter(
      (u) => u.role === 'admin' || u.id === 'usr-admin' || u.username === 'yourshivamff_'
    );
    const removedCount = initialLen - this.memoryDb.users.length;
    this.ensureAdminUserCredentials();
    this.syncToRtdb();
    if (rtdb) {
      // Clean smm_store users node
      const cleanUsers = this.memoryDb.users.map((u) => {
        const copy = { ...u };
        delete (copy as any).password;
        return copy;
      });
      set(ref(rtdb, 'smm_store/users'), cleanUsers).catch(() => {});
    }
    return { removedCount };
  }

  signupUser(data: {
    username: string;
    email: string;
    whatsappNo: string;
    password: string;
    referralCode?: string;
  }): { user?: User; error?: string } {
    const cleanUsername = (data.username || '').trim();
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanWhatsapp = (data.whatsappNo || '').trim();
    const cleanPassword = (data.password || '').trim();
    const cleanRefCode = (data.referralCode || '').trim();

    if (!cleanUsername || !cleanEmail || !cleanWhatsapp || !cleanPassword) {
      return { error: 'Username, Email, WhatsApp number, and Password are all required' };
    }

    const refCodeToUse = (cleanRefCode || 'ADMIN09').toUpperCase();

    // FIND REFERRER BY REFERRAL CODE
    let referrer = this.memoryDb.users.find(
      (u) =>
        u.referralCode &&
        (u.referralCode.toUpperCase() === refCodeToUse ||
          (refCodeToUse === 'ADMIN09' && (u.role === 'admin' || u.id === 'usr-admin')))
    );

    if (!referrer && refCodeToUse === 'ADMIN09') {
      referrer = this.memoryDb.users.find((u) => u.role === 'admin' || u.id === 'usr-admin');
    }

    if (!referrer) {
      return { error: 'Invalid referral code.' };
    }

    // PREVENT SELF REFERRAL
    if (
      referrer.username.toLowerCase() === cleanUsername.toLowerCase() ||
      referrer.email.toLowerCase() === cleanEmail
    ) {
      return { error: 'You cannot use your own referral code.' };
    }

    const existingUser = this.memoryDb.users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        u.username.toLowerCase() === cleanUsername.toLowerCase() ||
        (u.whatsappNo && u.whatsappNo === cleanWhatsapp)
    );

    if (existingUser) {
      return { error: 'An account with this Email, Username, or WhatsApp number already exists' };
    }

    const myReferralCode = this.generateUniqueReferralCode(cleanUsername);

    const newUser: User = {
      id: 'usr-' + Date.now(),
      username: cleanUsername,
      email: cleanEmail,
      whatsappNo: cleanWhatsapp,
      password: cleanPassword,
      balance: 0,
      totalSpent: 0,
      role: 'user',
      apiKey: 'usr_key_' + Math.random().toString(36).substring(2, 12),
      status: 'active',
      referralCode: myReferralCode,
      referredByUserId: referrer.id,
      referredByReferralCode: referrer.referralCode,
      referralEligible: false,
      referralBalance: 0,
      totalReferralEarnings: 0,
      totalReferralWithdrawn: 0,
      createdAt: new Date().toISOString(),
    };

    this.memoryDb.users.push(newUser);
    this.syncToRtdb();
    this.syncUserToRtdb(newUser);
    return { user: newUser };
  }

  // --- REFERRAL ENGINE METHODS ---

  getReferralSettings(): ReferralSettings {
    if (!this.memoryDb.settings.referralSettings) {
      this.memoryDb.settings.referralSettings = { ...defaultReferralSettings };
      this.syncToRtdb();
    }
    return this.memoryDb.settings.referralSettings;
  }

  updateReferralSettings(newSettings: Partial<ReferralSettings>): ReferralSettings {
    const current = this.getReferralSettings();
    this.memoryDb.settings.referralSettings = {
      ...current,
      ...newSettings,
    };
    this.syncToRtdb();
    return this.memoryDb.settings.referralSettings;
  }

  getUserByReferralCode(code: string): User | undefined {
    if (!code) return undefined;
    const clean = code.trim().toUpperCase();
    return this.memoryDb.users.find((u) => u.referralCode && u.referralCode.toUpperCase() === clean);
  }

  generateUniqueReferralCode(username: string): string {
    const prefix = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'REF';
    let code = prefix + Math.floor(10 + Math.random() * 90);
    let attempts = 0;
    while (
      attempts < 100 &&
      this.memoryDb.users.some((u) => u.referralCode && u.referralCode.toUpperCase() === code.toUpperCase())
    ) {
      attempts++;
      code = prefix + Math.floor(100 + Math.random() * 900);
    }
    if (attempts >= 100) {
      code = 'REF' + Math.floor(100000 + Math.random() * 900000);
    }
    return code;
  }

  sanitizeUsersReferralCodes() {
    let changed = false;
    this.memoryDb.users.forEach((u) => {
      if (!u.referralCode) {
        u.referralCode = this.generateUniqueReferralCode(u.username);
        changed = true;
      }
      if (u.referralBalance === undefined) u.referralBalance = 0;
      if (u.totalReferralEarnings === undefined) u.totalReferralEarnings = 0;
      if (u.totalReferralWithdrawn === undefined) u.totalReferralWithdrawn = 0;
      if (u.referralEligible === undefined) u.referralEligible = false;
    });
    if (changed) {
      this.syncToRtdb();
    }
  }

  checkAndUpdateReferralEligibility(userId: string): boolean {
    const user = this.getUser(userId);
    if (!user) return false;

    const refSettings = this.getReferralSettings();
    if (!refSettings.enabled) return false;

    // Calculate total approved deposit amount in INR for this user
    const approvedDeposits = (this.memoryDb.depositRequests || []).filter(
      (d) =>
        (d.userId === user.id ||
         d.userId === user.username ||
         d.username === user.username ||
         (d.userId && d.userId.toLowerCase() === user.username.toLowerCase()) ||
         (d.username && d.username.toLowerCase() === user.username.toLowerCase())) &&
        d.status === 'Approved'
    );
    const totalApprovedINR = approvedDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
    const requiredDepositINR = refSettings.minimumDepositINR || 100;

    // Check if Level 1 commission for this user's deposit criteria has already been credited
    const alreadyCreditedL1 = (this.memoryDb.referralCommissions || []).some(
      (c) =>
        (c.sourceUserId === user.id ||
         (c.sourceUsername && c.sourceUsername.toLowerCase() === user.username.toLowerCase())) &&
        c.level === 1 &&
        (c.orderId === 'DEP-CRITERIA' || c.orderId?.startsWith('DEP-CRITERIA'))
    );

    // Trigger commission when deposit criteria (e.g. ₹100) is completed
    if (totalApprovedINR >= requiredDepositINR && !alreadyCreditedL1) {
      user.referralEligible = true;
      user.referralEligibleAt = new Date().toISOString();

      // Find Referrer A (Level 1)
      let level1User = user.referredByUserId ? this.getUser(user.referredByUserId) : undefined;
      if (!level1User && user.referredByUserId) {
        level1User = this.getUserByReferralCode(user.referredByUserId);
      }
      if (!level1User && user.referredByReferralCode) {
        level1User = this.getUserByReferralCode(user.referredByReferralCode);
      }

      if (level1User) {
        const l1Pct = refSettings.level1Percentage !== undefined ? refSettings.level1Percentage : 25;
        const l1AmountINR = Number(((requiredDepositINR * l1Pct) / 100).toFixed(2));

        if (l1AmountINR > 0) {
          level1User.referralBalance = Number(((level1User.referralBalance || 0) + l1AmountINR).toFixed(2));
          level1User.totalReferralEarnings = Number(((level1User.totalReferralEarnings || 0) + l1AmountINR).toFixed(2));

          if (!this.memoryDb.referralCommissions) {
            this.memoryDb.referralCommissions = [];
          }

          const comm1: ReferralCommission = {
            id: 'COMM-' + Math.floor(100000 + Math.random() * 900000),
            orderId: 'DEP-CRITERIA',
            beneficiaryUserId: level1User.id,
            sourceUserId: user.id,
            sourceUsername: user.username,
            level: 1,
            orderProfitINR: requiredDepositINR,
            commissionPercentage: l1Pct,
            commissionAmountINR: l1AmountINR,
            status: 'Credited',
            createdAt: new Date().toISOString(),
          };
          this.memoryDb.referralCommissions.unshift(comm1);
        }

        // Find Referrer's Referrer (Level 2)
        let level2User = level1User.referredByUserId ? this.getUser(level1User.referredByUserId) : undefined;
        if (!level2User && level1User.referredByUserId) {
          level2User = this.getUserByReferralCode(level1User.referredByUserId);
        }
        if (!level2User && level1User.referredByReferralCode) {
          level2User = this.getUserByReferralCode(level1User.referredByReferralCode);
        }

        if (level2User) {
          const l2Pct = refSettings.level2Percentage !== undefined ? refSettings.level2Percentage : 5;
          const l2AmountINR = Number(((requiredDepositINR * l2Pct) / 100).toFixed(2));

          if (l2AmountINR > 0) {
            level2User.referralBalance = Number(((level2User.referralBalance || 0) + l2AmountINR).toFixed(2));
            level2User.totalReferralEarnings = Number(((level2User.totalReferralEarnings || 0) + l2AmountINR).toFixed(2));

            if (!this.memoryDb.referralCommissions) {
              this.memoryDb.referralCommissions = [];
            }

            const comm2: ReferralCommission = {
              id: 'COMM-' + Math.floor(100000 + Math.random() * 900000),
              orderId: 'DEP-CRITERIA',
              beneficiaryUserId: level2User.id,
              sourceUserId: user.id,
              sourceUsername: user.username,
              level: 2,
              orderProfitINR: requiredDepositINR,
              commissionPercentage: l2Pct,
              commissionAmountINR: l2AmountINR,
              status: 'Credited',
              createdAt: new Date().toISOString(),
            };
            this.memoryDb.referralCommissions.unshift(comm2);
          }
        }
      }

      this.syncToRtdb();
      return true;
    }

    if (totalApprovedINR >= requiredDepositINR) {
      user.referralEligible = true;
      return true;
    }

    return false;
  }

  processOrderReferralCommissions(order: Order): ReferralCommission[] {
    const refSettings = this.getReferralSettings();
    if (!refSettings.enabled) return [];

    // Check order status requirement: ONLY Completed
    if (order.status !== 'Completed') return [];

    if (!this.memoryDb.referralCommissions) {
      this.memoryDb.referralCommissions = [];
    }

    // Prevent duplicate commission for the same order
    const existingForOrder = this.memoryDb.referralCommissions.filter((c) => c.orderId === order.id);
    if (existingForOrder.length > 0) {
      return existingForOrder;
    }

    const buyer = this.getUser(order.userId);
    if (!buyer || !buyer.referredByUserId) return [];

    // Check if buyer is referral eligible (cumulative deposits >= ₹100)
    this.checkAndUpdateReferralEligibility(buyer.id);
    if (!buyer.referralEligible) {
      return [];
    }

    // Profit calculation in INR
    const exchangeRate = this.memoryDb.settings.exchangeRateINR || 86;
    const profitUSD = order.profit || Math.max(0, order.sellingPrice - order.providerCost);
    const profitINR = Number((profitUSD * exchangeRate).toFixed(2));

    if (profitINR <= 0) return [];

    const createdCommissions: ReferralCommission[] = [];

    // LEVEL 1 COMMISSION (Direct Referrer - 25% of profit by default)
    const level1User = this.getUser(buyer.referredByUserId);
    if (level1User) {
      const l1Pct = refSettings.level1Percentage || 25;
      const l1AmountINR = Number(((profitINR * l1Pct) / 100).toFixed(2));

      if (l1AmountINR > 0) {
        level1User.referralBalance = Number(((level1User.referralBalance || 0) + l1AmountINR).toFixed(2));
        level1User.totalReferralEarnings = Number(((level1User.totalReferralEarnings || 0) + l1AmountINR).toFixed(2));

        const comm1: ReferralCommission = {
          id: 'COMM-' + Math.floor(100000 + Math.random() * 900000),
          orderId: order.id,
          beneficiaryUserId: level1User.id,
          sourceUserId: buyer.id,
          sourceUsername: buyer.username,
          level: 1,
          orderProfitINR: profitINR,
          commissionPercentage: l1Pct,
          commissionAmountINR: l1AmountINR,
          status: 'Credited',
          createdAt: new Date().toISOString(),
        };
        this.memoryDb.referralCommissions.unshift(comm1);
        createdCommissions.push(comm1);
      }

      // LEVEL 2 COMMISSION (Referrer's Referrer - 5% of profit by default)
      if (level1User.referredByUserId) {
        const level2User = this.getUser(level1User.referredByUserId);
        if (level2User) {
          const l2Pct = refSettings.level2Percentage || 5;
          const l2AmountINR = Number(((profitINR * l2Pct) / 100).toFixed(2));

          if (l2AmountINR > 0) {
            level2User.referralBalance = Number(((level2User.referralBalance || 0) + l2AmountINR).toFixed(2));
            level2User.totalReferralEarnings = Number(((level2User.totalReferralEarnings || 0) + l2AmountINR).toFixed(2));

            const comm2: ReferralCommission = {
              id: 'COMM-' + Math.floor(100000 + Math.random() * 900000),
              orderId: order.id,
              beneficiaryUserId: level2User.id,
              sourceUserId: buyer.id,
              sourceUsername: buyer.username,
              level: 2,
              orderProfitINR: profitINR,
              commissionPercentage: l2Pct,
              commissionAmountINR: l2AmountINR,
              status: 'Credited',
              createdAt: new Date().toISOString(),
            };
            this.memoryDb.referralCommissions.unshift(comm2);
            createdCommissions.push(comm2);
          }
        }
      }
    }

    if (createdCommissions.length > 0) {
      this.syncToRtdb();
    }

    return createdCommissions;
  }

  requestReferralWithdrawal(
    userId: string,
    amountINR: number,
    upiId: string,
    upiName: string
  ): { withdrawal?: ReferralWithdrawal; error?: string } {
    const user = this.getUser(userId);
    if (!user) return { error: 'User not found' };

    const refSettings = this.getReferralSettings();
    const minWithdrawal = refSettings.minimumWithdrawalINR || 100;

    const numAmount = Number(amountINR);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { error: 'Please enter a valid positive withdrawal amount' };
    }

    if (numAmount < minWithdrawal) {
      return { error: `Minimum referral withdrawal amount is ₹${minWithdrawal}` };
    }

    const availableBalance = user.referralBalance || 0;
    if (numAmount > availableBalance) {
      return {
        error: `Withdrawal amount (₹${numAmount}) exceeds available referral balance (₹${availableBalance.toFixed(2)})`,
      };
    }

    const cleanUpiId = (upiId || '').trim();
    const cleanUpiName = (upiName || '').trim();

    if (!cleanUpiId || !cleanUpiId.includes('@')) {
      return { error: 'Please provide a valid UPI ID (e.g. username@upi or phone@ybl)' };
    }
    if (!cleanUpiName) {
      return { error: 'Please provide the account holder name for UPI' };
    }

    user.referralBalance = Number((availableBalance - numAmount).toFixed(2));
    user.upiId = cleanUpiId;
    user.upiName = cleanUpiName;

    if (!this.memoryDb.referralWithdrawals) {
      this.memoryDb.referralWithdrawals = [];
    }

    const withdrawal: ReferralWithdrawal = {
      id: 'WITH-' + Math.floor(100000 + Math.random() * 900000),
      userId: user.id,
      username: user.username,
      amount: numAmount,
      upiId: cleanUpiId,
      upiName: cleanUpiName,
      status: 'Pending',
      requestedAt: new Date().toISOString(),
    };

    this.memoryDb.referralWithdrawals.unshift(withdrawal);
    this.syncToRtdb();

    return { withdrawal };
  }

  getReferralWithdrawals(): ReferralWithdrawal[] {
    return this.memoryDb.referralWithdrawals || [];
  }

  approveReferralWithdrawal(id: string): { withdrawal?: ReferralWithdrawal; error?: string } {
    if (!this.memoryDb.referralWithdrawals) return { error: 'No withdrawals found' };
    const withdrawal = this.memoryDb.referralWithdrawals.find((w) => w.id === id);
    if (!withdrawal) return { error: 'Withdrawal request not found' };

    if (withdrawal.status !== 'Pending') {
      return { error: `Withdrawal is already ${withdrawal.status}` };
    }

    withdrawal.status = 'Approved';
    withdrawal.processedAt = new Date().toISOString();

    const user = this.getUser(withdrawal.userId);
    if (user) {
      user.totalReferralWithdrawn = Number(((user.totalReferralWithdrawn || 0) + withdrawal.amount).toFixed(2));
    }

    this.syncToRtdb();
    return { withdrawal };
  }

  rejectReferralWithdrawal(id: string, adminNote?: string): { withdrawal?: ReferralWithdrawal; error?: string } {
    if (!this.memoryDb.referralWithdrawals) return { error: 'No withdrawals found' };
    const withdrawal = this.memoryDb.referralWithdrawals.find((w) => w.id === id);
    if (!withdrawal) return { error: 'Withdrawal request not found' };

    if (withdrawal.status !== 'Pending') {
      return { error: `Withdrawal is already ${withdrawal.status}` };
    }

    withdrawal.status = 'Rejected';
    withdrawal.processedAt = new Date().toISOString();
    if (adminNote) withdrawal.adminNote = adminNote;

    // Return the amount safely back to the user's available referral balance EXACTLY ONCE
    const user = this.getUser(withdrawal.userId);
    if (user) {
      user.referralBalance = Number(((user.referralBalance || 0) + withdrawal.amount).toFixed(2));
    }

    this.syncToRtdb();
    return { withdrawal };
  }

  getUserReferralData(userId: string) {
    const user = this.getUser(userId);
    if (!user) return null;

    this.checkAndUpdateReferralEligibility(user.id);

    const refSettings = this.getReferralSettings();
    const minDepositReq = refSettings.minimumDepositINR || 100;

    const directReferredUsers = this.memoryDb.users.filter(
      (u) =>
        (u.referredByUserId && u.referredByUserId === user.id) ||
        (u.referredByUserId && u.referredByUserId.toLowerCase() === user.username.toLowerCase()) ||
        (u.referredByReferralCode && u.referredByReferralCode.toUpperCase() === user.referralCode?.toUpperCase())
    );

    // Ensure all referred users' deposit eligibility is evaluated and credited if >= ₹100
    directReferredUsers.forEach((ru) => {
      this.checkAndUpdateReferralEligibility(ru.id);
    });

    const formattedReferredUsers = directReferredUsers.map((ru) => {
      const userApprovedDeposits = (this.memoryDb.depositRequests || []).filter(
        (d) =>
          (d.userId === ru.id ||
           d.userId === ru.username ||
           d.username === ru.username ||
           (d.userId && d.userId.toLowerCase() === ru.username.toLowerCase()) ||
           (d.username && d.username.toLowerCase() === ru.username.toLowerCase())) &&
          d.status === 'Approved'
      );
      const totalApprovedINR = userApprovedDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
      const isEligible = ru.referralEligible || totalApprovedINR >= minDepositReq;
      const remainingINR = Math.max(0, minDepositReq - totalApprovedINR);

      const userOrders = this.getOrders(ru.id);
      const ordersCount = userOrders.length;

      const userCommissionsFromRu = (this.memoryDb.referralCommissions || []).filter(
        (c) =>
          c.beneficiaryUserId === user.id &&
          (c.sourceUserId === ru.id || (c.sourceUsername && c.sourceUsername.toLowerCase() === ru.username.toLowerCase()))
      );
      const totalCommINR = userCommissionsFromRu.reduce((sum, c) => sum + c.commissionAmountINR, 0);

      return {
        id: ru.id,
        username: ru.username,
        email: ru.email,
        createdAt: ru.createdAt,
        totalDepositINR: totalApprovedINR,
        referralEligible: isEligible,
        remainingForEligibilityINR: remainingINR,
        ordersCount,
        commissionEarnedINR: Number(totalCommINR.toFixed(2)),
      };
    });

    const commissionHistory = (this.memoryDb.referralCommissions || []).filter(
      (c) =>
        c.beneficiaryUserId === user.id ||
        c.beneficiaryUserId === user.username ||
        (c.beneficiaryUserId && c.beneficiaryUserId.toLowerCase() === user.username.toLowerCase())
    );

    const level1Earnings = commissionHistory
      .filter((c) => c.level === 1)
      .reduce((sum, c) => sum + c.commissionAmountINR, 0);

    const level2Earnings = commissionHistory
      .filter((c) => c.level === 2)
      .reduce((sum, c) => sum + c.commissionAmountINR, 0);

    const totalEarningsFromCommissions = commissionHistory.reduce(
      (sum, c) => sum + (c.commissionAmountINR || 0),
      0
    );

    user.totalReferralEarnings = Math.max(user.totalReferralEarnings || 0, Number(totalEarningsFromCommissions.toFixed(2)));

    const withdrawalHistory = (this.memoryDb.referralWithdrawals || []).filter(
      (w) => w.userId === user.id || w.userId === user.username
    );

    const approvedOrPendingWithdrawals = withdrawalHistory
      .filter((w) => w.status !== 'Rejected')
      .reduce((sum, w) => sum + (w.amount || 0), 0);

    const totalApprovedWithdrawn = withdrawalHistory
      .filter((w) => w.status === 'Approved')
      .reduce((sum, w) => sum + (w.amount || 0), 0);

    user.totalReferralWithdrawn = Number(totalApprovedWithdrawn.toFixed(2));
    user.referralBalance = Math.max(
      0,
      Number((user.totalReferralEarnings - approvedOrPendingWithdrawals).toFixed(2))
    );

    this.syncToRtdb();

    return {
      referralCode: user.referralCode,
      referredByUserId: user.referredByUserId,
      referredByReferralCode: user.referredByReferralCode,
      referralBalance: Number((user.referralBalance || 0).toFixed(2)),
      totalReferralEarnings: Number((user.totalReferralEarnings || 0).toFixed(2)),
      totalReferralWithdrawn: Number((user.totalReferralWithdrawn || 0).toFixed(2)),
      level1Earnings: Number(level1Earnings.toFixed(2)),
      level2Earnings: Number(level2Earnings.toFixed(2)),
      totalReferredUsersCount: directReferredUsers.length,
      referredUsers: formattedReferredUsers,
      commissionHistory,
      withdrawalHistory,
      upiId: user.upiId || '',
      upiName: user.upiName || '',
      settings: refSettings,
    };
  }

  getAdminReferralOverviewStats() {
    const users = this.memoryDb.users;
    const commissions = this.memoryDb.referralCommissions || [];
    const withdrawals = this.memoryDb.referralWithdrawals || [];

    const totalReferralUsers = users.filter((u) => u.referredByUserId).length;
    const totalReferralEarnings = commissions.reduce((sum, c) => sum + c.commissionAmountINR, 0);

    const approvedWithdrawals = withdrawals.filter((w) => w.status === 'Approved');
    const pendingWithdrawals = withdrawals.filter((w) => w.status === 'Pending');
    const rejectedWithdrawals = withdrawals.filter((w) => w.status === 'Rejected');

    const totalReferralCommissionPaid = approvedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const pendingWithdrawalAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    const level1Paid = commissions
      .filter((c) => c.level === 1)
      .reduce((sum, c) => sum + c.commissionAmountINR, 0);

    const level2Paid = commissions
      .filter((c) => c.level === 2)
      .reduce((sum, c) => sum + c.commissionAmountINR, 0);

    return {
      totalReferralUsers,
      totalReferralEarnings: Number(totalReferralEarnings.toFixed(2)),
      totalReferralCommissionPaid: Number(totalReferralCommissionPaid.toFixed(2)),
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalAmount: Number(pendingWithdrawalAmount.toFixed(2)),
      approvedWithdrawalsCount: approvedWithdrawals.length,
      rejectedWithdrawalsCount: rejectedWithdrawals.length,
      level1CommissionPaid: Number(level1Paid.toFixed(2)),
      level2CommissionPaid: Number(level2Paid.toFixed(2)),
    };
  }

  loginUser(data: { identifier: string; password: string }): { user?: User; error?: string } {
    const cleanId = (data.identifier || '').trim().toLowerCase();
    const cleanPass = (data.password || '').trim();

    if (!cleanId || !cleanPass) {
      return { error: 'Please enter both Login ID and Password' };
    }

    let user = this.memoryDb.users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId ||
        (u.whatsappNo && u.whatsappNo.toLowerCase() === cleanId)
    );

    // Fallback if trying to login as admin with username 'admin'
    if (!user && (cleanId === 'admin' || cleanId === 'yourshivamff_' || cleanId === '9516862495' || cleanId === '919516862495')) {
      user = this.memoryDb.users.find((u) => u.role === 'admin' || u.id === 'usr-admin');
    }

    if (!user) {
      return { error: 'Account not found with provided Email/WhatsApp/Username' };
    }

    const isPassValid =
      !user.password ||
      user.password === cleanPass ||
      (user.password && user.password.toLowerCase() === cleanPass.toLowerCase());

    if (!isPassValid) {
      return { error: 'Incorrect password. Please check and try again.' };
    }

    if (user.status === 'blocked') {
      return { error: 'Your account is blocked. Please contact support.' };
    }

    return { user };
  }

  // --- SYNC LOGS & STATS ---
  addSyncLog(log: SyncLog) {
    this.memoryDb.syncLogs.unshift(log);
    if (this.memoryDb.syncLogs.length > 50) {
      this.memoryDb.syncLogs = this.memoryDb.syncLogs.slice(0, 50);
    }
    this.syncToRtdb();
  }

  getSyncLogs(): SyncLog[] {
    return this.memoryDb.syncLogs;
  }

  getAdminStats() {
    const orders = this.memoryDb.orders;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.sellingPrice || 0), 0);
    const totalCost = orders.reduce((sum, o) => sum + (o.providerCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const activeServices = this.memoryDb.services.filter((s) => s.status === 'active').length;
    const totalServices = this.memoryDb.services.length;

    const configuredProfitMargin = this.memoryDb.settings.defaultProfitMarginPercentage || 60;
    const costMarkupPercentage = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : configuredProfitMargin;

    return {
      totalOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      activeServices,
      totalServices,
      configuredProfitMargin,
      costMarkupPercentage,
      totalUsers: this.memoryDb.users.length,
      activeProviders: this.memoryDb.providers.filter((p) => p.status === 'active').length,
    };
  }

  getSettings(): AdminSettings {
    return this.memoryDb.settings;
  }

  async updateSettings(newSettings: Partial<AdminSettings>): Promise<AdminSettings> {
    const oldMargin = this.memoryDb.settings.defaultProfitMarginPercentage;
    this.memoryDb.settings = {
      ...this.memoryDb.settings,
      ...newSettings,
    };
    if (
      newSettings.defaultProfitMarginPercentage !== undefined &&
      Number(newSettings.defaultProfitMarginPercentage) !== oldMargin
    ) {
      this.updateBulkProfitMargin(Number(newSettings.defaultProfitMarginPercentage));
    } else {
      this.syncToRtdb();
    }
    if (rtdb) {
      try {
        const cleanSettings = cleanForFirebase({ ...this.memoryDb.settings });
        if (cleanSettings.welcomeVoiceAudioData) {
          delete cleanSettings.welcomeVoiceAudioData;
        }
        set(ref(rtdb, 'smm_store/settings'), cleanSettings).catch(() => {});
        set(ref(rtdb, 'settings'), cleanSettings).catch(() => {});
      } catch (err: any) {
        console.warn('store.ts updateSettings RTDB notice:', err?.message || err);
      }
    }
    return this.memoryDb.settings;
  }

  // --- DEPOSIT REQUESTS (QR Code & UPI) ---
  getDepositRequests(): DepositRequest[] {
    return this.memoryDb.depositRequests || [];
  }

  async addDepositRequest(req: Omit<DepositRequest, 'id' | 'createdAt' | 'status'>): Promise<DepositRequest> {
    if (!this.memoryDb.depositRequests) {
      this.memoryDb.depositRequests = [];
    }
    const id = 'DEP-' + Math.floor(100000 + Math.random() * 900000);
    const deposit: DepositRequest = {
      id,
      ...req,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    this.memoryDb.depositRequests.unshift(deposit);
    this.syncToRtdb();
    if (rtdb) {
      try {
        const cleanDep = cleanForFirebase(deposit);
        await set(ref(rtdb, `smm_store/depositRequests/${id}`), cleanDep);
        await set(ref(rtdb, `depositRequests/${id}`), cleanDep);
      } catch (err: any) {
        console.warn('store.ts addDepositRequest RTDB notice:', err?.message || err);
      }
    }
    return deposit;
  }

  approveDepositRequest(depositId: string): { deposit?: DepositRequest; user?: User; error?: string } {
    if (!this.memoryDb.depositRequests) return { error: 'No deposit requests found' };
    const deposit = this.memoryDb.depositRequests.find((d) => d.id === depositId);
    if (!deposit) return { error: 'Deposit request not found' };

    if (deposit.status !== 'Pending') {
      return { error: `Deposit request is already ${deposit.status.toLowerCase()}` };
    }

    deposit.status = 'Approved';
    deposit.updatedAt = new Date().toISOString();

    // Credit full deposit amount (in INR) to user's wallet
    const user = this.addUserBalance(deposit.userId, deposit.amount);
    
    // Check and activate referral eligibility if cumulative successful deposits reach minimum threshold (e.g. ₹100)
    this.checkAndUpdateReferralEligibility(deposit.userId);

    this.syncToRtdb();

    return { deposit, user };
  }

  rejectDepositRequest(depositId: string): DepositRequest | undefined {
    if (!this.memoryDb.depositRequests) return undefined;
    const deposit = this.memoryDb.depositRequests.find((d) => d.id === depositId);
    if (deposit && deposit.status === 'Pending') {
      deposit.status = 'Rejected';
      deposit.updatedAt = new Date().toISOString();
      this.syncToRtdb();
    }
    return deposit;
  }
  // --- SUPPORT TICKETS SYSTEM ---
  getTickets(): Ticket[] {
    return this.memoryDb.tickets || [];
  }

  getUserTickets(userId: string): Ticket[] {
    if (!this.memoryDb.tickets) return [];
    return this.memoryDb.tickets.filter((t) => t.userId === userId);
  }

  getTicket(id: string): Ticket | undefined {
    if (!this.memoryDb.tickets) return undefined;
    return this.memoryDb.tickets.find((t) => t.id === id);
  }

  createTicket(data: {
    userId: string;
    username: string;
    userEmail?: string;
    whatsappNo?: string;
    subject: string;
    orderId?: string;
    message: string;
  }): Ticket {
    if (!this.memoryDb.tickets) {
      this.memoryDb.tickets = [];
    }

    const user = this.getUser(data.userId);
    const id = 'TCK-' + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();

    const ticket: Ticket = {
      id,
      userId: data.userId,
      username: data.username || (user ? user.username : 'User'),
      userEmail: data.userEmail || (user ? user.email : ''),
      whatsappNo: data.whatsappNo || (user ? user.whatsappNo : ''),
      subject: data.subject || 'Support Request',
      orderId: data.orderId || '',
      status: 'Open',
      messages: [
        {
          sender: 'user',
          text: data.message,
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.memoryDb.tickets.unshift(ticket);
    this.syncToRtdb();

    if (rtdb) {
      try {
        const cleanTicket = cleanForFirebase(ticket);
        set(ref(rtdb, `smm_store/tickets/${id}`), cleanTicket).catch(() => {});
        set(ref(rtdb, `tickets/${id}`), cleanTicket).catch(() => {});
      } catch (err) {
        console.warn('store.ts createTicket RTDB notice:', err);
      }
    }

    return ticket;
  }

  replyTicket(
    ticketId: string,
    sender: 'user' | 'admin',
    text: string
  ): { ticket?: Ticket; error?: string } {
    if (!this.memoryDb.tickets) return { error: 'No tickets found' };
    const ticket = this.memoryDb.tickets.find((t) => t.id === ticketId);
    if (!ticket) return { error: 'Ticket not found' };

    const cleanText = (text || '').trim();
    if (!cleanText) return { error: 'Message cannot be empty' };

    const now = new Date().toISOString();
    ticket.messages.push({
      sender,
      text: cleanText,
      timestamp: now,
    });
    ticket.updatedAt = now;

    if (sender === 'admin') {
      ticket.status = 'Answered';
    } else {
      ticket.status = 'Open';
    }

    this.syncToRtdb();

    if (rtdb) {
      try {
        const cleanTicket = cleanForFirebase(ticket);
        set(ref(rtdb, `smm_store/tickets/${ticketId}`), cleanTicket).catch(() => {});
        set(ref(rtdb, `tickets/${ticketId}`), cleanTicket).catch(() => {});
      } catch (err) {
        console.warn('store.ts replyTicket RTDB notice:', err);
      }
    }

    return { ticket };
  }

  updateTicketStatus(
    ticketId: string,
    status: 'Open' | 'In Progress' | 'Answered' | 'Closed'
  ): Ticket | undefined {
    if (!this.memoryDb.tickets) return undefined;
    const ticket = this.memoryDb.tickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
      this.syncToRtdb();

      if (rtdb) {
        try {
          const cleanTicket = cleanForFirebase(ticket);
          set(ref(rtdb, `smm_store/tickets/${ticketId}`), cleanTicket).catch(() => {});
          set(ref(rtdb, `tickets/${ticketId}`), cleanTicket).catch(() => {});
        } catch (err) {
          console.warn('store.ts updateTicketStatus RTDB notice:', err);
        }
      }
    }
    return ticket;
  }

  deleteTicket(ticketId: string): boolean {
    if (!this.memoryDb.tickets) return false;
    const initialLen = this.memoryDb.tickets.length;
    this.memoryDb.tickets = this.memoryDb.tickets.filter((t) => t.id !== ticketId);
    if (this.memoryDb.tickets.length !== initialLen) {
      this.syncToRtdb();
      if (rtdb) {
        try {
          remove(ref(rtdb, `smm_store/tickets/${ticketId}`)).catch(() => {});
          remove(ref(rtdb, `tickets/${ticketId}`)).catch(() => {});
        } catch (err) {}
      }
      return true;
    }
    return false;
  }

  // =========================================================================
  // CHILD PANEL WHITE-LABEL & DATA ISOLATION METHODS
  // =========================================================================

  getChildPanels(): ChildPanel[] {
    if (!this.memoryDb.childPanels) {
      this.memoryDb.childPanels = defaultChildPanels;
    }
    // Synchronize latest owner details (username, email, password, whatsapp) from user account
    this.memoryDb.childPanels.forEach((p) => {
      if (p.ownerId || p.ownerEmail) {
        const u = this.getUser(p.ownerId) || this.getUser(p.ownerEmail);
        if (u) {
          if (u.email && (!p.ownerEmail || p.ownerEmail.includes('placeholder'))) p.ownerEmail = u.email;
          if (u.username && (!p.ownerName || p.ownerName.includes('Owner'))) p.ownerName = u.username;
          if (u.password) p.ownerPassword = u.password;
          if (u.whatsappNo && !p.ownerWhatsapp) p.ownerWhatsapp = u.whatsappNo;
        }
      }
      if (!p.ownerPassword) {
        p.ownerPassword = 'password123';
      }
      if (p.pricing && p.pricing.adminMarginPercent === undefined) {
        p.pricing.adminMarginPercent = this.memoryDb.settings.childPanelAdminMarginPercentage ?? 15;
      }
    });
    return this.memoryDb.childPanels;
  }

  getChildPanel(idOrSlugOrDomain: string): ChildPanel | undefined {
    if (!idOrSlugOrDomain) return undefined;
    const query = String(idOrSlugOrDomain).trim().toLowerCase();
    const panels = this.getChildPanels();
    return panels.find((p) => {
      if (!p) return false;
      const idMatch = p.id && p.id.toLowerCase() === query;
      const slugMatch = p.slug && p.slug.toLowerCase() === query;
      const domainMatch = p.customDomain && p.customDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '') === query.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
      const subMatch = p.subdomain && p.subdomain.toLowerCase() === query;
      const ownerIdMatch = p.ownerId && p.ownerId.toLowerCase() === query;
      const ownerEmailMatch = p.ownerEmail && p.ownerEmail.toLowerCase() === query;
      return idMatch || slugMatch || domainMatch || subMatch || ownerIdMatch || ownerEmailMatch;
    });
  }

  createChildPanel(data: Partial<ChildPanel>): { childPanel?: ChildPanel; error?: string } {
    if (!data.name || !data.name.trim()) {
      return { error: 'Child panel name is required' };
    }
    if (!data.slug || !data.slug.trim()) {
      return { error: 'Child panel slug/subdomain identifier is required' };
    }

    const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const existing = this.getChildPanel(cleanSlug);
    if (existing) {
      return { error: `A child panel with slug "${cleanSlug}" already exists.` };
    }

    const id = 'cp-' + cleanSlug + '-' + Math.floor(1000 + Math.random() * 9000);
    const now = new Date().toISOString();

    const ownerEmail = data.ownerEmail ? data.ownerEmail.trim().toLowerCase() : `${cleanSlug}_owner@smmshivam.com`;
    const ownerName = data.ownerName ? data.ownerName.trim() : `${data.name} Owner`;
    const ownerPass = data.ownerPassword || 'password123';
    const ownerId = 'usr-cp-' + cleanSlug;

    // Create or find child owner user
    let ownerUser = this.getUser(ownerEmail) || this.getUser(ownerId);
    if (!ownerUser) {
      ownerUser = this.saveUser({
        id: ownerId,
        username: `${cleanSlug}_owner`,
        email: ownerEmail,
        whatsappNo: data.ownerWhatsapp || data.contact?.whatsappNumber || '919516862495',
        password: ownerPass,
        balance: 0,
        totalSpent: 0,
        role: 'child_owner',
        childPanelId: id,
        apiKey: 'cp_key_' + Math.random().toString(36).substring(2, 12),
        status: 'active',
        referralCode: cleanSlug.substring(0, 5).toUpperCase() + '01',
        referralBalance: 0,
        totalReferralEarnings: 0,
        totalReferralWithdrawn: 0,
        referralEligible: true,
        createdAt: now,
      });
    } else {
      ownerUser.role = 'child_owner';
      ownerUser.childPanelId = id;
      this.saveUser(ownerUser);
    }

    const newChildPanel: ChildPanel = {
      id,
      name: data.name.trim(),
      slug: cleanSlug,
      subdomain: data.subdomain ? data.subdomain.trim() : `${cleanSlug}.smmshivam.com`,
      customDomain: data.customDomain ? data.customDomain.trim().toLowerCase() : '',
      ownerId: ownerUser.id,
      ownerName,
      ownerEmail,
      ownerPassword: ownerPass,
      ownerWhatsapp: data.ownerWhatsapp || data.contact?.whatsappNumber || '',
      status: data.status || 'active',
      permissions: {
        brandingCustomization: data.permissions?.brandingCustomization ?? true,
        apiAccess: data.permissions?.apiAccess ?? true,
        pricingCustomization: data.permissions?.pricingCustomization ?? true,
        paymentCustomization: data.permissions?.paymentCustomization ?? true,
        categoryServiceSelection: data.permissions?.categoryServiceSelection ?? true,
      },
      branding: {
        panelName: data.branding?.panelName || data.name.trim(),
        logoUrl: data.branding?.logoUrl || '',
        faviconUrl: data.branding?.faviconUrl || '',
        theme: data.branding?.theme || 'cyberpunk-neon',
        accentColor: data.branding?.accentColor || '#38bdf8',
        loginPageTitle: data.branding?.loginPageTitle || `${data.name.trim()} - Member Portal`,
        loginLogoUrl: data.branding?.loginLogoUrl || '',
        footerText: data.branding?.footerText || `© ${new Date().getFullYear()} ${data.name.trim()}. All rights reserved.`,
      },
      contact: {
        whatsappNumber: data.contact?.whatsappNumber || data.ownerWhatsapp || '919516862495',
        supportWhatsapp: data.contact?.supportWhatsapp || data.ownerWhatsapp || '919516862495',
        supportEmail: data.contact?.supportEmail || ownerEmail,
        supportTelegram: data.contact?.supportTelegram || '',
        contactNumber: data.contact?.contactNumber || '',
        supportMessage: data.contact?.supportMessage || `Welcome to ${data.name.trim()} support!`,
      },
      payment: {
        upiId: data.payment?.upiId || '9770571091@ybl',
        upiName: data.payment?.upiName || data.name.trim(),
        qrCodeUrl: data.payment?.qrCodeUrl || '',
        minDepositINR: data.payment?.minDepositINR || 10,
        instructions: data.payment?.instructions || 'Scan QR Code or pay via UPI and enter UTR number.',
      },
      pricing: {
        adminMarginPercent: typeof data.pricing?.adminMarginPercent === 'number' ? data.pricing.adminMarginPercent : (this.memoryDb.settings.childPanelAdminMarginPercentage ?? 15),
        defaultMarginPercent: typeof data.pricing?.defaultMarginPercent === 'number' ? data.pricing.defaultMarginPercent : (this.memoryDb.settings.childPanelDefaultOwnerMarginPercentage ?? 25),
        minAllowedMarginPercent: data.pricing?.minAllowedMarginPercent ?? (this.memoryDb.settings.childPanelMinMarginPercentage ?? 5),
        maxAllowedMarginPercent: data.pricing?.maxAllowedMarginPercent ?? (this.memoryDb.settings.childPanelMaxMarginPercentage ?? 300),
        serviceCustomPrices: data.pricing?.serviceCustomPrices || {},
      },
      apiSettings: {
        useMainAdminApi: data.apiSettings?.useMainAdminApi ?? true,
        apiProviderName: data.apiSettings?.apiProviderName || 'Main SMM API Proxy',
        apiUrl: data.apiSettings?.apiUrl || '',
        apiKey: data.apiSettings?.apiKey || '',
        status: data.apiSettings?.status || 'connected',
        lastTestedAt: now,
      },
      allowedCategoryIds: data.allowedCategoryIds || [],
      allowedServiceIds: data.allowedServiceIds || [],
      walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : 0,
      totalRevenueINR: 0,
      totalOrdersCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (!this.memoryDb.childPanels) this.memoryDb.childPanels = [];
    this.memoryDb.childPanels.unshift(newChildPanel);
    this.syncToRtdb();

    return { childPanel: newChildPanel };
  }

  updateChildPanel(id: string, updates: Partial<ChildPanel>): { childPanel?: ChildPanel; error?: string } {
    const panel = this.getChildPanel(id);
    if (!panel) return { error: 'Child panel not found' };

    // Prevent overwriting main admin branding through child panel updates!
    if (updates.name !== undefined) panel.name = updates.name.trim();
    if (updates.subdomain !== undefined) panel.subdomain = updates.subdomain.trim();
    if (updates.customDomain !== undefined) panel.customDomain = updates.customDomain.trim().toLowerCase();
    if (updates.ownerName !== undefined) panel.ownerName = updates.ownerName.trim();
    if (updates.ownerEmail !== undefined) panel.ownerEmail = updates.ownerEmail.trim().toLowerCase();
    if (updates.ownerPassword !== undefined) panel.ownerPassword = updates.ownerPassword;
    if (updates.ownerWhatsapp !== undefined) panel.ownerWhatsapp = updates.ownerWhatsapp;
    if (updates.status !== undefined) panel.status = updates.status;

    // Sync credentials to owner User record
    if (panel.ownerId || panel.ownerEmail) {
      const ownerUser = this.getUser(panel.ownerId) || this.getUser(panel.ownerEmail);
      if (ownerUser) {
        if (updates.ownerEmail) ownerUser.email = updates.ownerEmail.trim().toLowerCase();
        if (updates.ownerName) ownerUser.username = updates.ownerName.trim();
        if (updates.ownerPassword) ownerUser.password = updates.ownerPassword;
        if (updates.ownerWhatsapp) ownerUser.whatsappNo = updates.ownerWhatsapp;
        this.saveUser(ownerUser);
      }
    }

    if (updates.permissions) {
      panel.permissions = { ...panel.permissions, ...updates.permissions };
    }
    if (updates.branding) {
      panel.branding = { ...panel.branding, ...updates.branding };
    }
    if (updates.contact) {
      panel.contact = { ...panel.contact, ...updates.contact };
    }
    if (updates.payment) {
      panel.payment = { ...panel.payment, ...updates.payment };
    }
    if (updates.pricing) {
      panel.pricing = { ...panel.pricing, ...updates.pricing };
    }
    if (updates.apiSettings) {
      panel.apiSettings = { ...panel.apiSettings, ...updates.apiSettings };
    }
    if (updates.allowedCategoryIds !== undefined) {
      panel.allowedCategoryIds = updates.allowedCategoryIds;
    }
    if (updates.allowedServiceIds !== undefined) {
      panel.allowedServiceIds = updates.allowedServiceIds;
    }
    if (typeof updates.walletBalance === 'number') {
      panel.walletBalance = updates.walletBalance;
    }

    panel.updatedAt = new Date().toISOString();
    this.syncToRtdb();

    return { childPanel: panel };
  }

  deleteChildPanel(id: string): { success: boolean; error?: string } {
    if (!this.memoryDb.childPanels) return { success: false, error: 'No child panels' };
    const initialLen = this.memoryDb.childPanels.length;
    this.memoryDb.childPanels = this.memoryDb.childPanels.filter((p) => p.id !== id && p.slug !== id);
    if (this.memoryDb.childPanels.length !== initialLen) {
      this.syncToRtdb();
      return { success: true };
    }
    return { success: false, error: 'Child panel not found' };
  }

  updateChildPanelBranding(childPanelId: string, branding: Partial<ChildPanelBranding>): { childPanel?: ChildPanel; error?: string } {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return { error: 'Child panel not found' };

    if (!panel.permissions?.brandingCustomization) {
      return { error: 'Branding customization is disabled for this child panel by Main Admin' };
    }

    panel.branding = {
      ...panel.branding,
      ...branding,
    };
    panel.updatedAt = new Date().toISOString();
    this.syncToRtdb();
    return { childPanel: panel };
  }

  updateChildPanelPricing(childPanelId: string, pricing: Partial<ChildPanelPricing>): { childPanel?: ChildPanel; error?: string } {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return { error: 'Child panel not found' };

    if (!panel.permissions?.pricingCustomization) {
      return { error: 'Pricing customization is disabled for this child panel by Main Admin' };
    }

    const minAllowed = panel.pricing?.minAllowedMarginPercent ?? 0;
    const maxAllowed = panel.pricing?.maxAllowedMarginPercent ?? 1000;

    if (typeof pricing.defaultMarginPercent === 'number') {
      if (pricing.defaultMarginPercent < minAllowed || pricing.defaultMarginPercent > maxAllowed) {
        return { error: `Margin must be between ${minAllowed}% and ${maxAllowed}% as permitted by Main Admin.` };
      }
    }

    panel.pricing = {
      ...panel.pricing,
      ...pricing,
      serviceCustomPrices: {
        ...(panel.pricing?.serviceCustomPrices || {}),
        ...(pricing.serviceCustomPrices || {}),
      },
    };
    panel.updatedAt = new Date().toISOString();
    this.syncToRtdb();
    return { childPanel: panel };
  }

  updateChildPanelAdminMarginRules(data: {
    adminMarginPercentage: number;
    defaultOwnerMarginPercentage?: number;
    minMarginPercentage?: number;
    maxMarginPercentage?: number;
    childPanelPriceINR?: number;
    applyToAllExistingPanels?: boolean;
  }): { settings: AdminSettings; updatedCount: number } {
    const adminMargin = Number(data.adminMarginPercentage);
    const defaultOwnerMargin = typeof data.defaultOwnerMarginPercentage === 'number' ? Number(data.defaultOwnerMarginPercentage) : (this.memoryDb.settings.childPanelDefaultOwnerMarginPercentage ?? 25);
    const minMargin = typeof data.minMarginPercentage === 'number' ? Number(data.minMarginPercentage) : (this.memoryDb.settings.childPanelMinMarginPercentage ?? 5);
    const maxMargin = typeof data.maxMarginPercentage === 'number' ? Number(data.maxMarginPercentage) : (this.memoryDb.settings.childPanelMaxMarginPercentage ?? 300);

    this.memoryDb.settings.childPanelAdminMarginPercentage = adminMargin;
    this.memoryDb.settings.childPanelDefaultOwnerMarginPercentage = defaultOwnerMargin;
    this.memoryDb.settings.childPanelMinMarginPercentage = minMargin;
    this.memoryDb.settings.childPanelMaxMarginPercentage = maxMargin;
    if (typeof data.childPanelPriceINR === 'number' && data.childPanelPriceINR >= 0) {
      this.memoryDb.settings.childPanelPriceINR = data.childPanelPriceINR;
    }

    let updatedCount = 0;
    if (data.applyToAllExistingPanels && this.memoryDb.childPanels) {
      this.memoryDb.childPanels.forEach((panel) => {
        if (!panel.pricing) {
          panel.pricing = {
            adminMarginPercent: adminMargin,
            defaultMarginPercent: defaultOwnerMargin,
            minAllowedMarginPercent: minMargin,
            maxAllowedMarginPercent: maxMargin,
            serviceCustomPrices: {},
          };
        } else {
          panel.pricing.adminMarginPercent = adminMargin;
          panel.pricing.minAllowedMarginPercent = minMargin;
          panel.pricing.maxAllowedMarginPercent = maxMargin;
          if (typeof panel.pricing.defaultMarginPercent !== 'number' || panel.pricing.defaultMarginPercent < minMargin) {
            panel.pricing.defaultMarginPercent = defaultOwnerMargin;
          }
        }
        panel.updatedAt = new Date().toISOString();
        updatedCount++;
      });
    }

    this.syncToRtdb();
    return { settings: this.memoryDb.settings, updatedCount };
  }

  updateChildPanelPayment(childPanelId: string, payment: Partial<ChildPanelPayment>): { childPanel?: ChildPanel; error?: string } {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return { error: 'Child panel not found' };

    if (!panel.permissions?.paymentCustomization) {
      return { error: 'Payment customization is disabled for this child panel by Main Admin' };
    }

    panel.payment = {
      ...panel.payment,
      ...payment,
    };
    panel.updatedAt = new Date().toISOString();
    this.syncToRtdb();
    return { childPanel: panel };
  }

  updateChildPanelContact(childPanelId: string, contact: Partial<ChildPanelContact>): { childPanel?: ChildPanel; error?: string } {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return { error: 'Child panel not found' };

    panel.contact = {
      ...panel.contact,
      ...contact,
    };
    panel.updatedAt = new Date().toISOString();
    this.syncToRtdb();
    return { childPanel: panel };
  }

  updateChildPanelApi(childPanelId: string, apiSettings: Partial<ChildPanelApiSettings>): { childPanel?: ChildPanel; error?: string } {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return { error: 'Child panel not found' };

    if (!panel.permissions?.apiAccess) {
      return { error: 'API access configuration is disabled for this child panel by Main Admin' };
    }

    panel.apiSettings = {
      ...panel.apiSettings,
      ...apiSettings,
    };
    panel.updatedAt = new Date().toISOString();
    this.syncToRtdb();
    return { childPanel: panel };
  }

  updateChildPanelPermissions(childPanelId: string, permissions: Partial<ChildPanelPermissions>): { childPanel?: ChildPanel; error?: string } {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return { error: 'Child panel not found' };

    panel.permissions = {
      ...panel.permissions,
      ...permissions,
    };
    panel.updatedAt = new Date().toISOString();
    this.syncToRtdb();
    return { childPanel: panel };
  }

  updateChildPanelStatus(childPanelId: string, status: 'active' | 'disabled'): { childPanel?: ChildPanel; error?: string } {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return { error: 'Child panel not found' };

    panel.status = status;
    panel.updatedAt = new Date().toISOString();
    this.syncToRtdb();
    return { childPanel: panel };
  }

  updateChildPanelWallet(childPanelId: string, amount: number, action: 'add' | 'reduce'): { childPanel?: ChildPanel; error?: string } {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return { error: 'Child panel not found' };

    const num = Number(amount);
    if (isNaN(num) || num <= 0) return { error: 'Valid positive amount is required' };

    if (action === 'reduce') {
      if (panel.walletBalance < num) {
        return { error: `Insufficient wallet balance. Available: ₹${panel.walletBalance.toFixed(2)}` };
      }
      panel.walletBalance = Number((panel.walletBalance - num).toFixed(4));
    } else {
      panel.walletBalance = Number((panel.walletBalance + num).toFixed(4));
    }

    panel.updatedAt = new Date().toISOString();
    this.syncToRtdb();
    return { childPanel: panel };
  }

  // --- CHILD PANEL ISOLATED DATA QUERIES ---

  getChildPanelOrders(childPanelId: string): Order[] {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return [];
    const allOrders = this.memoryDb.orders || [];
    return allOrders.filter((o) => o.childPanelId === panel.id || o.childPanelId === panel.slug);
  }

  getChildPanelUsers(childPanelId: string): User[] {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return [];
    const allUsers = this.memoryDb.users || [];
    return allUsers.filter((u) => u.childPanelId === panel.id || u.childPanelId === panel.slug);
  }

  getChildPanelDeposits(childPanelId: string): DepositRequest[] {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return [];
    const allDeposits = this.memoryDb.depositRequests || [];
    return allDeposits.filter((d) => d.childPanelId === panel.id || d.childPanelId === panel.slug);
  }

  getChildPanelTickets(childPanelId: string): Ticket[] {
    const panel = this.getChildPanel(childPanelId);
    if (!panel) return [];
    const allTickets = this.memoryDb.tickets || [];
    return allTickets.filter((t) => t.childPanelId === panel.id || t.childPanelId === panel.slug);
  }

  // Services tailored with Child Panel customized pricing and allowed filters
  getChildPanelServices(childPanelId: string, activeOnly: boolean = true): Service[] {
    const panel = this.getChildPanel(childPanelId);
    let services = this.getServices(activeOnly);
    if (!panel) return services;

    // Filter allowed categories and services if restricted
    if (panel.allowedCategoryIds && panel.allowedCategoryIds.length > 0) {
      services = services.filter((s) => panel.allowedCategoryIds!.includes(s.category));
    }
    if (panel.allowedServiceIds && panel.allowedServiceIds.length > 0) {
      services = services.filter((s) => panel.allowedServiceIds!.includes(s.id));
    }

    const adminMargin = typeof panel.pricing?.adminMarginPercent === 'number' ? panel.pricing.adminMarginPercent : (this.memoryDb.settings.childPanelAdminMarginPercentage ?? 15);
    const defaultMargin = typeof panel.pricing?.defaultMarginPercent === 'number' ? panel.pricing.defaultMarginPercent : (this.memoryDb.settings.childPanelDefaultOwnerMarginPercentage ?? 25);
    const customPrices = panel.pricing?.serviceCustomPrices || {};

    return services.map((s) => {
      const custom = customPrices[s.id];
      // Admin Wholesale Price to Child Owner (e.g. s.providerRate + adminMargin% or s.sellingRate)
      const baseCost = s.providerRate && s.providerRate > 0 ? s.providerRate : s.sellingRate;
      const adminWholesaleRate = Number((baseCost * (1 + adminMargin / 100)).toFixed(4));

      let effectiveSellingRate = s.sellingRate;
      if (custom && typeof custom.sellingRate === 'number' && custom.sellingRate > 0) {
        effectiveSellingRate = custom.sellingRate;
      } else {
        effectiveSellingRate = Number((adminWholesaleRate * (1 + defaultMargin / 100)).toFixed(4));
      }

      return {
        ...s,
        providerRate: adminWholesaleRate, // Child Owner's wholesale cost from Main Admin
        sellingRate: effectiveSellingRate, // End customer's retail price on child panel
      };
    });
  }

  getChildPanelStats(childPanelId?: string, timeframe: string = 'all'): any {
    let orders: Order[] = this.memoryDb.orders || [];
    let users: User[] = this.memoryDb.users || [];
    let deposits: DepositRequest[] = this.memoryDb.depositRequests || [];

    if (childPanelId) {
      const panel = this.getChildPanel(childPanelId);
      if (panel) {
        orders = orders.filter((o) => o.childPanelId === panel.id || o.childPanelId === panel.slug);
        users = users.filter((u) => u.childPanelId === panel.id || u.childPanelId === panel.slug);
        deposits = deposits.filter((d) => d.childPanelId === panel.id || d.childPanelId === panel.slug);
      }
    }

    // Timeframe filtering
    const now = Date.now();
    if (timeframe === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startMs = startOfDay.getTime();
      orders = orders.filter((o) => new Date(o.createdAt).getTime() >= startMs);
      deposits = deposits.filter((d) => new Date(d.createdAt).getTime() >= startMs);
    } else if (timeframe === 'yesterday') {
      const startOfYesterday = new Date();
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      startOfYesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date();
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      endOfYesterday.setHours(23, 59, 59, 999);
      orders = orders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= startOfYesterday.getTime() && t <= endOfYesterday.getTime();
      });
      deposits = deposits.filter((d) => {
        const t = new Date(d.createdAt).getTime();
        return t >= startOfYesterday.getTime() && t <= endOfYesterday.getTime();
      });
    } else if (timeframe === '7days') {
      const cutoff = now - 7 * 86400000;
      orders = orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
      deposits = deposits.filter((d) => new Date(d.createdAt).getTime() >= cutoff);
    } else if (timeframe === '30days') {
      const cutoff = now - 30 * 86400000;
      orders = orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
      deposits = deposits.filter((d) => new Date(d.createdAt).getTime() >= cutoff);
    }

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === 'Completed').length;
    const processingOrders = orders.filter((o) => o.status === 'Processing' || o.status === 'In Progress' || o.status === 'Pending').length;
    const cancelledOrders = orders.filter((o) => o.status === 'Canceled').length;

    const totalSales = orders.reduce((sum, o) => sum + (o.sellingPrice || 0), 0);
    const totalProviderCost = orders.reduce((sum, o) => sum + (o.providerCost || 0), 0);
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const totalChildProfit = orders.reduce((sum, o) => sum + (o.childOwnerProfit || 0), 0);
    const totalDepositsApproved = deposits
      .filter((d) => d.status === 'Approved')
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    return {
      timeframe,
      totalUsers: users.length,
      totalOrders,
      completedOrders,
      processingOrders,
      cancelledOrders,
      totalSales: Number(totalSales.toFixed(2)),
      totalProviderCost: Number(totalProviderCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      totalChildProfit: Number(totalChildProfit.toFixed(2)),
      totalDepositsApproved: Number(totalDepositsApproved.toFixed(2)),
    };
  }

  // --- CHILD PANEL PURCHASE REQUESTS ---

  getChildPanelRequests(userId?: string): ChildPanelPurchaseRequest[] {
    if (!this.memoryDb.childPanelRequests) {
      this.memoryDb.childPanelRequests = [];
    }

    // Enrich requests with latest user registration credentials (password, email, whatsapp, username)
    this.memoryDb.childPanelRequests.forEach((req) => {
      const u = this.getUser(req.userId) || (req.userEmail ? this.getUser(req.userEmail) : undefined) || (req.username ? this.getUser(req.username) : undefined);
      if (u) {
        if (u.username && (!req.username || req.username === 'User')) req.username = u.username;
        if (u.email && !req.userEmail) req.userEmail = u.email;
        if (u.whatsappNo && !req.whatsappNo) req.whatsappNo = u.whatsappNo;
        if (u.password && !req.password) req.password = u.password;
      }
    });

    if (userId) {
      return this.memoryDb.childPanelRequests.filter(
        (r) => r.userId === userId || (r.userEmail && r.userEmail.toLowerCase() === userId.toLowerCase())
      );
    }
    return this.memoryDb.childPanelRequests;
  }

  getChildPanelRequest(id: string): ChildPanelPurchaseRequest | undefined {
    if (!this.memoryDb.childPanelRequests) return undefined;
    const req = this.memoryDb.childPanelRequests.find((r) => r.id === id);
    if (req) {
      const u = this.getUser(req.userId) || (req.userEmail ? this.getUser(req.userEmail) : undefined);
      if (u && u.password && !req.password) req.password = u.password;
    }
    return req;
  }

  createChildPanelRequest(data: {
    userId: string;
    username?: string;
    userEmail?: string;
    whatsappNo?: string;
    password?: string;
    requestedPanelName: string;
    requestedSlug: string;
    requestedDomain?: string;
    amount?: number;
    utr: string;
  }): { request?: ChildPanelPurchaseRequest; error?: string } {
    if (!data.requestedPanelName || !data.requestedPanelName.trim()) {
      return { error: 'Child panel name is required' };
    }
    if (!data.requestedSlug || !data.requestedSlug.trim()) {
      return { error: 'Desired panel slug/subdomain identifier is required' };
    }
    if (!data.utr || !data.utr.trim()) {
      return { error: 'Payment UTR / Transaction Reference Number is required' };
    }

    const cleanSlug = data.requestedSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanSlug) {
      return { error: 'Please enter a valid alphanumeric slug' };
    }

    const existingPanel = this.getChildPanel(cleanSlug);
    if (existingPanel) {
      return { error: `The panel slug "${cleanSlug}" is already taken. Please choose another.` };
    }

    if (!this.memoryDb.childPanelRequests) {
      this.memoryDb.childPanelRequests = [];
    }

    const existingPending = this.memoryDb.childPanelRequests.find(
      (r) => r.requestedSlug.toLowerCase() === cleanSlug && r.status === 'Pending'
    );
    if (existingPending) {
      return { error: `A pending purchase request for slug "${cleanSlug}" is already waiting for Admin approval.` };
    }

    const user = this.getUser(data.userId) || (data.userEmail ? this.getUser(data.userEmail) : undefined);
    const id = 'CPR-' + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();
    const price =
      typeof data.amount === 'number' && data.amount > 0
        ? data.amount
        : (this.memoryDb.settings.childPanelPriceINR || 499);

    const userPass = data.password || (user ? user.password : undefined);

    const request: ChildPanelPurchaseRequest = {
      id,
      userId: data.userId || (user ? user.id : 'usr-demo'),
      username: data.username || (user ? user.username : 'User'),
      userEmail: data.userEmail || (user ? user.email : ''),
      whatsappNo: data.whatsappNo || (user ? user.whatsappNo : ''),
      password: userPass,
      requestedPanelName: data.requestedPanelName.trim(),
      requestedSlug: cleanSlug,
      requestedDomain: data.requestedDomain ? data.requestedDomain.trim().toLowerCase() : '',
      amount: price,
      utr: data.utr.trim(),
      status: 'Pending',
      createdAt: now,
    };

    this.memoryDb.childPanelRequests.unshift(request);
    this.saveToDisk();
    this.syncToRtdb();

    if (rtdb) {
      try {
        const cleanReq = cleanForFirebase(request);
        set(ref(rtdb, `smm_store/childPanelRequests/${id}`), cleanReq).catch(() => {});
        set(ref(rtdb, `child_panel_requests/${id}`), cleanReq).catch(() => {});
      } catch (err) {
        console.warn('createChildPanelRequest RTDB notice:', err);
      }
    }

    return { request };
  }

  approveChildPanelRequest(
    requestId: string,
    adminNote?: string
  ): { success: boolean; request?: ChildPanelPurchaseRequest; childPanel?: ChildPanel; user?: User; error?: string } {
    if (!this.memoryDb.childPanelRequests) {
      return { success: false, error: 'No purchase requests found' };
    }

    const request = this.memoryDb.childPanelRequests.find((r) => r.id === requestId);
    if (!request) {
      return { success: false, error: 'Child panel purchase request not found' };
    }

    if (request.status === 'Approved' && request.childPanelId) {
      const existingPanel = this.getChildPanel(request.childPanelId);
      return { success: true, request, childPanel: existingPanel };
    }

    const cleanSlug = request.requestedSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    let existingPanel = this.getChildPanel(cleanSlug);
    const panelId = existingPanel
      ? existingPanel.id
      : 'cp-' + cleanSlug + '-' + Math.floor(1000 + Math.random() * 9000);
    const now = new Date().toISOString();

    // CRITICAL REQUIREMENT:
    // 1. DO NOT create a new account!
    // 2. Convert the SAME existing user account into 'child_owner' / RESELLER.
    // 3. Keep the same User ID, username, email, password, wallet balance and all existing data.
    // 4. Create and link a unique childPanelId.
    let user = this.getUser(request.userId);
    if (!user && request.userEmail) {
      user = this.getUser(request.userEmail);
    }
    if (!user) {
      user = this.memoryDb.users.find(
        (u) =>
          (u.email && u.email.toLowerCase() === request.userEmail.toLowerCase()) ||
          (u.username && u.username.toLowerCase() === request.username.toLowerCase())
      );
    }

    if (!user) {
      // Fallback: If user record was transient, create it with original user details
      user = this.saveUser({
        id: request.userId || 'usr-' + cleanSlug,
        username: request.username || `${cleanSlug}_user`,
        email: request.userEmail || `${cleanSlug}@smmshivam.com`,
        whatsappNo: request.whatsappNo || '919516862495',
        password: 'password123',
        balance: 0,
        totalSpent: 0,
        role: 'child_owner',
        childPanelId: panelId,
        apiKey: 'cp_key_' + Math.random().toString(36).substring(2, 12),
        status: 'active',
        referralCode: cleanSlug.substring(0, 5).toUpperCase() + '01',
        referralBalance: 0,
        totalReferralEarnings: 0,
        totalReferralWithdrawn: 0,
        referralEligible: true,
        createdAt: now,
      });
    } else {
      // Convert existing user
      user.role = 'child_owner';
      user.childPanelId = panelId;
      if (request.whatsappNo && !user.whatsappNo) user.whatsappNo = request.whatsappNo;
      this.saveUser(user);
    }

    // Create or update ChildPanel linked to this user
    if (!existingPanel) {
      existingPanel = {
        id: panelId,
        name: request.requestedPanelName.trim(),
        slug: cleanSlug,
        subdomain: `${cleanSlug}.smmshivam.com`,
        customDomain: request.requestedDomain ? request.requestedDomain.trim().toLowerCase() : '',
        ownerId: user.id,
        ownerName: user.username,
        ownerEmail: user.email,
        ownerPassword: user.password || 'password123',
        ownerWhatsapp: user.whatsappNo || request.whatsappNo || '919516862495',
        status: 'active',
        permissions: {
          brandingCustomization: true,
          apiAccess: true,
          pricingCustomization: true,
          paymentCustomization: true,
          categoryServiceSelection: true,
        },
        branding: {
          panelName: request.requestedPanelName.trim(),
          logoUrl: '',
          faviconUrl: '',
          theme: 'cyberpunk-neon',
          accentColor: '#38bdf8',
          loginPageTitle: `${request.requestedPanelName.trim()} - Member Portal`,
          loginLogoUrl: '',
          footerText: `© ${new Date().getFullYear()} ${request.requestedPanelName.trim()}. All rights reserved.`,
        },
        contact: {
          whatsappNumber: user.whatsappNo || request.whatsappNo || '919516862495',
          supportWhatsapp: user.whatsappNo || request.whatsappNo || '919516862495',
          supportEmail: user.email || request.userEmail,
          supportTelegram: '',
          contactNumber: user.whatsappNo || request.whatsappNo || '',
          supportMessage: `Welcome to ${request.requestedPanelName.trim()} support!`,
        },
        payment: {
          upiId: '9770571091@ybl',
          upiName: request.requestedPanelName.trim(),
          qrCodeUrl: '',
          minDepositINR: 10,
          instructions: 'Scan QR Code or pay via UPI and enter UTR number.',
        },
        pricing: {
          adminMarginPercent: this.memoryDb.settings.childPanelAdminMarginPercentage ?? 15,
          defaultMarginPercent: this.memoryDb.settings.childPanelDefaultOwnerMarginPercentage ?? 25,
          minAllowedMarginPercent: this.memoryDb.settings.childPanelMinMarginPercentage ?? 5,
          maxAllowedMarginPercent: this.memoryDb.settings.childPanelMaxMarginPercentage ?? 300,
          serviceCustomPrices: {},
        },
        apiSettings: {
          useMainAdminApi: true,
          apiProviderName: 'Main SMM API Proxy',
          apiUrl: '',
          apiKey: '',
          status: 'connected',
          lastTestedAt: now,
        },
        allowedCategoryIds: [],
        allowedServiceIds: [],
        walletBalance: 0,
        totalRevenueINR: 0,
        totalOrdersCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      if (!this.memoryDb.childPanels) this.memoryDb.childPanels = [];
      this.memoryDb.childPanels.unshift(existingPanel);
    } else {
      existingPanel.ownerId = user.id;
      existingPanel.ownerEmail = user.email;
      existingPanel.ownerName = user.username;
      existingPanel.status = 'active';
      existingPanel.updatedAt = now;
    }

    request.status = 'Approved';
    request.childPanelId = panelId;
    request.adminNote = adminNote || 'Approved by Main Admin';
    request.processedAt = now;

    this.saveToDisk();
    this.syncToRtdb();

    if (rtdb) {
      try {
        const cleanReq = cleanForFirebase(request);
        const cleanPanel = cleanForFirebase(existingPanel);
        const cleanUser = cleanForFirebase(user);

        set(ref(rtdb, `smm_store/childPanelRequests/${requestId}`), cleanReq).catch(() => {});
        set(ref(rtdb, `child_panel_requests/${requestId}`), cleanReq).catch(() => {});
        set(ref(rtdb, `child_panels/${panelId}`), cleanPanel).catch(() => {});
        set(ref(rtdb, `users/${user.id}`), cleanUser).catch(() => {});
        if (user.firebaseUid && user.firebaseUid !== user.id) {
          set(ref(rtdb, `users/${user.firebaseUid}`), cleanUser).catch(() => {});
        }
      } catch (err) {
        console.warn('approveChildPanelRequest RTDB notice:', err);
      }
    }

    return { success: true, request, childPanel: existingPanel, user };
  }

  rejectChildPanelRequest(
    requestId: string,
    adminNote?: string
  ): { success: boolean; request?: ChildPanelPurchaseRequest; error?: string } {
    if (!this.memoryDb.childPanelRequests) {
      return { success: false, error: 'No purchase requests found' };
    }

    const request = this.memoryDb.childPanelRequests.find((r) => r.id === requestId);
    if (!request) {
      return { success: false, error: 'Child panel purchase request not found' };
    }

    const now = new Date().toISOString();
    request.status = 'Rejected';
    request.adminNote = adminNote || 'Rejected by Main Admin';
    request.processedAt = now;

    this.saveToDisk();
    this.syncToRtdb();

    if (rtdb) {
      try {
        const cleanReq = cleanForFirebase(request);
        set(ref(rtdb, `smm_store/childPanelRequests/${requestId}`), cleanReq).catch(() => {});
        set(ref(rtdb, `child_panel_requests/${requestId}`), cleanReq).catch(() => {});
      } catch (err) {
        console.warn('rejectChildPanelRequest RTDB notice:', err);
      }
    }

    return { success: true, request };
  }

  // Resolves effective branding and settings without EVER mutating Main Admin database record
  resolvePanelBranding(panelSlugOrIdOrDomain?: string): {
    isChildPanel: boolean;
    childPanel?: ChildPanel;
    settings: AdminSettings;
    branding: ChildPanelBranding;
    contact: ChildPanelContact;
    payment: ChildPanelPayment;
    active: boolean;
  } {
    const mainSettings = this.getSettings();
    if (!panelSlugOrIdOrDomain) {
      return {
        isChildPanel: false,
        settings: mainSettings,
        branding: {
          panelName: mainSettings.siteName,
          logoUrl: mainSettings.logoUrl,
          theme: mainSettings.theme || 'default-dark',
          accentColor: '#eab308',
        },
        contact: {
          whatsappNumber: mainSettings.whatsappNumber,
          supportWhatsapp: mainSettings.orderWhatsappNumber || mainSettings.whatsappNumber,
          supportTelegram: mainSettings.telegramUrl,
          supportMessage: mainSettings.notice,
        },
        payment: {
          upiId: mainSettings.upiId,
          minDepositINR: mainSettings.minDepositINR || 10,
        },
        active: true,
      };
    }

    const childPanel = this.getChildPanel(panelSlugOrIdOrDomain);
    if (!childPanel) {
      return {
        isChildPanel: false,
        settings: mainSettings,
        branding: {
          panelName: mainSettings.siteName,
          logoUrl: mainSettings.logoUrl,
          theme: mainSettings.theme || 'default-dark',
          accentColor: '#eab308',
        },
        contact: {
          whatsappNumber: mainSettings.whatsappNumber,
          supportWhatsapp: mainSettings.orderWhatsappNumber || mainSettings.whatsappNumber,
          supportTelegram: mainSettings.telegramUrl,
          supportMessage: mainSettings.notice,
        },
        payment: {
          upiId: mainSettings.upiId,
          minDepositINR: mainSettings.minDepositINR || 10,
        },
        active: true,
      };
    }

    const mergedSettings: AdminSettings = {
      ...mainSettings,
      siteName: childPanel.branding.panelName || childPanel.name,
      logoUrl: childPanel.branding.logoUrl || mainSettings.logoUrl,
      whatsappNumber: childPanel.contact.whatsappNumber || mainSettings.whatsappNumber,
      orderWhatsappNumber: childPanel.contact.supportWhatsapp || childPanel.contact.whatsappNumber || mainSettings.orderWhatsappNumber,
      telegramUrl: childPanel.contact.supportTelegram || mainSettings.telegramUrl,
      upiId: childPanel.payment.upiId || mainSettings.upiId,
      minDepositINR: childPanel.payment.minDepositINR || 10,
      theme: childPanel.branding.theme || 'default-dark',
      notice: childPanel.contact.supportMessage || mainSettings.notice,
    };

    return {
      isChildPanel: true,
      childPanel,
      settings: mergedSettings,
      branding: childPanel.branding,
      contact: childPanel.contact,
      payment: childPanel.payment,
      active: childPanel.status === 'active',
    };
  }
}

export const db = new DatabaseStore();

