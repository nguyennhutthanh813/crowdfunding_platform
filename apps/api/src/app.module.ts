import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { MailModule } from './modules/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { PledgesModule } from './modules/pledges/pledges.module';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { SocialModule } from './modules/social/social.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // Global config — loads .env from monorepo root
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Database & Mail
    DatabaseModule,
    MailModule,

    // Feature modules
    AuthModule,
    UsersModule,
    CampaignsModule,
    PledgesModule,
    FulfillmentModule,
    SocialModule,
    CommunicationModule,
    AnalyticsModule,
    AdminModule,
  ],
})
export class AppModule {}
