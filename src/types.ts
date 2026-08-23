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
  childPanelId?: string; // Associated Child Panel if placed under a child panel
  serviceId: string;
  serviceName: string;
  category: string;
  providerId: string;
  providerServiceId: string;
  providerOrderId?: string;
  link: string;
  quantity: number;
  sellingPrice: number; // Amount paid by customer
  providerCost: number; // Cost from provider / main admin
  profit: number; // sellingPrice - providerCost
  childOwnerProfit?: number; // Profit earned by Child Panel Owner
  mainAdminProfit?: number; // Profit earned by Main Admin
  startCount?: number;
  remains?: number;
  status: 'Pending' | 'In Progress' | 'Processing' | 'Completed' | 'Partial' | 'Canceled';
  refillStatus?: 'None' | 'Requested' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface User {
  id: string;
  firebaseUid?: string;
  childPanelId?: string; // Associated Child Panel ID if user is registered on child panel
  username: string;
  email: string;
  whatsappNo?: string;
  password?: string;
  balance: number;
  totalSpent: number;
  role: 'admin' | 'child_owner' | 'user';
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

// --- CHILD PANEL DATA STRUCTURES ---

export interface ChildPanelPermissions {
  brandingCustomization: boolean; // can change logo, name, theme, favicon
  apiAccess: boolean; // can configure own API / test API
  pricingCustomization: boolean; // can adjust own margins/rates
  paymentCustomization: boolean; // can set own UPI / QR
  categoryServiceSelection: boolean; // can select allowed services
}

export interface ChildPanelBranding {
  panelName: string;
  logoUrl?: string;
  faviconUrl?: string;
  theme?: 'default-dark' | 'cyberpunk-neon' | 'emerald-luxury' | 'royal-purple' | 'sunset-amber' | 'ice-sapphire' | 'clean-light';
  accentColor?: string; // e.g. '#eab308'
  loginLogoUrl?: string;
  loginPageTitle?: string;
  footerText?: string;
}

export interface ChildPanelContact {
  whatsappNumber: string;
  supportWhatsapp?: string;
  supportEmail?: string;
  supportTelegram?: string;
  contactNumber?: string;
  supportMessage?: string;
}

export interface ChildPanelPayment {
  upiId: string;
  upiName?: string;
  qrCodeUrl?: string;
  minDepositINR: number;
  instructions?: string;
}

export interface ChildPanelPricing {
  adminMarginPercent?: number; // Main Admin wholesale profit margin on this child panel (e.g. 15%)
  defaultMarginPercent: number; // e.g. 25 for 25% markup on top of Main Admin price
  minAllowedMarginPercent?: number; // set by Main Admin
  maxAllowedMarginPercent?: number; // set by Main Admin
  serviceCustomPrices?: Record<string, { sellingRate: number; enabled?: boolean }>; // serviceId -> custom selling rate
}

export interface ChildPanelApiSettings {
  useMainAdminApi: boolean; // true = Option A (uses Main Admin API proxy), false = Option B (uses own API)
  providerMode?: 'main_admin' | 'custom_api';
  apiProviderName?: string;
  apiUrl?: string;
  apiKey?: string;
  customApiUrl?: string;
  customApiKey?: string;
  autoForwardOrders?: boolean;
  status?: 'connected' | 'error' | 'untested';
  lastTestedAt?: string;
}

export type ChildPanelApi = ChildPanelApiSettings;

export interface ChildPanel {
  id: string; // e.g. 'cp-abc1234'
  name: string; // e.g. 'ABC DIGITAL SMM'
  slug: string; // e.g. 'abc'
  subdomain?: string; // e.g. 'abc.smmshivam.com'
  customDomain?: string; // e.g. 'www.abcdigitalsmm.com'
  ownerId: string; // User ID of the child owner
  ownerName: string;
  ownerEmail: string;
  ownerPassword?: string;
  ownerWhatsapp?: string;
  status: 'active' | 'disabled';
  permissions: ChildPanelPermissions;
  branding: ChildPanelBranding;
  contact: ChildPanelContact;
  payment: ChildPanelPayment;
  pricing: ChildPanelPricing;
  apiSettings: ChildPanelApiSettings;
  allowedCategoryIds?: string[]; // Empty/undefined = all categories allowed
  allowedServiceIds?: string[]; // Empty/undefined = all services allowed
  walletBalance: number; // In INR, separate from Main Admin wallet
  totalRevenueINR: number;
  totalOrdersCount: number;
  totalUsersCount?: number;
  totalProfitINR?: number;
  totalChildProfitINR?: number;
  totalMainAdminProfitINR?: number;
  createdAt: string;
  updatedAt: string;
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
  childPanelId?: string; // Associated Child Panel
  userEmail?: string;
  whatsappNo?: string;
  subject: string;
  orderId?: string;
  status: 'Open' | 'In Progress' | 'Answered' | 'Closed';
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
  childPanelId?: string; // Associated Child Panel
  amount: number; // In INR or USD
  utr: string; // UTR or Transaction Ref Number
  paymentMethod: 'QR_UPI';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt?: string;
}

export interface ChildPanelPurchaseRequest {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  whatsappNo?: string;
  password?: string; // registration password for Admin verification
  requestedPanelName: string;
  requestedSlug: string;
  requestedDomain?: string;
  amount: number; // in INR
  utr: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminNote?: string;
  childPanelId?: string; // set once approved
  createdAt: string;
  processedAt?: string;
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
  qrCodeUrl?: string;
  paymentQrCodeUrl?: string;
  merchantId?: string;
  merchantSecret?: string;
  autoVerifyMerchant?: boolean;
  minDepositINR: number;
  exchangeRateINR: number; // e.g. 86
  notice: string;
  // --- SPECIAL POPUP NOTICE & BROADCAST ANNOUNCEMENT ---
  popupNoticeEnabled?: boolean;
  popupNoticeTitle?: string;
  popupNoticeText?: string;
  popupNoticeType?: 'offer' | 'info' | 'warning' | 'alert';
  popupNoticeButtonText?: string;
  popupNoticeButtonLink?: string;
  topAlertBarEnabled?: boolean;
  topAlertBarText?: string;
  defaultProfitMarginPercentage?: number; // e.g. 30 for 30% profit margin
  currency: string;
  currencySymbol: string;
  theme?: 'default-dark' | 'cyberpunk-neon' | 'emerald-luxury' | 'royal-purple' | 'sunset-amber' | 'ice-sapphire' | 'clean-light';
  snowEffect?: boolean;
  referralSettings?: ReferralSettings;
  // --- CHILD PANEL PURCHASE & MARGIN CONFIGURATION ---
  childPanelPriceINR?: number; // Price to purchase a child panel (e.g. 499 or 999 INR)
  childPanelDescription?: string;
  childPanelAdminMarginPercentage?: number; // Main Admin wholesale profit margin on Child Panels (e.g. 15%)
  childPanelDefaultOwnerMarginPercentage?: number; // Default markup % for new child panels (e.g. 25%)
  childPanelMinMarginPercentage?: number; // Minimum markup % child owner is allowed to set (e.g. 5%)
  childPanelMaxMarginPercentage?: number; // Maximum markup % child owner is allowed to set (e.g. 300%)
  // --- WELCOME VOICE (DYNAMIC AUDIO GREETING) ---
  welcomeVoiceEnabled?: boolean;
  welcomeVoiceUrl?: string; // Audio Data URL (base64) or direct MP3/WAV audio link
  welcomeVoiceAudioData?: string; // Persistent Base64 audio payload stored for cold restarts / Render instances
  welcomeVoiceName?: string; // Filename or title of the audio
  welcomeVoiceText?: string; // Text phrase for TTS or voice description (e.g. "WELCOME TO SMM SHIVAM OFFICIAL")
  welcomeVoiceVolume?: number; // Volume 0.0 to 1.0 (default: 0.9)
  welcomeVoicePlayOnReload?: boolean; // Play on every website open / reload
  welcomeVoiceMode?: 'custom_audio' | 'tts_speech' | 'none';
}
