require('dotenv').config();
const cartStore = require('../services/cartStore');
const fs = require('fs');
const path = require('path');

describe('cartStore', () => {
    const sender = '628123456789';
    const testTenantId = 'testclinic';

    afterAll(() => {
        // Clean up cart data
        const globalCartPath = path.join(__dirname, '..', 'config', 'carts.json');
        if (fs.existsSync(globalCartPath)) {
            fs.unlinkSync(globalCartPath);
        }

        const tenantPath = path.join(__dirname, '..', 'tenants', testTenantId, 'config');
        const tenantCartPath = path.join(tenantPath, 'carts.json');
        if (fs.existsSync(tenantCartPath)) {
            fs.unlinkSync(tenantCartPath);
        }
        
        // Remove tenant config dir if empty
        try { fs.rmdirSync(tenantPath); } catch (e) {}
        try { fs.rmdirSync(path.join(__dirname, '..', 'tenants', testTenantId)); } catch (e) {}
    });

    beforeEach(() => {
        cartStore.clearCart(sender, 'default');
        cartStore.clearCart(sender, testTenantId);
    });

    test('addItem to default (global) store', () => {
        const item = { sku: 'ITM1', nama: 'Item 1', harga: 10000, qty: 1 };
        cartStore.addItem(sender, item, 'default');
        const cart = cartStore.getCart(sender, 'default');
        
        expect(cart.length).toBe(1);
        expect(cart[0].sku).toBe('ITM1');
    });

    test('addItem to tenant-specific store', () => {
        const item = { sku: 'ITM2', nama: 'Item 2', harga: 20000, qty: 2 };
        cartStore.addItem(sender, item, testTenantId);
        const cart = cartStore.getCart(sender, testTenantId);
        
        expect(cart.length).toBe(1);
        expect(cart[0].sku).toBe('ITM2');
        expect(cart[0].qty).toBe(2);
    });

    test('data isolation: tenant cart data does NOT appear in global cart', () => {
        const globalItem = { sku: 'GLOB1', nama: 'Global', harga: 10000, qty: 1 };
        const tenantItem = { sku: 'TEN1', nama: 'Tenant', harga: 20000, qty: 1 };

        cartStore.addItem(sender, globalItem, 'default');
        cartStore.addItem(sender, tenantItem, testTenantId);

        const globalCart = cartStore.getCart(sender, 'default');
        const tenantCart = cartStore.getCart(sender, testTenantId);

        expect(globalCart).toHaveLength(1);
        expect(globalCart[0].sku).toBe('GLOB1');
        
        expect(tenantCart).toHaveLength(1);
        expect(tenantCart[0].sku).toBe('TEN1');
    });

    test('getCart returns correct items', () => {
        cartStore.addItem(sender, { sku: 'ITM1', nama: 'Item 1', harga: 10000, qty: 1 }, 'default');
        cartStore.addItem(sender, { sku: 'ITM2', nama: 'Item 2', harga: 20000, qty: 2 }, 'default');
        
        const cart = cartStore.getCart(sender, 'default');
        expect(cart).toHaveLength(2);
    });

    test('clearCart empties the cart', () => {
        cartStore.addItem(sender, { sku: 'ITM1', nama: 'Item 1', harga: 10000, qty: 1 }, 'default');
        expect(cartStore.getCart(sender, 'default').length).toBeGreaterThan(0);
        
        cartStore.clearCart(sender, 'default');
        expect(cartStore.getCart(sender, 'default')).toHaveLength(0);
    });

    test('getCartTotal calculates correctly', () => {
        cartStore.addItem(sender, { sku: 'ITM1', nama: 'Item 1', harga: 10000, qty: 1 }, 'default');
        cartStore.addItem(sender, { sku: 'ITM2', nama: 'Item 2', harga: 20000, qty: 2 }, 'default');
        
        const total = cartStore.getCartTotal(sender, 'default');
        expect(total).toBe(50000); // 10000 + 40000
    });
});
