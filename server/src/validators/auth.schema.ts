import { z } from "zod";

export const signupSchema = z.object({
    body: z.object({
        email: z.string().email({ message: "Invalid email address" }),
        password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
        name: z.string().min(2, { message: "Name must be at least 2 characters long" }).optional(),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email({ message: "Invalid email address" }),
        password: z.string().min(1, { message: "Password is required" }),
    }),
});
