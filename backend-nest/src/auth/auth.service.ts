import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { RequestUser } from '../common/request-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const seededEmail = this.config.getOrThrow<string>('USER_EMAIL');
    const seededHash = this.config.getOrThrow<string>('USER_PASSWORD_HASH');

    if (email !== seededEmail || !(await bcrypt.compare(password, seededHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user: RequestUser = {
      id: this.config.getOrThrow<string>('USER_ID'),
      name: this.config.getOrThrow<string>('USER_NAME'),
      email: seededEmail,
      role: this.config.getOrThrow<string>('USER_ROLE') as RequestUser['role'],
    };

    return {
      accessToken: this.jwt.sign(user),
      user,
    };
  }
}
