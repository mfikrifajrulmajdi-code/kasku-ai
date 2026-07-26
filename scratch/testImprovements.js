const languageService = require('../services/languageService');
const analyticsService = require('../services/analyticsService');

async function test() {
    console.log("🧪 1. Testing Automatic Multi-Language Detection:");
    console.log("Input: 'Hi, what is the price of leather shoes in size 42?'");
    console.log(languageService.detectLanguage("Hi, what is the price of leather shoes in size 42?"));

    console.log("\nInput: 'Halo kak, sepatu 6 ukuran 42 harganya berapa ya?'");
    console.log(languageService.detectLanguage("Halo kak, sepatu 6 ukuran 42 harganya berapa ya?"));

    console.log("\n-------------------------------------------------\n");

    console.log("🧪 2. Testing E-Commerce Sales Analytics & Revenue Report:");
    console.log(analyticsService.getStorePerformanceMetrics());
}

test();
