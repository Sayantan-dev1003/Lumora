import bcrypt from 'bcrypt';
import prisma from '../../config/db';
import { SignupInput, LoginInput } from './auth.types';
import { generateAccessToken } from '../../utils/jwt';

const SALT_ROUNDS = 10;

export const signup = async (input: SignupInput) => {
    const { name, email, password } = input;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('Email already exists');
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
        throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
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
        throw new Error('User not found');
    }

    return user;
};
