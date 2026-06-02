import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { hashPassword, comparePassword } from '../common/helpers/hash';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../common/constants/security';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { IUserPublic } from './interfaces/user-public.interface';
import type { StringValue } from 'ms';


@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {}

  /* GENERATE TOKEN */
  private generateToken(sub: number): Promise<string> {
    return this.jwtService.signAsync({ sub }, { secret: JWT_SECRET, expiresIn: JWT_EXPIRES_IN as StringValue });
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
    const passwordHash = await hashPassword(password);
    await this.prisma.user.create({ data: { email, passwordHash, name } });
  }

  /* LOGIN */
  // returns token so the controller can decide where to place it (cookie vs body)
  async login(dto: LoginDto): Promise<{ user: IUserPublic; token: string }> {
    const { email, password } = dto;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    const token = await this.generateToken(user.id);
    return { user: this.toUserPublic(user), token };
  }

  /* ME */
  async me(userId: number): Promise<IUserPublic> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toUserPublic(user);
  }

  /* LOGOUT */
  async logout(userId: number): Promise<void> {
    
    await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    
  }
}
