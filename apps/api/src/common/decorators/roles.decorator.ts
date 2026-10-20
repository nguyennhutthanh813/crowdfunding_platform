import { SetMetadata } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to set required roles for an endpoint.
 * Usage: @Roles(GlobalRole.ADMIN)
 * Usage: @Roles(GlobalRole.CREATOR, GlobalRole.ADMIN)
 */
export const Roles = (...roles: GlobalRole[]) => SetMetadata(ROLES_KEY, roles);
