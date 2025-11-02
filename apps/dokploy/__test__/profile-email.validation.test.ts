import { describe, it, expect } from 'vitest';
import { profileSchema } from '@/components/dashboard/settings/profile/profile-form';

describe('Profile email validation', () => {
	const base = { name: undefined, password: null, currentPassword: null, image: undefined, allowImpersonation: false };

	it('rejects empty email with a clear message', () => {
		const result = profileSchema.safeParse({ ...base, email: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.errors.some(e => e.message === 'Email is required')).toBe(true);
		}
	});

	it('rejects malformed emails with a clear message', () => {
		const invalids = ['notanemail', 'test@', '@example.com'];
		for (const v of invalids) {
			const result = profileSchema.safeParse({ ...base, email: v });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.errors.some(e => e.message === 'Please enter a valid email address')).toBe(true);
			}
		}
	});

	it('accepts a properly formatted email', () => {
		const result = profileSchema.safeParse({ ...base, email: 'test@example.com' });
		expect(result.success).toBe(true);
	});
});
