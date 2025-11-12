import { Body, Controller, Get, Param, Post as HttpPost, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentsService } from './comments.service';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @HttpPost(':postId')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async add(@Param('postId') postId: string, @Body() dto: CreateCommentDto) {
    return this.commentsService.addComment(postId, dto);
  }

  @Get(':postId')
  async list(@Param('postId') postId: string) {
    return this.commentsService.getForPost(postId);
  }
}
