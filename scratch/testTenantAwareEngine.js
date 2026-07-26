const { processMessage } = require('../services/aiEngine');
const tenantManager = require('../services/tenantManager');

async function runTest() {
    console.log("Creating test tenant 'testclinic'...");
    
    // Create test tenant
    tenantManager.createTenant('testclinic', {
        companyName: 'Test Clinic Beauty',
        agents: {
            SALES: { id: 'SALES', name: 'dr. Sarah', title: 'Konsultan Beauty' },
            OPS: { id: 'OPS', name: 'Mbak Maya', title: 'Kasir Clinic' }
        }
    });

    console.log("Testing aiEngine processMessage for SALES intent...");
    // Mock message that routes to SALES (e.g. asking about products)
    // The router metadata is usually set within processMessage, but since processMessage routes to the proper intent, let's provide a message that triggers SALES.
    // "halo mau nanya produk" usually goes to SALES.
    const message = "halo saya mau pesan produk terbaru";
    
    // Call processMessage
    // signature: async function processMessage(session, sender, messageText, history, imageData = null, tenantId = 'default')
    const response = await processMessage(
        "session1", 
        "628123456789", 
        message, 
        [], 
        null, 
        "testclinic"
    );

    console.log("-----------------------------------------");
    console.log("AI Response:");
    console.log(response);
    console.log("-----------------------------------------");

    if (response && (response.includes("dr. Sarah") || response.includes("Test Clinic"))) {
        console.log("✅ TEST PASSED: Agent name or store name was dynamically injected!");
    } else if (response && (response.includes("Bima") || response.includes("KasKu"))) {
        console.log("❌ TEST FAILED: Default agent name 'Bima' or 'KasKu' was used instead of tenant config.");
    } else {
        console.log("⚠️ TEST INCONCLUSIVE: The response did not explicitly mention the agent name or store name.");
    }
}

runTest().catch(console.error);
