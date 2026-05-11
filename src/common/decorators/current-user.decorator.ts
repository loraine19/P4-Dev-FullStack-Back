import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { IJwtPayload } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IJwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: IJwtPayload }>();
    return request.user;
  },
);
