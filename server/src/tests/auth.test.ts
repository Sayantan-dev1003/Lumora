import request from 'supertest';
import app from '../app';
import prisma from '../config/db';
import { clearDatabase } from './setup';

// Helper to create a test user
const createTestUser = async (email: string) => {
    return await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email,
        password: 'password123',
    });
};

describe('Auth Module', () => {
    beforeEach(async () => {
        await clearDatabase();
    });

    describe('POST /api/auth/signup', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app).post('/api/auth/signup').send({
                name: 'New User',
                email: 'newuser@example.com',
                password: 'password123',
            });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('email', 'newuser@example.com');
            // Check cookie is set (no token in body)
            expect(res.headers['set-cookie']).toBeDefined();
        });

        it('should reject duplicate email', async () => {
            await createTestUser('duplicate@example.com');
            const res = await request(app).post('/api/auth/signup').send({
                name: 'Duplicate User',
                email: 'duplicate@example.com',
                password: 'password123',
            });

            expect(res.status).toBe(400); // Or whatever error status your API returns
        });

        it('should validate email format', async () => {
            const res = await request(app).post('/api/auth/signup').send({
                name: 'Invalid Email',
                email: 'invalid-email',
                password: 'password123',
            });
            expect(res.status).toBe(400);
        });

        it('should validate password length', async () => {
            const res = await request(app).post('/api/auth/signup').send({
                name: 'Short Pass',
                email: 'shortpass@example.com',
                password: '123',
            });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await createTestUser('login@example.com');
        });

        it('should login successfully with valid credentials', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'login@example.com',
                password: 'password123',
            });

            expect(res.status).toBe(200);
            expect(res.headers['set-cookie']).toBeDefined();
        });

        it('should reject invalid password', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'login@example.com',
                password: 'wrongpassword',
            });
            expect(res.status).toBe(401);
        });

        it('should reject non-existent email', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'nonexistent@example.com',
                password: 'password123',
            });
            expect(res.status).toBe(401); // Or 404 depending on implementation
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return current user with valid token', async () => {
            // First signup/login to get cookie
            const loginRes = await createTestUser('me@example.com');
            const cookie = loginRes.headers['set-cookie'];

            const res = await request(app)
                .get('/api/auth/me')
                .set('Cookie', cookie);

            expect(res.status).toBe(200);
            expect(res.body.user).toHaveProperty('email', 'me@example.com');
        });

        it('should return 401 without token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
        });
    });
});
