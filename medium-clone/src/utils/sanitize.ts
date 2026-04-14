/**
 * Sanitize string input by trimming whitespace and removing dangerous characters
 */
export function sanitizeString(input: string): string {
	return input.trim().replace(/[<>]/g, '');
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

/**
 * Sanitize username input
 */
export function sanitizeUsername(username: string): string {
	return username.trim().replace(/[<>'"]/g, '');
}
