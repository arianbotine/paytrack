/**
 * Shared constants for the application
 */

// Money constants
export const MONEY_COMPARISON_THRESHOLD = 0.01; // Tolerance for floating point comparisons

// Performance constants
export const SLOW_QUERY_THRESHOLD_MS = 1000; // Queries taking longer than this are logged as slow

// Date constants
export const UPCOMING_DAYS_THRESHOLD = 7; // Days ahead to consider as "upcoming"

// Pagination constants
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Prisma error codes
export const PRISMA_ERROR_CODES = {
  UNIQUE_CONSTRAINT: 'P2002',
  NOT_FOUND: 'P2025',
  FOREIGN_KEY_CONSTRAINT: 'P2003',
  REQUIRED_FIELD: 'P2011',
} as const;
