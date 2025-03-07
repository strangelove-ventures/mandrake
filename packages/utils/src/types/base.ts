/**
 * Base type definitions for Mandrake entities
 */

/**
 * Base entity interface with common properties
 */
export interface BaseEntity {
  /** Unique identifier */
  id: string;
  
  /** Creation timestamp (ISO string or Date) */
  createdAt: string | Date;
  
  /** Last update timestamp (ISO string or Date) */
  updatedAt: string | Date;
}

/**
 * Common metadata interface
 */
export interface Metadata {
  [key: string]: any;
}
