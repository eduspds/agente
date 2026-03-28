import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { DashboardGateway } from './dashboard.gateway'
import { AppConfig } from '../../config/configuration'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>) => ({
        secret: config.get('jwt.secret', { infer: true }),
      }),
    }),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardGateway],
  exports: [DashboardGateway, DashboardService],
})
export class DashboardModule {}
