import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  ValidationPipe,
  UploadedFiles,
  UseInterceptors,
  Request,
  NotFoundException,
  Query,
  Patch
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
  
  @Get("search")
  async search(@Query("q") q: string) {
    return this.postsService.searchPosts(q);
  }
  
  @Get("trending")
  async trending() {
    return this.postsService.getTrending();
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
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'contentImages', maxCount: 10 },
      ],
      {
        limits: {
          fileSize: 50 * 1024 * 1024,   // 50MB per file
          fieldSize: 50 * 1024 * 1024,  // 50MB for text fields
          fields: 100,
          files: 10,
        },
      }
    )
  )
  async create(
    @UploadedFiles()
    files: { image?: Express.Multer.File[]; contentImages?: Express.Multer.File[] },
    @Body(new ValidationPipe({ transform: true }))
    createDto: CreatePostDto,
    @Request() req,
  ) {
    const adminName = req.user?.username;
    const adminId = req.user?.userId;
    const featuredImage = files?.image?.[0];
    const contentFiles = files?.contentImages || [];
    
    return this.postsService.create(createDto, featuredImage, contentFiles, adminName, adminId);
  }

  /** UPDATE POST */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'contentImages', maxCount: 10 },
      ],
      {
        limits: {
          fileSize: 50 * 1024 * 1024,   // 50MB per file
          fieldSize: 50 * 1024 * 1024,  // 50MB for text fields
          fields: 100,
          files: 10,
        },
      }
    )
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

    // ✅ Log content size
    const contentSize = dto.content 
      ? (dto.content.length / 1024).toFixed(2) 
      : 0;
    
    const totalBodySize = (JSON.stringify(dto).length / 1024).toFixed(2);
    
    console.log(`\n📊 UPDATE POST SIZE:`);
    console.log(`   Content: ${contentSize} KB`);
    console.log(`   Total Body: ${totalBodySize} KB`);
    
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
  @Post(':id/share')
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