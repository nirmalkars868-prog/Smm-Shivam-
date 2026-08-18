import { db } from '../../src/db/store';
import { ServiceSyncEngine } from '../../src/services/serviceSync';

/**
 * Netlify Scheduled Function trigger for automated background service sync
 * Runs according to schedule configured in Netlify dashboard or schedule tag
 */
export const handler = async () => {
  console.log('[Scheduled Sync] Triggering background provider service synchronization...');

  const providers = db.getProviders();
  const activeAutoSyncProviders = providers.filter((p) => p.status === 'active' && p.autoSync);

  const results = [];

  for (const provider of activeAutoSyncProviders) {
    try {
      console.log(`[Scheduled Sync] Syncing provider ${provider.name} (${provider.id})...`);
      const summary = await ServiceSyncEngine.syncProviderServices(provider.id);
      results.push({ providerId: provider.id, status: 'success', summary });
    } catch (err: any) {
      console.error(`[Scheduled Sync] Error syncing provider ${provider.id}:`, err.message);
      results.push({ providerId: provider.id, status: 'error', error: err.message });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Scheduled sync execution completed',
      timestamp: new Date().toISOString(),
      results,
    }),
  };
};
