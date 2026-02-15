import request from 'supertest';
import app from '../app';
import { v4 as uuidv4 } from 'uuid';
import { clearDatabase } from './setup';

describe('Board Module', () => {
    let authCookie: string[];

    beforeEach(async () => {
        await clearDatabase();

        // Register a user for board tests
        const res = await request(app).post('/api/auth/signup').send({
            name: 'Board Testers',
            email: 'boardtester@example.com',
            password: 'password123'
        });
        authCookie = res.headers['set-cookie'] as unknown as string[];
    });

    describe('POST /api/boards', () => {
        it('should create a board successfully', async () => {
            const res = await request(app)
                .post('/api/boards')
                .set('Cookie', authCookie)
                .send({ title: 'New Board' });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.title).toBe('New Board');
        });

        it('should fail without authentication', async () => {
            const res = await request(app).post('/api/boards').send({ title: 'Anon Board' });
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/boards', () => {
        it('should return user boards', async () => {
            await request(app)
                .post('/api/boards')
                .set('Cookie', authCookie)
                .send({ title: 'My Board 1' });

            const res = await request(app)
                .get('/api/boards')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('DELETE /api/boards/:id', () => {
        it('should delete a board successfully', async () => {
            const createRes = await request(app)
                .post('/api/boards')
                .set('Cookie', authCookie)
                .send({ title: 'Board to Delete' });
            const boardId = createRes.body.data.id;

            const res = await request(app)
                .delete(`/api/boards/${boardId}`)
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
        });

        it('should return 404 for non-existent board', async () => {
            const nonExistentId = uuidv4();
            const res = await request(app)
                .delete(`/api/boards/${nonExistentId}`)
                .set('Cookie', authCookie);
            expect(res.status).toBe(404);
        });
    });
});
