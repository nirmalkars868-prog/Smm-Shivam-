import { db } from '../db/store.js';
import { RawProviderService, SMMProviderClient } from './smmProvider.js';
import { Service, SyncSummary } from '../types.js';

export class ServiceSyncEngine {
  /**
   * Preview service import before applying
   */
  static async previewImport(providerId: string): Promise<{
    totalFound: number;
    categoriesFound: number;
    newServicesCount: number;
    existingServicesCount: number;
    categories: string[];
    sampleNewServices: RawProviderService[];
  }> {
    const provider = db.getProvider(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    const client = new SMMProviderClient(provider.apiUrl, provider.apiKey);
    const rawServices = await client.getServices();

    const existingServices = db.getServices();
    const existingMap = new Map<string, Service>();
    existingServices.forEach((s) => {
      if (s.providerId === providerId) {
        existingMap.set(s.providerServiceId, s);
      }
    });

    const categorySet = new Set<string>();
    let newServicesCount = 0;
    let existingServicesCount = 0;
    const sampleNewServices: RawProviderService[] = [];

    rawServices.forEach((raw) => {
      const pServiceId = String(raw.service);
      const cat = raw.category ? String(raw.category).trim() : 'Uncategorized';
      categorySet.add(cat);

      if (existingMap.has(pServiceId)) {
        existingServicesCount++;
      } else {
        newServicesCount++;
        if (sampleNewServices.length < 5) {
          sampleNewServices.push(raw);
        }
      }
    });

    return {
      totalFound: rawServices.length,
      categoriesFound: categorySet.size,
      newServicesCount,
      existingServicesCount,
      categories: Array.from(categorySet),
      sampleNewServices,
    };
  }

  /**
   * Import or Sync Services with full duplicate prevention and markup
   */
  static async syncProviderServices(providerId: string): Promise<SyncSummary> {
    const provider = db.getProvider(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    const client = new SMMProviderClient(provider.apiUrl, provider.apiKey);
    let rawServices: RawProviderService[] = [];
    try {
      rawServices = await client.getServices();
    } catch (err: any) {
      const failSummary: SyncSummary = {
        checked: 0,
        newServices: 0,
        updatedServices: 0,
        inactiveServices: 0,
        errors: 1,
        message: err.message || 'Failed to fetch services from provider',
        timestamp: new Date().toISOString(),
      };
      db.saveProvider({
        id: providerId,
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'failed',
        lastSyncSummary: failSummary,
      });
      return failSummary;
    }

    const existingServices = db.getServices();
    const existingMap = new Map<string, Service>();
    
    // Map existing services by providerServiceId for duplicate prevention
    existingServices.forEach((s) => {
      if (s.providerId === providerId) {
        existingMap.set(s.providerServiceId, s);
      }
    });

    const providerServiceIdsSet = new Set<string>();
    let newServicesCount = 0;
    let updatedServicesCount = 0;
    let inactiveServicesCount = 0;
    let errorsCount = 0;

    const now = new Date().toISOString();

    // Process each service returned by the provider
    for (const raw of rawServices) {
      try {
        if (!raw.service) continue;
        const pServiceId = String(raw.service).trim();
        providerServiceIdsSet.add(pServiceId);

        const categoryName = raw.category ? String(raw.category).trim() : 'General Services';
        db.findOrCreateCategory(categoryName);

        const serviceName = raw.name || raw.service_name || `Service #${pServiceId}`;
        const type = raw.type ? String(raw.type) : 'Default';
        const providerRate = Number(raw.rate) || 0;
        const min = Number(raw.min) || 10;
        const max = Number(raw.max) || 10000;
        const refill = Boolean(raw.refill === true || raw.refill === 1 || raw.refill === '1' || raw.refill === 'true');
        const cancel = Boolean(raw.cancel === true || raw.cancel === 1 || raw.cancel === '1' || raw.cancel === 'true');

        const sellingRate = db.calculateSellingRate(providerRate, provider.markupPercentage);

        const existing = existingMap.get(pServiceId);

        if (existing) {
          // UPDATE existing service
          const rateChanged = existing.providerRate !== providerRate;
          const updatedService: Service = {
            ...existing,
            serviceName,
            category: categoryName,
            type,
            providerRate,
            sellingRate,
            min,
            max,
            refill,
            cancel,
            status: 'active', // Reactivate if it was inactive
            updatedAt: now,
          };
          db.saveService(updatedService);
          updatedServicesCount++;
        } else {
          // CREATE new service
          const newService: Service = {
            id: 'srv-' + providerId + '-' + pServiceId + '-' + Math.floor(Math.random() * 1000),
            providerId,
            providerServiceId: pServiceId,
            serviceName,
            category: categoryName,
            type,
            providerRate,
            sellingRate,
            min,
            max,
            refill,
            cancel,
            description: `Auto-imported service from ${provider.name}. Minimum order ${min}, maximum ${max}.`,
            status: 'active',
            createdAt: now,
            updatedAt: now,
          };
          db.saveService(newService);
          newServicesCount++;
        }
      } catch (e) {
        errorsCount++;
      }
    }

    // Mark missing provider services as INACTIVE (do not delete)
    existingServices.forEach((s) => {
      if (s.providerId === providerId && !providerServiceIdsSet.has(s.providerServiceId)) {
        if (s.status === 'active') {
          s.status = 'inactive';
          s.updatedAt = now;
          db.saveService(s);
          inactiveServicesCount++;
        }
      }
    });

    const summary: SyncSummary = {
      checked: rawServices.length,
      newServices: newServicesCount,
      updatedServices: updatedServicesCount,
      inactiveServices: inactiveServicesCount,
      errors: errorsCount,
      message: `Sync completed successfully at ${new Date().toLocaleTimeString()}`,
      timestamp: now,
    };

    // Save provider sync metadata
    db.saveProvider({
      id: providerId,
      lastSyncAt: now,
      lastSyncStatus: 'success',
      lastSyncSummary: summary,
    });

    // Save sync audit log
    db.addSyncLog({
      id: 'log-' + Date.now(),
      providerId,
      providerName: provider.name,
      timestamp: now,
      summary,
    });

    // Clean up empty categories that do not contain any services
    db.cleanEmptyCategories();

    return summary;
  }

  /**
   * Recalculate selling rates for all services under a provider when markup changes
   */
  static applyMarkupChange(providerId: string, newMarkupPercentage: number) {
    const services = db.getServices();
    let updatedCount = 0;
    services.forEach((s) => {
      if (s.providerId === providerId) {
        s.sellingRate = db.calculateSellingRate(s.providerRate, newMarkupPercentage);
        s.updatedAt = new Date().toISOString();
        db.saveService(s);
        updatedCount++;
      }
    });
    return updatedCount;
  }
}
