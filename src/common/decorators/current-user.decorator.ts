import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { IJwtPayload } from '../interfaces/jwt-payload.interface';

/* CURRENT USER ID — JwtAuthGuard: number · OptionalJwtAuthGuard: number | null */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number | null => {
    const request = ctx.switchToHttp().getRequest<{ user?: IJwtPayload }>();
    return request.user?.sub ?? null;
  },
);
