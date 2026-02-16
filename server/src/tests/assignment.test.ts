import request from 'supertest';
import app from '../app';
import { clearDatabase } from './setup';
import prisma from '../config/db';

describe('Task Assignment & Visibility', () => {
    jest.setTimeout(30000);
    let ownerCookie: string[];
    let assigneeCookie: string[];
    let assigneeId: string;
    let boardId: string;
    let listId: string;

    beforeEach(async () => {
        await clearDatabase();

        // 1. Setup Owner
        const ownerRes = await request(app).post('/api/auth/signup').send({
            name: 'Owner User',
            email: 'owner@example.com',
            password: 'password123'
        });
        ownerCookie = ownerRes.headers['set-cookie'] as unknown as string[];

        // 2. Setup Assignee (User B)
        const assigneeRes = await request(app).post('/api/auth/signup').send({
            name: 'Assignee User',
            email: 'assignee@example.com',
            password: 'password123'
        });
        assigneeCookie = assigneeRes.headers['set-cookie'] as unknown as string[];
        assigneeId = assigneeRes.body.user.id; // Corrected path

        // 3. Create Board (as Owner)
        const boardRes = await request(app)
            .post('/api/boards')
            .set('Cookie', ownerCookie)
            .send({ title: 'Project Board' });
        boardId = boardRes.body.data.id;

        // 4. Create List
        const listRes = await request(app)
            .post('/api/lists')
            .set('Cookie', ownerCookie)
            .send({ title: 'To Do', boardId });
        listId = listRes.body.data.id;
    });

    it('should auto-enroll assigned user as board member', async () => {
        // Create Task and Assign to User B
        const taskRes = await request(app)
            .post('/api/tasks')
            .set('Cookie', ownerCookie)
            .send({
                title: 'Assigned Task',
                listId: listId,
                assignedUserId: assigneeId
            });

        expect(taskRes.status).toBe(201);
        const taskId = taskRes.body.data.id;

        // Check Board Membership
        const isMember = await prisma.boardMember.findUnique({
            where: {
                boardId_userId: {
                    boardId,
                    userId: assigneeId
                }
            }
        });

        expect(isMember).toBeTruthy();
        expect(isMember?.role).toBe('member');
    });

    it('should show board in dashboard for assigned user', async () => {
        // 1. Assign Task
        await request(app)
            .post('/api/tasks')
            .set('Cookie', ownerCookie)
            .send({
                title: 'Assigned Task',
                listId: listId,
                assignedUserId: assigneeId
            });

        // 2. Assignee fetches boards
        const boardRes = await request(app)
            .get('/api/boards')
            .set('Cookie', assigneeCookie);

        expect(boardRes.status).toBe(200);
        const boards = boardRes.body.data;
        expect(boards).toHaveLength(1);
        expect(boards[0].id).toBe(boardId);
    });

    it('should auto-enroll when updating assignment', async () => {
        // 1. Create Task (Unassigned)
        const taskRes = await request(app)
            .post('/api/tasks')
            .set('Cookie', ownerCookie)
            .send({
                title: 'Unassigned Task',
                listId: listId
            });
        const taskId = taskRes.body.data.id;

        // 2. Update Task to Assign User B
        const updateRes = await request(app)
            .patch(`/api/tasks/${taskId}`)
            .set('Cookie', ownerCookie)
            .send({
                assignedUserId: assigneeId
            });

        expect(updateRes.status).toBe(200);

        // 3. Check Board Membership
        const isMember = await prisma.boardMember.findUnique({
            where: {
                boardId_userId: {
                    boardId,
                    userId: assigneeId
                }
            }
        });
        expect(isMember).toBeTruthy();
    });
});
