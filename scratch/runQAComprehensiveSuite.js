// ============================================================================
// COMPREHENSIVE AUTOMATED QA & STRESS TEST SUITE FOR KASKU-AI
// ============================================================================

const cartStore = require('../services/cartStore');
const orderStore = require('../services/orderStore');
const midtrans = require('../services/midtransService');
const opsAgent = require('../services/agents/opsAgent');
const routerAgent = require('../services/agents/routerAgent');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ [PASS] ${testName}`);
    } else {
        console.error(`  ❌ [FAIL] ${testName}`);
    }
}

async function runSuite() {
    console.log(`\n=================================================`);
    console.log(`🧪 KASKU-AI AUTOMATED COMPREHENSIVE QA TEST SUITE`);
    console.log(`=================================================\n`);

    // TEST 1: Cart Store Persistence & Formatting
    console.log(`📌 1. TESTING PERSISTENT SHOPPING CART STORE:`);
    const testNum = '628999888777';
    cartStore.clearCart(testNum);
    cartStore.addItem(testNum, { sku: '6', nama: 'Sepatu Casual SKU-6', harga: 250000, qty: 2, size: '42' });
    const cartItems = cartStore.getCart(testNum);
    assert(cartItems.length === 1 && cartItems[0].qty === 2, "Cart item addition & persistence");
    assert(cartStore.getCartTotal(testNum) === 500000, "Cart total calculation (Rp 500.000)");
    const receipt = cartStore.formatCartReceipt(testNum, "Pak Budi", "Jakarta");
    assert(receipt && receipt.includes("500.000") && receipt.includes("Sepatu Casual SKU-6"), "Cart digital receipt formatting");
    cartStore.clearCart(testNum);
    assert(cartStore.getCart(testNum).length === 0, "Cart clear operation");

    // TEST 2: Order Store & Midtrans Order ID Sanitization
    console.log(`\n📌 2. TESTING ORDER ID GENERATION & MIDTRANS SANITIZATION:`);
    const newOrder = orderStore.createOrder(testNum, [{ sku: '6', qty: 1 }], 250000, "Tasikmalaya");
    assert(newOrder && newOrder.orderId && !newOrder.orderId.includes('#'), "Order ID generated without # internally (Midtrans compatible)");
    
    const cleanMidtransId = newOrder.orderId.replace(/[^a-zA-Z0-9\-_~.]/g, '');
    assert(cleanMidtransId === newOrder.orderId, "Midtrans order_id sanitization check (0 illegal characters)");

    const trackResult = await orderStore.trackOrder(newOrder.orderId);
    assert(trackResult && trackResult.includes(newOrder.orderId), "Order tracking lookup by raw Order ID");
    
    const hashTrackResult = await orderStore.trackOrder(`#${newOrder.orderId}`);
    assert(hashTrackResult && hashTrackResult.includes(newOrder.orderId), "Order tracking lookup by # Order ID");

    // TEST 3: Smart LUNAS Context Detection in opsAgent (Citra)
    console.log(`\n📌 3. TESTING OPS AGENT (CITRA) SMART LUNAS CHECK:`);
    // Mark test order as LUNAS
    orderStore.updateOrderStatus(newOrder.orderId, 'LUNAS');
    
    const opsLunasContext = {
        history: [],
        katalog: "Sepatu 6: Rp 250.000",
        callLLM: async () => "{}",
        callGasDatabase: async () => {},
        learningSystem: null,
        senderNumber: testNum,
        sender: testNum + "@s.whatsapp.net",
        messageText: "Saya sudah bayar"
    };

    const citraLunasReply = await opsAgent.handle(opsLunasContext);
    assert(citraLunasReply.includes("LUNAS") && citraLunasReply.includes("dikirim hari ini"), "Citra recognizes LUNAS order automatically without asking for receipt");

    // TEST 4: Order Summary Report Check
    console.log(`\n📌 4. TESTING ORDER SUMMARY REPORT GENERATOR:`);
    const opsSummaryContext = {
        history: [],
        katalog: "Sepatu 6: Rp 250.000",
        callLLM: async () => "{}",
        callGasDatabase: async () => {},
        learningSystem: null,
        senderNumber: testNum,
        sender: testNum + "@s.whatsapp.net",
        messageText: "Cek total pesanan saya"
    };

    const citraSummaryReply = await opsAgent.handle(opsSummaryContext);
    assert(citraSummaryReply.includes("REKAP SELURUH PESANAN ANDA") && citraSummaryReply.includes("Order Lunas"), "Citra returns complete multi-order summary and totals");

    // SUMMARY REPORT
    console.log(`\n=================================================`);
    console.log(`🏁 TEST SUITE RESULT: ${passedTests}/${totalTests} TESTS PASSED (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`=================================================\n`);
}

runSuite();
