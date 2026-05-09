import { Body, Controller, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import type { AuthResponse } from './interfaces/auth-response.interface';
import { ApiResponse, type IApiResponse } from '../common/helpers/api-response';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /* REGISTER */
  @Post('register')
  @HttpCode(201)
  async register(@Body() dto: RegisterDto): Promise<IApiResponse<null>> {
    await this.authService.register(dto);
    return ApiResponse.success('Compte créé avec succès');
  }

  /* LOGIN */
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IApiResponse<AuthResponse>> {
    const data = await this.authService.login(dto, res);
    return ApiResponse.success('Connexion réussie', data);
  }

  /* LOGOUT */
  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IApiResponse<null>> {
    await this.authService.logout(user.sub, res);
    return ApiResponse.success('Déconnexion réussie');
  }
}

