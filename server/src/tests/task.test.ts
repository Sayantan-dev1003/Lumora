import request from 'supertest';
import app from '../app';
import { clearDatabase } from './setup';

describe('Task Module', () => {
    jest.setTimeout(30000);
    let authCookie: string[];
    let boardId: string;
    let listId: string;

    beforeEach(async () => {
        await clearDatabase();

        // Setup User
        const userRes = await request(app).post('/api/auth/signup').send({
            name: 'Task User',
            email: 'taskuser@example.com',
            password: 'password123'
        });
        authCookie = userRes.headers['set-cookie'] as unknown as string[];

        // Setup Board
        const boardRes = await request(app)
            .post('/api/boards')
            .set('Cookie', authCookie)
            .send({ title: 'Task Board' });
        boardId = boardRes.body.data.id;

        // Setup List
        const listRes = await request(app)
            .post('/api/lists')
            .set('Cookie', authCookie)
            .send({ title: 'To Do', boardId });
        listId = listRes.body.data.id;
    });

    describe('POST /api/tasks', () => {
        it('should create a task successfully', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Cookie', authCookie)
                .send({
                    title: 'Test Task',
                    listId: listId,
                    boardId: boardId // If required by API
                });

            expect(res.status).toBe(201);
            expect(res.body.data.title).toBe('Test Task');
            expect(res.body.data.listId).toBe(listId);
        });
    });

    describe('PUT /api/tasks/:id', () => {
        it('should update task title', async () => {
            const createRes = await request(app)
                .post('/api/tasks')
                .set('Cookie', authCookie)
                .send({ title: 'Task to Update', listId, boardId });
            const taskId = createRes.body.data.id;

            const res = await request(app)
                .patch(`/api/tasks/${taskId}`)
                .set('Cookie', authCookie)
                .send({ title: 'Updated Task Title' });

            expect(res.status).toBe(200);
            expect(res.body.data.title).toBe('Updated Task Title');
        });
    });

    describe('PATCH /api/tasks/:id (move/reorder)', () => {
        it('should move task within same list', async () => {
            const task1 = await request(app)
                .post('/api/tasks')
                .set('Cookie', authCookie)
                .send({ title: 'T1', listId, boardId });
            const task2 = await request(app)
                .post('/api/tasks')
                .set('Cookie', authCookie)
                .send({ title: 'T2', listId, boardId });

            const res = await request(app)
                .patch(`/api/tasks/${task1.body.data.id}`)
                .set('Cookie', authCookie)
                .send({
                    listId: listId,
                    position: 2
                });

            expect(res.status).toBe(200);
        });
    });

    describe('DELETE /api/tasks/:id', () => {
        it('should delete a task', async () => {
            const createRes = await request(app)
                .post('/api/tasks')
                .set('Cookie', authCookie)
                .send({ title: 'Task to Delete', listId, boardId });
            const taskId = createRes.body.data.id;

            const res = await request(app)
                .delete(`/api/tasks/${taskId}`)
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
        });
    });
});
