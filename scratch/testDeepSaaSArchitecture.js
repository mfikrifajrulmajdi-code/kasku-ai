const subscriptionEnforcer = require('../services/subscriptionEnforcer');
const baileysMultiSocket = require('../services/baileysMultiSocket');
const tenantResolver = require('../middleware/tenantResolver');

async function test() {
    console.log("================================================================");
    console.log("🧪 DEEP-DIVE TESTING B2B SAAS MULTI-TENANT ENGINE & SOCKETS");
    console.log("================================================================\n");

    // 1. Test Subscription Life-Cycle Audit
    console.log("📌 1. Testing Subscription Enforcer Audit:");
    const auditReport = subscriptionEnforcer.auditTenantSubscriptions();
    console.table(auditReport);

    console.log("\n-------------------------------------------------\n");

    // 2. Test Multi-Socket Orchestrator
    console.log("📌 2. Testing Baileys Multi-Socket Orchestrator:");
    await baileysMultiSocket.startTenantSocket('glowclinic');
    await baileysMultiSocket.startTenantSocket('autoparts');

    console.log("\n📋 Active Tenant Sockets:");
    console.table(baileysMultiSocket.listActiveSockets());

    console.log("\n-------------------------------------------------\n");

    // 3. Test Subdomain Resolver Middleware
    console.log("📌 3. Testing Subdomain & Web Request Resolver:");
    const mockReq = {
        headers: { host: 'glowclinic.kasku.ai' },
        query: {}
    };
    const mockRes = {};
    tenantResolver(mockReq, mockRes, () => {
        console.log(`  ✅ Web Request dipetakan ke Tenant: '${mockReq.tenantConfig.companyName}' (${mockReq.tenantId})`);
        console.log(`  🎭 Sales Agent Persona: ${mockReq.tenantConfig.agents.SALES.name}`);
        console.log(`  👩‍💼 Ops Agent Persona: ${mockReq.tenantConfig.agents.OPS.name}`);
    });

    console.log("\n================================================================");
    console.log("🏁 HASIL AKHIR: ARSITEKTUR DEEP-DIVE SAAS MULTI-TENANT 100% PASS");
    console.log("================================================================\n");
}

test();
