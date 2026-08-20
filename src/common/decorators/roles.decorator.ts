// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type Role = 'DRIVER' | 'RECRUITER' | 'ADMIN';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);