import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { IAuthResponse, IUserPublic } from './interfaces/auth-response.interface';
import type { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {}

  /* GENERATE TOKEN */
  private async generateToken(sub: number): Promise<string> {
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as StringValue;
    return this.jwtService.signAsync(
      { sub },
      {
        secret: process.env.JWT_SECRET,
        expiresIn,
      },
    );
  }

  /* SET AUTH COOKIE */
  private setAuthCookie(res: Response, token: string): void {
    const cookieName = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
    const maxAge = parseInt(process.env.COOKIE_MAX_AGE ?? '604800000');
    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge,
    });
  }

  /* CLEAR AUTH COOKIE */
  private clearAuthCookie(res: Response): void {
    const cookieName = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
    res.clearCookie(cookieName);
  }

  /* TO USER PUBLIC */
  private toUserPublic(user: {
    id: number;
    email: string;
    name: string;
  }): IUserPublic {
    return { id: user.id, email: user.email, name: user.name };
  }

  /* REGISTER */
  async register(dto: RegisterDto): Promise<void> {
    const { email, password, name } = dto;
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException(ERROR_MESSAGES.AUTH.EMAIL_ALREADY_USED);
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.create({ data: { email, passwordHash, name } });
  }

  /* LOGIN */
  async login(dto: LoginDto, res: Response): Promise<IAuthResponse> {
    const { email, password, isMobile } = dto;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    const token = await this.generateToken(user.id);
    const userPublic = this.toUserPublic(user);
    if (isMobile) {
      this.logger.warn('Mobile login -  token returned in body', AuthService.name);
      return { user: userPublic, access_token: token };
    } else this.setAuthCookie(res, token);
    return { user: userPublic };
  }

  /* LOGOUT */
  async logout(userId: number, res: Response): Promise<void> {
    // guard already verified the token -  findUniqueOrThrow ensures user still exists
    await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    this.clearAuthCookie(res);
  }
}
