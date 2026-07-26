require('dotenv').config();
const { requireAuth } = require('../middleware/adminAuth');

describe('adminAuth', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = {
            session: {},
            path: ''
        };
        mockRes = {
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    test('requireAuth redirects to /admin/login when not authenticated', () => {
        mockReq.path = '/admin/dashboard';
        requireAuth(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.redirect).toHaveBeenCalledWith('/admin/login');
    });

    test('requireAuth returns 401 for API routes when not authenticated', () => {
        mockReq.path = '/api/stats';
        requireAuth(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    test('requireAuth calls next() when session.isAdmin is true', () => {
        mockReq.session.isAdmin = true;
        mockReq.path = '/admin/dashboard';
        requireAuth(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.redirect).not.toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });
});
