import fs from 'fs';
import path from 'path';
import { rtdb, serverAuth } from './firebase.js';
import { getDatabase, ref, get, set, update, push, remove, runTransaction, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

let rtdbWriteDisabled = false;
import {
  AdminSettings,
  Category,
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
  youtubeSubscribersText: '154K Subscribe',
  upiId: '9770571091@ybl',
  merchantId: 'SHIVAM_MERCHANT_9770',
  merchantSecret: process.env.MERCHANT_SECRET || '',
  autoVerifyMerchant: true,
  minDepositINR: 10,
  exchangeRateINR: 86,
  notice: '⚡ Welcome to SMM SHIVAM Panel! Scan QR Code to add funds instantly via UPI & WhatsApp auto-verification.',
  currency: 'USD',
  currencySymbol: '$',
  theme: 'default-dark',
  snowEffect: false,
  referralSettings: defaultReferralSettings,
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
    balance: 500.00,
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
  if (Array.isArray(data)) return data.filter(Boolean);
  if (typeof data === 'object') {
    return Object.values(data).filter(Boolean) as T[];
  }
  return [];
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
          if (parsed.settings) {
            this.memoryDb.settings = {
              ...defaultSettings,
              ...parsed.settings,
              referralSettings: {
                ...defaultReferralSettings,
                ...((parsed.settings && parsed.settings.referralSettings) || {}),
              },
            };
          }
          console.log('⚡ Loaded store data from local persistent disk JSON file');
        }
      }
    } catch (err) {
      console.warn('store.ts loadFromDisk warning:', err);
    }
  }

  private initRtdbStore() {
    this.cleanEmptyCategories();
    this.sanitizeUsersReferralCodes();
    this.ensureAdminUserCredentials();

    if (rtdb) {
      const storeRef = ref(rtdb, 'smm_store');
      get(storeRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const parsed = snapshot.val();
            if (parsed) {
              console.log('⚡ Loaded store data from Firebase Realtime Database');
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
              if (parsed.settings) {
                this.memoryDb.settings = {
                  ...defaultSettings,
                  ...parsed.settings,
                  referralSettings: {
                    ...defaultReferralSettings,
                    ...((parsed.settings && parsed.settings.referralSettings) || {}),
                  },
                };
              }
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
              if (parsed.depositRequests) this.memoryDb.depositRequests = ensureArray<DepositRequest>(parsed.depositRequests);
              if (parsed.referralCommissions) this.memoryDb.referralCommissions = ensureArray<ReferralCommission>(parsed.referralCommissions);
              if (parsed.referralWithdrawals) this.memoryDb.referralWithdrawals = ensureArray<ReferralWithdrawal>(parsed.referralWithdrawals);
              if (parsed.settings) {
                this.memoryDb.settings = {
                  ...defaultSettings,
                  ...parsed.settings,
                  referralSettings: {
                    ...defaultReferralSettings,
                    ...((parsed.settings && parsed.settings.referralSettings) || {}),
                  },
                };
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

  private ensureAdminUserCredentials() {
    let admin = this.memoryDb.users.find(
      (u) => u.role === 'admin' || u.id === 'usr-admin' || u.username === 'admin' || u.username === 'yourshivamff_'
    );
    if (admin) {
      admin.username = 'yourshivamff_';
      admin.role = 'admin';
      admin.status = 'active';
      admin.referralCode = 'ADMIN09';
      delete (admin as any).password;
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
    if (rtdb) {
      try {
        const sanitized = cleanForFirebase(this.sanitizeDbForRtdb(this.memoryDb));
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
    if (rtdb && user) {
      try {
        const currentUser = serverAuth?.currentUser;
        if (!currentUser) return;

        // Non-admin clients can only write to their own users/$uid node
        const isSelf = currentUser.uid === user.id || currentUser.uid === user.firebaseUid;
        const isAdmin = currentUser.email === 'shivamnirmalkar26@gmail.com';
        if (!isSelf && !isAdmin) return;

        const cleanUser = cleanForFirebase(user);
        delete cleanUser.password;
        if (user.id) {
          set(ref(rtdb, `users/${user.id}`), cleanUser).catch((e) => {
            const msg = String(e?.message || e);
            if (!msg.toLowerCase().includes('permission_denied')) {
              console.warn('RTDB user node write warning:', msg);
            }
          });
        }
        if (user.firebaseUid && user.firebaseUid !== user.id) {
          set(ref(rtdb, `users/${user.firebaseUid}`), cleanUser).catch((e) => {
            const msg = String(e?.message || e);
            if (!msg.toLowerCase().includes('permission_denied')) {
              console.warn('RTDB user node write warning:', msg);
            }
          });
        }
      } catch (err) {
        console.warn('syncUserToRtdb exception:', err);
      }
    }
  }

  private sanitizeDbForRtdb(db: DatabaseSchema): any {
    const cleanUsers = (db.users || []).map((user) => {
      const copy = { ...user };
      delete (copy as any).password;
      return copy;
    });
    return {
      ...db,
      users: cleanUsers,
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
    const catMap = new Map<string, Category>();
    this.memoryDb.categories.forEach((c) => {
      if (c && c.name) catMap.set(c.name.trim().toLowerCase(), c);
    });

    // Auto-create category object for every active service
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
        }
      }
    });

    const usedCategories = new Set(
      this.memoryDb.services
        .filter((s) => s.status === 'active')
        .map((s) => s.category.trim().toLowerCase())
    );

    this.memoryDb.categories = this.memoryDb.categories.filter((c) =>
      usedCategories.has(c.name.trim().toLowerCase())
    );

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

    const usedCategories = new Set(
      this.memoryDb.services
        .filter((s) => s.status === 'active')
        .map((s) => s.category.trim().toLowerCase())
    );

    return this.memoryDb.categories
      .filter((c) => usedCategories.has(c.name.trim().toLowerCase()))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  findOrCreateCategory(categoryName: string): Category {
    const cleanName = (categoryName || 'General Services').trim();
    let found = this.memoryDb.categories.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (!found) {
      found = {
        id: 'cat-' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: cleanName,
        sortOrder: this.memoryDb.categories.length + 1,
      };
      this.memoryDb.categories.push(found);
      this.syncToRtdb();
    }
    return found;
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

  updateBulkProfitMargin(marginPercentage: number): { updatedCount: number; marginPercentage: number } {
    const margin = Number(marginPercentage) || 0;
    let updatedCount = 0;

    this.memoryDb.services.forEach((service) => {
      service.sellingRate = this.calculateSellingRate(service.providerRate, margin);
      service.updatedAt = new Date().toISOString();
      updatedCount++;
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
    delete (copy as any).password;
    const existingIndex = this.memoryDb.users.findIndex(
      (u) => u.id === copy.id || (u.email && u.email.toLowerCase() === copy.email.toLowerCase())
    );
    if (existingIndex >= 0) {
      const merged = {
        ...this.memoryDb.users[existingIndex],
        ...copy,
      };
      this.memoryDb.users[existingIndex] = merged;
      this.syncToRtdb();
      this.syncUserToRtdb(merged);
      return merged;
    } else {
      this.memoryDb.users.push(copy);
      this.syncToRtdb();
      this.syncUserToRtdb(copy);
      return copy;
    }
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
        const cleanSettings = cleanForFirebase(this.memoryDb.settings);
        await set(ref(rtdb, 'smm_store/settings'), cleanSettings);
        await set(ref(rtdb, 'settings'), cleanSettings);
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
}

export const db = new DatabaseStore();
