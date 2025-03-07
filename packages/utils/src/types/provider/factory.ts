/**
 * Provider factory types
 */

import type { ProviderType } from '../../models/schemas';
import type { IProvider, ProviderImplConfig } from './base';

/**
 * Function signature for creating a provider
 */
export type CreateProviderFn = (
  type: ProviderType,
  config: Omit<ProviderImplConfig, 'modelInfo'>
) => IProvider;