import { Response } from 'express';

export interface PaginationData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const successResponse = (
    res: Response,
    data: any,
    message: string = 'Success',
    pagination?: PaginationData,
    statusCode: number = 200
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        pagination,
    });
};

export const errorResponse = (
    res: Response,
    message: string = 'Internal Server Error',
    statusCode: number = 500
) => {
    return res.status(statusCode).json({
        success: false,
        message,
    });
};
