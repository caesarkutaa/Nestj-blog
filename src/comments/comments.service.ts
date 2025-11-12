import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private postsService: PostsService,
  ) {}

  async addComment(postId: string, dto: CreateCommentDto) {
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new NotFoundException('Post not found');

    const created = new this.commentModel({ ...dto, post: postId });
    await created.save();
    await this.postsService.pushComment(postId, (created as any)._id.toString());
    return created;
  }

  async getForPost(postId: string) {
    return this.commentModel.find({ post: postId }).sort({ createdAt: -1 }).exec();
  }
}
      