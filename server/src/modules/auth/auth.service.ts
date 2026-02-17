import bcrypt from 'bcrypt';
import prisma from '../../config/db';
import { SignupInput, LoginInput } from './auth.types';
import { generateAccessToken } from '../../utils/jwt';

const SALT_ROUNDS = 10;

export const signup = async (input: SignupInput) => {
    const { name, email, password } = input;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        const error: any = new Error('Email already exists');
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
        select: {
            id: true,
            name: true,
            email: true,
        },
    });

    const token = generateAccessToken(user.id);

    return { user, token };
};

export const login = async (input: LoginInput) => {
    const { email, password } = input;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const error: any = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        const error: any = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }

    const token = generateAccessToken(user.id);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return { user: { id: user.id, name: user.name, email: user.email }, token };
};

export const getUserById = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
        },
    });

    if (!user) {
        const error: any = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
};

export const searchUsers = async (query: string, userId: string) => {
    return await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
            ],
            NOT: {
                id: userId,
            },
        },
        select: {
            id: true,
            name: true,
            email: true,
        },
        take: 10,
    });
};

export const updateProfile = async (userId: string, data: { name?: string; email?: string }) => {
    if (data.email) {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing && existing.id !== userId) {
            throw new Error('Email already in use');
        }
    }

    return await prisma.user.update({
        where: { id: userId },
        data,
        select: {
            id: true,
            name: true,
            email: true,
        },
    });
};

export const changePassword = async (userId: string, { oldPassword, newPassword }: any) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
        const error: any = new Error('Invalid old password');
        error.statusCode = 400; // Bad Request
        throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    return true;
};
