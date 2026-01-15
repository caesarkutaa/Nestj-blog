import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import these
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanySchema } from './schema/company.schema';
import { JobSchema } from '../job/schema/job.schema';
import { ApplicationSchema } from '../application/schema/application.schema'; 
import { CompanyAuthGuard } from '../auth/company.guard';
import { EmailModule } from '../email/email.module'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Company', schema: CompanySchema },
      { name: 'Job', schema: JobSchema },
      { name: 'Application', schema: ApplicationSchema }, 
    ]),
    JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => ({
    // Use "as string" to ensure it's not undefined
    secret: configService.get<string>('JWT_SECRET') as string,
    signOptions: { 
      // Cast the string value to 'any' or 'StringValue' to satisfy the interface
      expiresIn: configService.get<string>('JWT_EXPIRES_IN') as any || '1d' 
    },
  }),
}),
 EmailModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService, CompanyAuthGuard],
  exports: [CompanyService],
})
export class CompanyModule {}