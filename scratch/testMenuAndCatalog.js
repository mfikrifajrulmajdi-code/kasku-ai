const menuService = require('../services/menuService');
const aiEngine = require('../services/aiEngine');

async function test() {
    console.log("🧪 Testing Native WhatsApp Interactive Menu...");
    const menuResult = await menuService.processMenuChoice("menu", "628999888777", "Fikri");
    console.log("\n📱 HASIL NATIVE WHATSAPP MENU CARD:\n");
    console.log(menuResult);

    console.log("\n🧪 Testing Choice '1' (Katalog):");
    const choice1 = await menuService.processMenuChoice("1", "628999888777", "Fikri");
    console.log(choice1);

    console.log("\n🧪 Testing Choice '4' (Lacak Order):");
    const choice4 = await menuService.processMenuChoice("4", "628999888777", "Fikri");
    console.log(choice4);
}

test();
