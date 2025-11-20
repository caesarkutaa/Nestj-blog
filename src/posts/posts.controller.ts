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
  UploadedFile,
  UseInterceptors,
  Request,
  NotFoundException,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async getAll() {
    return this.postsService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  /** ✅ CREATE POST with image upload */
  @UseGuards(JwtAuthGuard)
@HttpPost()
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },          // Featured image
    { name: 'contentImages', maxCount: 10 }, // Additional content images
  ]),
)
async create(
  @UploadedFiles() files: { image?: Express.Multer.File[], contentImages?: Express.Multer.File[] },
  @Body(new ValidationPipe({ transform: true })) createDto: CreatePostDto,
  @Request() req,
) {
  const adminName = req.user?.username;
  const featuredImage = files.image ? files.image[0] : undefined;
  const contentFiles = files.contentImages || [];

  return this.postsService.create(createDto, featuredImage, contentFiles, adminName);
}
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
  @UploadedFiles() files?: { 
    image?: Express.Multer.File[]; 
    contentImages?: Express.Multer.File[] 
  },
) {
  const featuredImage = files?.image?.[0];
  const contentFiles = files?.contentImages || [];

  return this.postsService.update(id, dto, featuredImage, contentFiles);
}

   
   
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string ) {    
    return this.postsService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @HttpPost(':id/share')
  async sharePost(@Param('id') id: string) {
    return this.postsService.incrementShareCount(id);
  }

  // posts.controller.ts      
@Get(':id/related')
async getPost(@Param('id') id: string) {
  return this.postsService.findOneWithRelated(id);
}

/** ✅ Get post by slug */
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const post = await this.postsService.findBySlug(slug);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

}
    