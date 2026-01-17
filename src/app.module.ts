import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { LikesModule } from './likes/likes.module';
import { CacheService } from './shared/cache.service';
import { UserModule } from './user/user.module';
import { JobModule } from './job/job.module';
import { ApplicationModule } from './application/application.module';
import { ReviewsModule } from './reviews/reviews.module';
import { EmailModule } from './email/email.module';
import { ScheduleModule } from '@nestjs/schedule';
import { JobaggregatorService } from './jobaggregator/jobaggregator.service';
import { JobaggregatorController } from './jobaggregator/jobaggregator.controller';
import { JobaggregatorModule } from './jobaggregator/jobaggregator.module';
import { CompanyModule } from './company/company.module';

@Module({
  imports: [
    // ✅ Global configuration
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
    }),   
     ScheduleModule.forRoot(),

    // ✅ MongoDB with better error handling
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');

        if (!uri) {
          throw new Error('❌ MONGO_URI is not defined in environment variables');
        }

        console.log('🔌 Attempting to connect to MongoDB...');
        console.log(`📍 Database: ${uri.includes('@') ? uri.split('@')[1] : 'localhost'}`);

        return {
          uri,
          dbName: 'blogdb',
          retryAttempts: 5,
          retryDelay: 3000,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('✅ MongoDB connected successfully');
            });

            connection.on('error', (error) => {
              console.error('❌ MongoDB connection error:', error.message);
            });

            connection.on('disconnected', () => {
              console.log('⚠️  MongoDB disconnected');
            });

            connection.on('reconnected', () => {
              console.log('🔄 MongoDB reconnected');
            });

            return connection;
          },
        };
      },
    }),

    AdminModule,
    PostsModule,
    CommentsModule,
    LikesModule,
    UserModule,
    JobModule,
    ApplicationModule,
    ReviewsModule,
    EmailModule,
    JobaggregatorModule,
    CompanyModule,
  ],
  providers: [CacheService],
  exports: [CacheService],
  
})
export class AppModule {}