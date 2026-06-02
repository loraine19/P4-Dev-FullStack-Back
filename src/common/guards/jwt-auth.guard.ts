import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { IJwtPayload } from '../interfaces/jwt-payload.interface';
import type { IRequestWithUser } from '../interfaces/request-with-user.interface';
import { JWT_SECRET, COOKIE_NAME } from '../constants/security';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(protected readonly jwtService: JwtService) {}

  /* CAN ACTIVATE */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IRequestWithUser>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();
    try {
      const payload = await this.jwtService.verifyAsync<IJwtPayload>(token, { secret: JWT_SECRET });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  /* HELPER METHODS */
  /* EXTRACT TOKEN */
  protected extractToken(request: IRequestWithUser): string | null {
    
    const fromCookie = request.cookies?.[COOKIE_NAME] as string | undefined;
    if (fromCookie) return fromCookie;
    const auth = request.headers.authorization;
    if (!auth) return null;
    const [type, token] = auth.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
