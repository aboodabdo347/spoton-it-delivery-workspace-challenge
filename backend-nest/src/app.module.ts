import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { ScoreController } from './score/score.controller';
import { ScoreService } from './score/score.service';
import { ItWorkspaceController } from './it-workspace/it-workspace.controller';
import { ItWorkspaceService } from './it-workspace/it-workspace.service';
import { WorkItem } from './it-workspace/work-item.entity';
import { QaCheck } from './it-workspace/qa-check.entity';
import { ReleaseController } from './releases/release.controller';
import { ReleaseService } from './releases/release.service';
import { Release } from './releases/release.entity';
import { ScoreEvent } from './score/score-event.entity';
import { JwtAuthGuard } from './common/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '8h' },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([WorkItem, QaCheck, Release, ScoreEvent]),
  ],
  controllers: [HealthController, AuthController, ScoreController, ItWorkspaceController, ReleaseController],
  providers: [AuthService, ScoreService, ItWorkspaceService, ReleaseService, JwtAuthGuard],
})
export class AppModule {}
