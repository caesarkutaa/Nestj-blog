// comments.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

  // -------------------------------------
  // ADD COMMENT OR REPLY
  // -------------------------------------
  async addComment(postId: string, dto: CreateCommentDto) {
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new NotFoundException('Post not found');

    const newComment = new this.commentModel({
      ...dto,
      post: postId,
      parent: dto.parent ?? null,
      isAdmin: dto.isAdmin ?? false,
      status: 'approved',
    });

    await newComment.save();

    // Only top-level comments get added to Post.comments list
    if (!dto.parent) {
      await this.postsService.pushComment(
        postId,
        (newComment as any)._id.toString()
      );
    }

    return newComment;
  }

 // -------------------------------------
// GET COMMENTS WITH REPLIES
// -------------------------------------
async getForPost(postId: string) {
  const comments = await this.commentModel
    .find({ post: postId, status: 'approved' })
    .sort({ createdAt: 1 }) // FIX: oldest → newest to maintain tree
    .lean()
    .exec();

  const map: Record<string, any> = {};   
  const roots: any[] = [];

  // Create map and add replies array
  comments.forEach((c: any) => {
    c.replies = [];
    map[String(c._id)] = c;
  });    

  // Build nested replies      
  comments.forEach((c: any) => {
    if (c.parent) {
      const parentId = String(c.parent);

      if (map[parentId]) {
        map[parentId].replies.push(c);        
      }
    } else {
      roots.push(c);
    }
  });   

  return roots;
}


  // -------------------------------------
  // DELETE COMMENT (Admin)
  // -------------------------------------
  async deleteComment(commentId: string) {
    const deleted = await this.commentModel.findByIdAndDelete(commentId);
    if (!deleted) throw new NotFoundException('Comment not found');
    return { message: 'Comment deleted' };
  }

  // -------------------------------------
  // MODERATE COMMENT (Admin)
  // -------------------------------------
  async updateStatus(commentId: string, status: string) {
    const found = await this.commentModel.findById(commentId);
    if (!found) throw new NotFoundException('Comment not found');

    found.status = status;
    await found.save();

    return found;
  }
}
