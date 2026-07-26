require('dotenv').config();
const cartStore = require('./services/cartStore');
cartStore.addItem('test-sender', {name:'Test',qty:1,price:100}, 'testclinic');
console.log('Tenant cart:', cartStore.getCart('test-sender', 'testclinic'));
console.log('Global cart:', cartStore.getCart('test-sender')); // should be empty/different
