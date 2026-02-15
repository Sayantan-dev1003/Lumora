export const logger = {
    info: (message: string, meta?: any) => {
        console.log(JSON.stringify({
            level: 'info',
            timestamp: new Date().toISOString(),
            message,
            ...meta
        }));
    },
    error: (message: string, meta?: any) => {
        console.error(JSON.stringify({
            level: 'error',
            timestamp: new Date().toISOString(),
            message,
            ...meta
        }));
    },
    debug: (message: string, meta?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(JSON.stringify({
                level: 'debug',
                timestamp: new Date().toISOString(),
                message,
                ...meta
            }));
        }
    }
};
