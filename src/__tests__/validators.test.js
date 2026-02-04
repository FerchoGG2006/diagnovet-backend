/**
 * ============================================
 * Tests for Validators Utility
 * ============================================
 */

const {
    validatePdfFile,
    validateUUID,
    sanitizeString,
    validatePaginationParams,
} = require('../utils/validators');

describe('Validators Utility', () => {

    describe('validatePdfFile', () => {
        it('should return valid for correct PDF file', () => {
            const file = {
                mimetype: 'application/pdf',
                size: 1024 * 1024, // 1MB
                buffer: Buffer.from('%PDF-1.4'),
            };

            const result = validatePdfFile(file);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should return invalid when file is missing', () => {
            const result = validatePdfFile(null);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('archivo');
        });

        it('should return invalid for non-PDF mimetype', () => {
            const file = {
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: Buffer.from('fake'),
            };

            const result = validatePdfFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('PDF');
        });

        it('should return invalid for file exceeding max size', () => {
            const file = {
                mimetype: 'application/pdf',
                size: 25 * 1024 * 1024, // 25MB
                buffer: Buffer.from('%PDF-1.4'),
            };

            const result = validatePdfFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('tamaño');
        });

        it('should return invalid for empty file', () => {
            const file = {
                mimetype: 'application/pdf',
                size: 0,
                buffer: Buffer.from(''),
            };

            const result = validatePdfFile(file);
            expect(result.valid).toBe(false);
        });
    });

    describe('validateUUID', () => {
        it('should return true for valid UUID v4', () => {
            const validUUID = '7fa910c0-b136-4361-bade-cb451405adae';
            expect(validateUUID(validUUID)).toBe(true);
        });

        it('should return false for invalid UUID', () => {
            expect(validateUUID('not-a-uuid')).toBe(false);
            expect(validateUUID('12345')).toBe(false);
            expect(validateUUID('')).toBe(false);
            expect(validateUUID(null)).toBe(false);
        });

        it('should return false for UUID-like but invalid strings', () => {
            // Wrong format
            expect(validateUUID('7fa910c0b1364361badecb451405adae')).toBe(false);
            // Too short
            expect(validateUUID('7fa910c0-b136-4361-bade')).toBe(false);
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

        it('should truncate long strings', () => {
            const longString = 'a'.repeat(2000);
            const result = sanitizeString(longString, 100);
            expect(result.length).toBe(100);
        });

        it('should remove control characters', () => {
            const withControl = 'hello\x00world';
            const result = sanitizeString(withControl);
            expect(result).not.toContain('\x00');
        });
    });

    describe('validatePaginationParams', () => {
        it('should return defaults for empty input', () => {
            const result = validatePaginationParams({});
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });

        it('should parse valid page and limit', () => {
            const result = validatePaginationParams({ page: '5', limit: '20' });
            expect(result.page).toBe(5);
            expect(result.limit).toBe(20);
        });

        it('should enforce minimum values', () => {
            const result = validatePaginationParams({ page: '0', limit: '-5' });
            expect(result.page).toBe(1);
            expect(result.limit).toBe(1);
        });

        it('should enforce maximum limit', () => {
            const result = validatePaginationParams({ limit: '500' });
            expect(result.limit).toBe(100);
        });

        it('should handle non-numeric values', () => {
            const result = validatePaginationParams({ page: 'abc', limit: 'xyz' });
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });
    });
});
