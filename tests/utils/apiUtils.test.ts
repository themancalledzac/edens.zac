import { handleApiError } from '@/app/utils/apiUtils';

describe('handleApiError', () => {
  describe('Error instances', () => {
    it('returns .message for a plain Error', () => {
      const error = new Error('Something went wrong');
      expect(handleApiError(error, 'Default')).toBe('Something went wrong');
    });

    it('returns .message for a TypeError', () => {
      const error = new TypeError('Type mismatch');
      expect(handleApiError(error, 'Default')).toBe('Type mismatch');
    });

    it('returns empty string when Error.message is empty', () => {
      const error = new Error('');
      expect(handleApiError(error, 'Default')).toBe('');
    });
  });

  describe('Objects with nested response', () => {
    it('returns response.statusText when present', () => {
      const error = { response: { statusText: 'Internal Server Error' } };
      expect(handleApiError(error, 'Default')).toBe('Internal Server Error');
    });

    it('returns response.message when statusText is absent', () => {
      const error = { response: { message: 'Nested error message' } };
      expect(handleApiError(error, 'Default')).toBe('Nested error message');
    });

    it('prefers response.statusText over response.message', () => {
      const error = {
        response: {
          statusText: 'Forbidden',
          message: 'Should not use this',
        },
      };
      expect(handleApiError(error, 'Default')).toBe('Forbidden');
    });

    it('falls through to direct object properties when response values are non-string', () => {
      const error = {
        response: { statusText: 42, message: true },
        message: 'Direct message',
      };
      expect(handleApiError(error, 'Default')).toBe('Direct message');
    });

    it('returns defaultMessage when response is null', () => {
      const error = { response: null };
      expect(handleApiError(error, 'Default')).toBe('Default');
    });
  });

  describe('Objects with direct message property', () => {
    it('returns message from plain object', () => {
      const error = { message: 'API error message' };
      expect(handleApiError(error, 'Default')).toBe('API error message');
    });
  });

  describe('Objects with statusText property', () => {
    it('returns statusText from plain object', () => {
      const error = { statusText: 'Not Found' };
      expect(handleApiError(error, 'Default')).toBe('Not Found');
    });
  });

  describe('String errors', () => {
    it('returns the string directly', () => {
      expect(handleApiError('String error message', 'Default')).toBe('String error message');
    });

    it('returns empty string when error is an empty string', () => {
      expect(handleApiError('', 'Default')).toBe('');
    });
  });

  describe('Fallback to defaultMessage', () => {
    it('returns defaultMessage for null', () => {
      expect(handleApiError(null, 'Default')).toBe('Default');
    });

    it('returns defaultMessage for undefined', () => {
      expect(handleApiError(undefined, 'Default')).toBe('Default');
    });

    it('returns defaultMessage for a number', () => {
      expect(handleApiError(42, 'Default')).toBe('Default');
    });

    it('returns defaultMessage for a boolean', () => {
      expect(handleApiError(true, 'Default')).toBe('Default');
    });

    it('returns defaultMessage for an empty object', () => {
      expect(handleApiError({}, 'Default')).toBe('Default');
    });

    it('returns defaultMessage when object has an unrecognised property', () => {
      expect(handleApiError({ someOtherProperty: 'value' }, 'Default')).toBe('Default');
    });

    it('returns defaultMessage when message property is not a string', () => {
      const error = { message: 123 };
      expect(handleApiError(error, 'Default')).toBe('Default');
    });
  });
});
