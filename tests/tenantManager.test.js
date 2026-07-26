require('dotenv').config();
const tenantManager = require('../services/tenantManager');
const fs = require('fs');
const path = require('path');

describe('tenantManager', () => {
    const testTenantId = 'testclinic_tm';

    afterAll(() => {
        // Clean up test tenant folders
        const tenantPath = path.join(__dirname, '..', 'tenants', testTenantId);
        if (fs.existsSync(tenantPath)) {
            fs.rmSync(tenantPath, { recursive: true, force: true });
        }
    });

    test('createTenant creates a new tenant with correct config', () => {
        const config = {
            companyName: 'Test Clinic TM',
            plan: 'Pro'
        };
        const tenant = tenantManager.createTenant(testTenantId, config);
        
        expect(tenant.tenantId).toBe(testTenantId);
        expect(tenant.companyName).toBe('Test Clinic TM');
        expect(tenant.subscription.plan).toBe('Pro');
        
        // Verify folder structure
        const configPath = path.join(__dirname, '..', 'tenants', testTenantId, 'config', 'tenant_config.json');
        expect(fs.existsSync(configPath)).toBe(true);
    });

    test('getTenantConfig returns the config', () => {
        const config = tenantManager.getTenantConfig(testTenantId);
        expect(config).toBeDefined();
        expect(config.companyName).toBe('Test Clinic TM');
    });

    test('getAllTenants returns array of tenants', () => {
        const tenants = tenantManager.getAllTenants();
        expect(Array.isArray(tenants)).toBe(true);
        expect(tenants.length).toBeGreaterThan(0);
        
        const found = tenants.find(t => t.tenantId === testTenantId);
        expect(found).toBeDefined();
    });

    test('agent names are customizable per tenant', () => {
        const customTenantId = 'custom_agents';
        const config = {
            companyName: 'Custom Agents Inc',
            salesName: 'BudiSales',
            opsName: 'AniOps'
        };
        
        const tenant = tenantManager.createTenant(customTenantId, config);
        expect(tenant.agents.SALES.name).toBe('BudiSales');
        expect(tenant.agents.OPS.name).toBe('AniOps');
        
        // Clean up this specific tenant
        const tenantPath = path.join(__dirname, '..', 'tenants', customTenantId);
        if (fs.existsSync(tenantPath)) {
            fs.rmSync(tenantPath, { recursive: true, force: true });
        }
    });
});
