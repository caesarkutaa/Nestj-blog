import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { Like, LikeSchema } from './schemas/like.schema';
import { Post, PostSchema } from '../posts/schemas/post.schema';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Like.name, schema: LikeSchema }]),
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
    PostsModule,
  ],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
