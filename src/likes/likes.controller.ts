import { Controller, Post, Param, Req, Get } from '@nestjs/common';
import type { Request } from 'express';
import { LikesService } from './likes.service';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':postId')
  async toggle(@Param('postId') postId: string, @Req() req: Request) {
    // Extract IP robustly
    const xff = req.headers['x-forwarded-for'];
    const ip = typeof xff === 'string' ? xff.split(',')[0].trim() : req.ip || 'unknown';
    return this.likesService.toggleLike(postId, ip);
  }

  @Get(':postId')
  async count(@Param('postId') postId: string) {
    const likesCount = await this.likesService.count(postId);
    return { likesCount };
  }
}
