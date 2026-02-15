import prisma from '../config/db';

beforeAll(async () => {
    try {
        await prisma.$connect();
        console.log('Connected to test DB');
    } catch (error) {
        console.warn('Failed to connect to DB in setup.', error);
    }
});

afterAll(async () => {
    await prisma.$disconnect();
    console.log('Disconnected from test DB');
});

export const clearDatabase = async () => {
    if (process.env.NODE_ENV !== 'test') {
        return;
    }

    try {
        // Sequential deletion to respect foreign keys
        // These calls must be awaited to ensure DB is clear before tests run
        await prisma.activity.deleteMany();
        await prisma.task.deleteMany();
        await prisma.list.deleteMany();
        await prisma.boardMember.deleteMany();
        await prisma.board.deleteMany();
        await prisma.user.deleteMany();
    } catch (error) {
        console.error('CRITICAL: Failed to clear database in tests:', error);
    }
};
