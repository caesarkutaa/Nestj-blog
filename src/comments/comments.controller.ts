import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  Patch,
  Query,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // --------------------------------------------------
  // CREATE COMMENT or REPLY
  // --------------------------------------------------
  @Post(':postId')
  async addComment(
    @Param('postId') postId: string,
    @Body() body: CreateCommentDto,
  ) {
    return this.commentsService.addComment(postId, body);
  }

  // --------------------------------------------------
  // GET COMMENTS (NESTED)
  // --------------------------------------------------
  @Get(':postId')
  async getComments(@Param('postId') postId: string) {
    return this.commentsService.getForPost(postId);
  }

  // --------------------------------------------------
  // DELETE COMMENT (ADMIN)
  // --------------------------------------------------
  @Delete(':commentId')
  async deleteComment(@Param('commentId') commentId: string) {
    return this.commentsService.deleteComment(commentId);
  }
         
  // --------------------------------------------------
  // UPDATE COMMENT STATUS (ADMIN)
  // e.g. approve | pending | rejected
  // --------------------------------------------------
  @Patch(':commentId/status')
  async updateStatus(
    @Param('commentId') commentId: string,      
    @Query('status') status: string,
  ) {
    return this.commentsService.updateStatus(commentId, status);
  }
}
