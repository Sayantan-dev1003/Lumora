describe('Environment Setup', () => {
    it('should have a test database url', () => {
        expect(process.env.DATABASE_URL).toContain('schema=test');
    });
});
