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


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI') || '',
        dbName: 'blogdb',
      }),
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
  ],
   providers: [CacheService],
   exports: [CacheService],

})
export class AppModule {}
