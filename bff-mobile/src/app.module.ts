import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpClientModule } from './infrastructure/http-client.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PayablesModule } from './modules/payables/payables.module';
import { ReceivablesModule } from './modules/receivables/receivables.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TagsModule } from './modules/tags/tags.module';
import { SharedModule } from './modules/shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.BFF_JWT_SECRET || process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    HttpClientModule,
    SharedModule,
    AuthModule,
    DashboardModule,
    PayablesModule,
    ReceivablesModule,
    VendorsModule,
    CustomersModule,
    CategoriesModule,
    TagsModule,
  ],
})
export class AppModule {}
