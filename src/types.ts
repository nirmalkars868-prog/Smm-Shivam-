export interface Category {
  id: string;
  name: string;
  icon?: string;
  sortOrder?: number;
}

export interface Service {
  id: string; // Internal ID
  providerId: string; // e.g. "smmdip" or provider ID
  providerServiceId: string; // ID from SMMDIP / Provider API
  serviceName: string;
  category: string;
  type?: string; // Default, Custom Comments, Package, Poll, etc.
  providerRate: number; // Cost from provider per 1000
  sellingRate: number; // Price charged to customer per 1000
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string; // Hidden on client side
  status: 'active' | 'inactive';
  markupPercentage: number; // e.g. 20 for 20%
  autoSync: boolean;
  autoSyncInterval: '1h' | '6h' | '12h' | '24h';
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'failed' | 'pending';
  lastSyncSummary?: SyncSummary;
  createdAt: string;
  updatedAt: string;
}

export interface SyncSummary {
  checked: number;
  newServices: number;
  updatedServices: number;
  inactiveServices: number;
  errors: number;
  message?: string;
  timestamp: string;
}

export interface SyncLog {
  id: string;
  providerId: string;
  providerName: string;
  timestamp: string;
  summary: SyncSummary;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  serviceId: string;
  serviceName: string;
  category: string;
  providerId: string;
  providerServiceId: string;
  providerOrderId?: string;
  link: string;
  quantity: number;
  sellingPrice: number; // Amount paid by customer
  providerCost: number; // Cost from provider
  profit: number; // sellingPrice - providerCost
  startCount?: number;
  remains?: number;
  status: 'Pending' | 'In Progress' | 'Processing' | 'Completed' | 'Partial' | 'Canceled';
  refillStatus?: 'None' | 'Requested' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface User {
  id: string;
  firebaseUid?: string;
  username: string;
  email: string;
  whatsappNo?: string;
  password?: string;
  balance: number;
  totalSpent: number;
  role: 'admin' | 'user';
  apiKey: string;
  status?: 'active' | 'blocked';
  referralCode: string;
  referredByUserId?: string;
  referredByReferralCode?: string;
  referralEligible?: boolean;
  referralEligibleAt?: string;
  referralBalance?: number; // In INR
  totalReferralEarnings?: number; // In INR
  totalReferralWithdrawn?: number; // In INR
  upiId?: string;
  upiName?: string;
  createdAt: string;
}

export interface ReferralCommission {
  id: string;
  orderId?: string;
  beneficiaryUserId: string;
  sourceUserId: string;
  sourceUsername: string;
  level: 1 | 2;
  orderProfitINR: number;
  commissionPercentage: number;
  commissionAmountINR: number;
  status: 'Credited' | 'Pending';
  createdAt: string;
}

export interface ReferralWithdrawal {
  id: string;
  userId: string;
  username: string;
  amount: number; // In INR
  upiId: string;
  upiName: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  processedAt?: string;
  adminNote?: string;
}

export interface ReferralSettings {
  enabled: boolean;
  level1Percentage: number; // Default 25%
  level2Percentage: number; // Default 5%
  minimumDepositINR: number; // Default 100
  minimumWithdrawalINR: number; // Default 100
}

export interface Ticket {
  id: string;
  userId: string;
  username: string;
  subject: string;
  orderId?: string;
  status: 'Open' | 'Answered' | 'Closed';
  messages: {
    sender: 'user' | 'admin';
    text: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceUpdateLog {
  id: string;
  serviceId: string;
  serviceName: string;
  type: 'rate_change' | 'disabled' | 'enabled' | 'new_service';
  oldRate?: number;
  newRate?: number;
  timestamp: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  username: string;
  amount: number; // In INR or USD
  utr: string; // UTR or Transaction Ref Number
  paymentMethod: 'QR_UPI';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt?: string;
}

export interface AdminSettings {
  siteName: string;
  logoUrl?: string;
  whatsappNumber: string;
  orderWhatsappNumber?: string;
  whatsappChatUrl?: string;
  whatsappChannelUrl?: string;
  telegramUrl?: string;
  youtubeUrl?: string;
  youtubeSubscribersText?: string;
  upiId: string;
  merchantId?: string;
  merchantSecret?: string;
  autoVerifyMerchant?: boolean;
  minDepositINR: number;
  exchangeRateINR: number; // e.g. 86
  notice: string;
  defaultProfitMarginPercentage?: number; // e.g. 30 for 30% profit margin
  currency: string;
  currencySymbol: string;
  theme?: 'default-dark' | 'cyberpunk-neon' | 'emerald-luxury' | 'royal-purple' | 'sunset-amber' | 'ice-sapphire' | 'clean-light';
  snowEffect?: boolean;
  referralSettings?: ReferralSettings;
}
