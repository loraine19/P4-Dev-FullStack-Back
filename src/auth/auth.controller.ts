import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { IUserPublic } from './interfaces/user-public.interface';
import type { IAuthResponse } from './interfaces/auth-response.interface';
import { ApiResponse, type IApiResponse } from '../common/helpers/api-response';
import { SUCCESS_MESSAGES } from '../common/constants/success-messages';
import { COOKIE_NAME, COOKIE_MAX_AGE } from '../common/constants/security';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /* SET COOKIE */
  private setCookie(res: Response, token: string): void {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: COOKIE_MAX_AGE,
    });
  }

  /* CLEAR COOKIE */
  private clearCookie(res: Response): void {
    res.clearCookie(COOKIE_NAME);
  }

  /* ME */
  @Get('me')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() userId: number): Promise<IApiResponse<IUserPublic>> {
    const data = await this.authService.me(userId);
    return ApiResponse.success(SUCCESS_MESSAGES.AUTH.ME, data);
  }

  /* REGISTER */
  @Post('register')
  @HttpCode(201)
  async register(@Body() dto: RegisterDto): Promise<IApiResponse<null>> {
    await this.authService.register(dto);
    return ApiResponse.success(SUCCESS_MESSAGES.AUTH.REGISTER);
  }

  /* LOGIN */
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IApiResponse<IAuthResponse>> {
    const { user, token } = await this.authService.login(dto);
    if (dto.isMobile) return ApiResponse.success(SUCCESS_MESSAGES.AUTH.LOGIN, { user, access_token: token });
    this.setCookie(res, token);
    return ApiResponse.success(SUCCESS_MESSAGES.AUTH.LOGIN, { user });
  }

  /* LOGOUT */
  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() userId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IApiResponse<null>> {
    await this.authService.logout(userId);
    this.clearCookie(res);
    return ApiResponse.success(SUCCESS_MESSAGES.AUTH.LOGOUT);
  }
}