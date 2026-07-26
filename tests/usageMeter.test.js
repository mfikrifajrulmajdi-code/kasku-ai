require('dotenv').config();
const usageMeter = require('../services/usageMeter');
const fs = require('fs');
const path = require('path');

describe('usageMeter', () => {
    const testTenantId = 'testclinic_usage';

    afterAll(() => {
        const tenantPath = path.join(__dirname, '..', 'tenants', testTenantId);
        if (fs.existsSync(tenantPath)) {
            fs.rmSync(tenantPath, { recursive: true, force: true });
        }
    });

    beforeEach(() => {
        const usageFile = path.join(__dirname, '..', 'tenants', testTenantId, 'config', 'usage.json');
        if (fs.existsSync(usageFile)) {
            fs.unlinkSync(usageFile);
        }
    });

    test('recordMessage increments count', () => {
        const result1 = usageMeter.recordMessage(testTenantId, 'Starter');
        expect(result1.current).toBe(1);

        const result2 = usageMeter.recordMessage(testTenantId, 'Starter');
        expect(result2.current).toBe(2);
    });

    test('recordMessage returns allowed=true when under limit', () => {
        const result = usageMeter.recordMessage(testTenantId, 'Starter');
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(500); // Starter limit
    });

    test('recordMessage returns allowed=false when over limit', () => {
        // Mock the usage file to simulate being near limit
        const month = usageMeter.getCurrentMonth();
        const usageData = {
            [month]: {
                messageCount: 500
            }
        };
        const dir = path.join(__dirname, '..', 'tenants', testTenantId, 'config');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'usage.json'), JSON.stringify(usageData));

        const result = usageMeter.recordMessage(testTenantId, 'Starter'); // Current becomes 501
        expect(result.current).toBe(501);
        expect(result.allowed).toBe(false);
    });

    test('getUsage returns current month data', () => {
        usageMeter.recordMessage(testTenantId, 'Starter');
        usageMeter.recordMessage(testTenantId, 'Starter');

        const usage = usageMeter.getUsage(testTenantId);
        expect(usage.current).toBe(2);
        expect(usage.month).toBe(usageMeter.getCurrentMonth());
    });
});
