import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post as HttpPost,
  Put,
  UseGuards,
  ValidationPipe,
  UploadedFiles,
  UseInterceptors,
  Request,
  NotFoundException,
  Query
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * ✅ Lightweight list of posts (fast)
   * GET /posts?limit=10&page=1
   */
  @Get()
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.postsService.findAll(page, limit);
  }

  /**
   * ❗ GET full post by ID (includes content + comments)
   */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  /** CREATE POST */
  @UseGuards(JwtAuthGuard)
  @HttpPost()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'contentImages', maxCount: 10 },
    ]),
  )
  async create(
    @UploadedFiles()
    files: { image?: Express.Multer.File[]; contentImages?: Express.Multer.File[] },
    @Body(new ValidationPipe({ transform: true }))
    createDto: CreatePostDto,
    @Request() req,
  ) {
    const adminName = req.user?.username;
    const featuredImage = files.image?.[0];
    const contentFiles = files.contentImages || [];
    return this.postsService.create(createDto, featuredImage, contentFiles, adminName);
  }

  /** UPDATE POST */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'contentImages', maxCount: 10 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @UploadedFiles()
    files?: {
      image?: Express.Multer.File[];
      contentImages?: Express.Multer.File[];
    },
  ) {
    const featuredImage = files?.image?.[0];
    const contentFiles = files?.contentImages || [];
    return this.postsService.update(id, dto, featuredImage, contentFiles);
  }

  /** DELETE POST */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }

  /** SHARE COUNT */
  @UseGuards(JwtAuthGuard)
  @HttpPost(':id/share')
  async sharePost(@Param('id') id: string) {
    return this.postsService.incrementShareCount(id);
  }

  /** RELATED POSTS */
  @Get(':id/related')
  async getRelated(@Param('id') id: string) {
    return this.postsService.findOneWithRelated(id);
  }

  /** GET POST BY SLUG */
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const post = await this.postsService.findBySlug(slug);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }
}
