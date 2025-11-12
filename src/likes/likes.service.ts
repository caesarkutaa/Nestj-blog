import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like, LikeDocument } from './schemas/like.schema';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private postsService: PostsService,
  ) {}

  async toggleLike(postId: string, ipAddress: string) {
    // Remove if exists (unlike), otherwise create
    const existing = await this.likeModel.findOne({ post: postId, ipAddress }).exec();

    if (existing) {
      await existing.deleteOne();
      await this.postsService.pullLike(postId, (existing as any)._id.toString());
      const count = await this.likeModel.countDocuments({ post: postId }).exec();
      return { liked: false, likesCount: count };
    }

    const created = new this.likeModel({ post: postId, ipAddress });
    await created.save();
   await this.postsService.pushLike(postId, (created as any)._id.toString());
    const count = await this.likeModel.countDocuments({ post: postId }).exec();
    return { liked: true, likesCount: count };
  }

  async count(postId: string) {
    return this.likeModel.countDocuments({ post: postId }).exec();
  }
}
