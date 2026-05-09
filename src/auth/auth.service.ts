import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse, UserPublic } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Helpers privés ───────────────────────────────────────────────────────

  private async generateToken(sub: number): Promise<string> {
    return this.jwtService.signAsync(
      { sub },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any,
      },
    );
  }

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

  private clearAuthCookie(res: Response): void {
    const cookieName = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
    res.clearCookie(cookieName);
  }

  private toUserPublic(user: {
    id: number;
    email: string;
    name: string;
  }): UserPublic {
    return { id: user.id, email: user.email, name: user.name };
  }

  // ─── Endpoints ────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name },
    });

    return { message: 'Compte créé avec succès' };
  }

  async login(
    dto: LoginDto,
    res: Response,
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Identifiants incorrects');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants incorrects');

    const token = await this.generateToken(user.id);
    const userPublic = this.toUserPublic(user);

    if (dto.isMobile) {
      return { user: userPublic, access_token: token };
    }

    this.setAuthCookie(res, token);
    return { user: userPublic };
  }

  async logout(
    userId: number,
    res: Response,
  ): Promise<{ message: string }> {
    // userId est issu du guard — on s'assure que l'utilisateur existe
    await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    this.clearAuthCookie(res);
    return { message: 'Déconnexion réussie' };
  }
}
