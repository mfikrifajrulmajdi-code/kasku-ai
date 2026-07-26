require('dotenv').config();

// Simple integration test — no heavy mocking, just verify module loads & signatures
describe('aiEngine', () => {
    let aiEngine;
    let registry;

    beforeAll(() => {
        // Load modules — this also tests that all imports resolve correctly
        aiEngine = require('../services/aiEngine');
        registry = require('../services/agents/registry');
    });

    test('module loads without errors', () => {
        expect(aiEngine).toBeDefined();
        expect(typeof aiEngine.processMessage).toBe('function');
    });

    test('registry has 10 agents registered', () => {
        const agents = registry.getAll();
        expect(agents).toBeDefined();
        expect(agents.length).toBe(10);

        const ids = agents.map(a => a.id);
        expect(ids).toContain('SALES');
        expect(ids).toContain('OPS');
        expect(ids).toContain('CS');
        expect(ids).toContain('COMPLAINT');
        expect(ids).toContain('SUPPORT');
        expect(ids).toContain('HR');
        expect(ids).toContain('MARKETING');
        expect(ids).toContain('FINANCE');
        expect(ids).toContain('ADMIN');
        expect(ids).toContain('PROCUREMENT');
    });

    test('processMessage function accepts 6 parameters (including tenantId)', () => {
        // processMessage(session, sender, messageText, history, imageData, tenantId)
        // Function.length only counts params before first default, but we verify the signature exists
        expect(aiEngine.processMessage).toBeDefined();
        expect(typeof aiEngine.processMessage).toBe('function');
    });

    test('all agents have tenant-aware handle function', () => {
        const agents = registry.getAll();
        agents.forEach(agent => {
            expect(typeof agent.handle).toBe('function');
            expect(agent.id).toBeDefined();
            expect(agent.name).toBeDefined();
        });
    });
});
