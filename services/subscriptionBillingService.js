// ============================================================================
// SUBSCRIPTION BILLING SERVICE — Midtrans SaaS Plan Auto-Billing & Upgrades
// ============================================================================

const midtrans = require('./midtransService');
const tenantManager = require('./tenantManager');
const usageMeter = require('./usageMeter');

const PRICING_PLANS = {
    starter: { name: 'Starter', price: 99000, limit: 500, description: 'Cocok untuk Toko Kecil & UMKM' },
    basic: { name: 'Basic', price: 299000, limit: 2000, description: 'Cocok untuk Toko Online berkembang' },
    pro: { name: 'Pro', price: 599000, limit: 10000, description: 'Cocok untuk Brand & Klinik' },
    enterprise: { name: 'Enterprise', price: 1500000, limit: 100000, description: 'Unlimited & Dedicated Server' }
};

function getPricingPlans() {
    return PRICING_PLANS;
}

async function createPlanSubscriptionCheckout(tenantId, planKey, customerName = 'Klien SaaS', customerPhone = '') {
    const plan = PRICING_PLANS[planKey.toLowerCase()];
    if (!plan) throw new Error('Paket berlangganan tidak ditemukan');

    const orderId = `SUB-${tenantId.toUpperCase()}-${Date.now()}`;
    const snapResult = await midtrans.createSnapTransaction(
        orderId,
        plan.price,
        customerName,
        customerPhone
    );

    return {
        orderId,
        tenantId,
        planKey: planKey.toLowerCase(),
        planName: plan.name,
        amount: plan.price,
        checkoutUrl: snapResult.redirectUrl,
        snapToken: snapResult.token
    };
}

/**
 * Dipanggil saat Webhook Midtrans mengonfirmasi pembayaran sukses
 */
function handleSubscriptionPaymentSuccess(orderId, tenantId, planKey) {
    const plan = PRICING_PLANS[planKey.toLowerCase()];
    if (!plan) return false;

    // Update config tenant
    const tenantConfig = tenantManager.getTenantConfig(tenantId);
    if (tenantConfig) {
        tenantConfig.plan = plan.name;
        tenantConfig.subscriptionStatus = 'active';
        tenantConfig.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // +30 Hari
        tenantManager.saveTenantConfig(tenantId, tenantConfig);
    }

    console.log(`[SUBSCRIPTION-BILLING] 🎉 Tenant ${tenantId} berhasil diperbarui ke paket ${plan.name}`);
    return true;
}

module.exports = {
    getPricingPlans,
    createPlanSubscriptionCheckout,
    handleSubscriptionPaymentSuccess
};
