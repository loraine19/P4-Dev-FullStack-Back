import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IJwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(protected readonly jwtService: JwtService) {}

  /* CAN ACTIVATE */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();
    try {
      const payload = await this.jwtService.verifyAsync<IJwtPayload>(
        token,
        {secret: process.env.JWT_SECRET });
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  /* HELPER METHODS */
  /* EXTRACT TOKEN */
  protected extractToken(request: Request): string | null {
    const cookieName = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
    const fromCookie = request.cookies?.[cookieName] as string | undefined;
    if (fromCookie) return fromCookie;
    const auth = request.headers.authorization;
    if (!auth) return null;
    const [type, token] = auth.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
