const ongkirService = require('../services/ongkirService');
const stockStore = require('../services/stockStore');

async function test() {
    console.log("🧪 Testing Ongkir Service (Gudang Tasikmalaya ➔ Jakarta):");
    console.log(ongkirService.formatOngkirReceipt("Jakarta", 1000));

    console.log("\n🧪 Testing Ongkir Service (Gudang Tasikmalaya ➔ Surabaya):");
    console.log(ongkirService.formatOngkirReceipt("Surabaya", 2000));

    console.log("\n🧪 Testing Stock Store Full Report:");
    console.log(stockStore.getFullStockReport());

    console.log("\n🧪 Testing Stock Deduction & Low Stock Alert:");
    stockStore.deductStock("5", 3); // Sisa 2 (Trigger alert)
    console.log(stockStore.getLowStockAlerts());
}

test();
