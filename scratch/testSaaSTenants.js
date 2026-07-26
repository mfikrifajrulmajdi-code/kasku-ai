const tenantManager = require('../services/tenantManager');

async function test() {
    console.log("🧪 Testing B2B SaaS Multi-Tenant White-Label Engine...");

    // 1. Buat Klien 1: GlowClinic AI (Klinik Kecantikan)
    const client1 = tenantManager.createTenant("glowclinic", {
        companyName: "Glow Clinic Beauty & Skincare",
        industry: "Beauty & Clinic",
        plan: "Business",
        salesName: "dr. Sarah",
        opsName: "Mbak Maya",
        csName: "Suster Ani"
    });

    // 2. Buat Klien 2: AutoParts AI (Distributor Sparepart)
    const client2 = tenantManager.createTenant("autoparts", {
        companyName: "AutoParts Indonesia",
        industry: "Automotive & Spareparts",
        plan: "Enterprise",
        salesName: "Bapak Agus",
        opsName: "Mas Rudi",
        procurementName: "Pak Bambang"
    });

    console.log("\n📊 HASIL DAFTAR KLIEN B2B SAAS (SUPER ADMIN DASHBOARD):");
    const allTenants = tenantManager.getAllTenants();
    console.table(allTenants.map(t => ({
        ID: t.tenantId,
        Company: t.companyName,
        Industry: t.industry,
        Plan: t.subscription.plan,
        SalesAgent: t.agents.SALES.name,
        OpsAgent: t.agents.OPS.name
    })));
}

test();
