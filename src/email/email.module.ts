import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // ✅ Get all email config values with proper type handling
        const config = {
          host: configService.get<string>('MAIL_HOST'),
          port: configService.get<string>('MAIL_PORT') || '465',
          secure: configService.get('MAIL_SECURE') === 'true',
          user: configService.get<string>('MAIL_USER'),
          password: configService.get<string>('MAIL_PASSWORD'),
          from: configService.get<string>('MAIL_FROM'),
        };

       
        // ✅ Validate required fields - FIX: Explicitly type the array
        const missingFields: string[] = []; // ✅ Add type annotation
        if (!config.host) missingFields.push('MAIL_HOST');
        if (!config.port) missingFields.push('MAIL_PORT');
        if (!config.user) missingFields.push('MAIL_USER');
        if (!config.password) missingFields.push('MAIL_PASSWORD');
        if (!config.from) missingFields.push('MAIL_FROM');

        if (missingFields.length > 0) {
         
          throw new Error(`Email configuration incomplete. Missing: ${missingFields.join(', ')}`);
        }

        console.log('✅ Email configuration loaded successfully\n');

        return {
          transport: {
            host: config.host,
            port: parseInt(config.port, 10),
            secure: config.secure,
            auth: {
              user: config.user,
              pass: config.password,
            },
            // ✅ Add these for better debugging
            tls: {
              rejectUnauthorized: false, // For development only
            },
            debug: true, // Enable debug output
            logger: true, // Enable logger
          },
          defaults: {
            from: `"Krevv Job Platform" <${config.from}>`,
          },
        };
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}