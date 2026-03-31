import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Restringe acesso a roles específicas — ex: @Roles('ADMIN', 'AGENT')
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
