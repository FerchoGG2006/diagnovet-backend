/**
 * ============================================
 * Tests for Validators Utility
 * ============================================
 */

const {
    validateUploadedFile,
    isValidUUID,
    sanitizeString,
    validatePaginationParams,
} = require('../utils/validators');

describe('Validators Utility', () => {

    describe('validateUploadedFile', () => {
        it('should return valid for correct PDF file', () => {
            const file = {
                mimetype: 'application/pdf',
                size: 1024 * 1024, // 1MB
                buffer: Buffer.from('%PDF-1.4 test content'),
            };

            const result = validateUploadedFile(file);
            expect(result.valid).toBe(true);
            expect(result.error).toBeNull();
        });

        it('should return invalid when file is missing', () => {
            const result = validateUploadedFile(null);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should return invalid for non-PDF mimetype', () => {
            const file = {
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: Buffer.from('%PDF-1.4'),
            };

            const result = validateUploadedFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('PDF');
        });

        it('should return invalid for file exceeding max size', () => {
            const file = {
                mimetype: 'application/pdf',
                size: 25 * 1024 * 1024, // 25MB (exceeds 10MB max)
                buffer: Buffer.from('%PDF-1.4'),
            };

            const result = validateUploadedFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('tamaño');
        });

        it('should return invalid for empty buffer', () => {
            const file = {
                mimetype: 'application/pdf',
                size: 100,
                buffer: Buffer.from(''),
            };

            const result = validateUploadedFile(file);
            expect(result.valid).toBe(false);
        });

        it('should return invalid for non-PDF content', () => {
            const file = {
                mimetype: 'application/pdf',
                size: 100,
                buffer: Buffer.from('Not a PDF file content'),
            };

            const result = validateUploadedFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('PDF válido');
        });
    });

    describe('isValidUUID', () => {
        it('should return true for valid UUID v4', () => {
            const validUUID = '7fa910c0-b136-4361-bade-cb451405adae';
            expect(isValidUUID(validUUID)).toBe(true);
        });

        it('should return false for invalid UUID', () => {
            expect(isValidUUID('not-a-uuid')).toBe(false);
            expect(isValidUUID('12345')).toBe(false);
            expect(isValidUUID('')).toBe(false);
            expect(isValidUUID(null)).toBe(false);
        });

        it('should return false for UUID-like but invalid strings', () => {
            // Wrong format (no dashes)
            expect(isValidUUID('7fa910c0b1364361badecb451405adae')).toBe(false);
            // Too short
            expect(isValidUUID('7fa910c0-b136-4361-bade')).toBe(false);
        });

        it('should return true for uppercase UUID', () => {
            const upperUUID = '7FA910C0-B136-4361-BADE-CB451405ADAE';
            expect(isValidUUID(upperUUID)).toBe(true);
        });
    });

    describe('sanitizeString', () => {
        it('should trim whitespace', () => {
            expect(sanitizeString('  hello  ')).toBe('hello');
        });

        it('should handle null and undefined', () => {
            expect(sanitizeString(null)).toBe('');
            expect(sanitizeString(undefined)).toBe('');
        });

        it('should remove HTML characters', () => {
            expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
        });

        it('should limit length to 1000 characters', () => {
            const longString = 'a'.repeat(2000);
            const result = sanitizeString(longString);
            expect(result.length).toBe(1000);
        });
    });

    describe('validatePaginationParams', () => {
        it('should return defaults for empty input', () => {
            const result = validatePaginationParams({});
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20); // Default is 20 in the implementation
        });

        it('should parse valid page and limit', () => {
            const result = validatePaginationParams({ page: '5', limit: '50' });
            expect(result.page).toBe(5);
            expect(result.limit).toBe(50);
        });

        it('should enforce minimum values', () => {
            const result = validatePaginationParams({ page: '0', limit: '-5' });
            expect(result.page).toBe(1);
            expect(result.limit).toBe(1);
        });

        it('should enforce maximum limit of 100', () => {
            const result = validatePaginationParams({ limit: '500' });
            expect(result.limit).toBe(100);
        });

        it('should handle non-numeric values', () => {
            const result = validatePaginationParams({ page: 'abc', limit: 'xyz' });
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20); // Falls back to default
        });
    });
});
