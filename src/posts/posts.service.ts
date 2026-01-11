// posts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Post } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ContentImageService } from './content-image.service'; // ✅ Import ContentImageService
import slugify from 'slugify';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    private readonly cloudinary: CloudinaryService,
    private readonly contentImageService: ContentImageService,
     // ✅ Inject ContentImageService
  ) {}
   private readonly multerOptions = {
    limits: {
      fileSize: 50 * 1024 * 1024,   // 50MB per file
      fieldSize: 50 * 1024 * 1024,  // 50MB for text fields
      fields: 100,                   // Max number of fields
      files: 10,                     // Max number of files
    },
  };
   
  /** ✅ Create Post with Cloudinary image & admin name */
  async create(
    createDto: CreatePostDto,
    file?: Express.Multer.File,           // Featured image (optional)
    contentFiles?: Express.Multer.File[], // Additional content images (optional)
    adminName?: string,                   // Admin name (optional)
    adminId?: string                      // Admin ID
  ) {
    // ✅ LOG: Before processing
    this.logContentSize('CREATE - BEFORE PROCESSING', createDto);

    let imageUrl: string | null = null;

    // Upload featured image
    if (file) {
      const upload = await this.cloudinary.uploadImage(file);
      console.log("Cloudinary featured image upload result:", upload);
      imageUrl = upload.secure_url;
    }

    // Upload content images
    const contentImageUrls: string[] = [];
    if (contentFiles && contentFiles.length > 0) {
      for (const f of contentFiles) {
        const upload = await this.cloudinary.uploadImage(f);
        console.log("Cloudinary content image upload result:", upload);
        contentImageUrls.push(upload.secure_url);
      }
    }

    // ✅ NEW: Process base64 images in content HTML
    if (createDto.content) {
      console.log('🔄 Processing base64 images in content...');
      createDto.content = await this.contentImageService.processContentImages(createDto.content);
      console.log('✅ Base64 images processed and uploaded to Cloudinary');
    }

    // ✅ LOG: After processing
    this.logContentSize('CREATE - AFTER PROCESSING', createDto);

    // Create slug
    const slug =
      createDto.slug || slugify(createDto.title, { lower: true, strict: true });

    const created = new this.postModel({
      ...createDto,
      image: imageUrl,          // Featured image
      contentImages: contentImageUrls, // Array of content images
      author: adminName,
      postedBy: adminId, 
      views: 0,
      slug,
    });

    return created.save();
  }

  /** ✅ Update Post (and replace images if new ones are uploaded) */
  async update(
    id: string,
    dto: UpdatePostDto,
    file?: Express.Multer.File,              // Featured image
    contentFiles?: Express.Multer.File[]     // Additional content images
  ) {
    // ✅ LOG: Before processing
    this.logContentSize('UPDATE - BEFORE PROCESSING', dto);

    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    // Upload featured image if new one is provided
    if (file) {
      const upload = await this.cloudinary.uploadImage(file);
      dto.image = upload.secure_url;
    }

    // Upload additional content images if provided
    if (contentFiles && contentFiles.length > 0) {
      const contentImageUrls: string[] = [];
      for (const f of contentFiles) {
        const upload = await this.cloudinary.uploadImage(f);
        contentImageUrls.push(upload.secure_url);
      }
      // Merge new content images with existing ones
      dto.contentImages = [...(post.contentImages || []), ...contentImageUrls];
    }

    // ✅ NEW: Process base64 images in content HTML
    if (dto.content) {
      console.log('🔄 Processing base64 images in content...');
      dto.content = await this.contentImageService.processContentImages(dto.content);
      console.log('✅ Base64 images processed and uploaded to Cloudinary');
    }

    // ✅ LOG: After processing
    this.logContentSize('UPDATE - AFTER PROCESSING', dto);

    Object.assign(post, dto);
    return post.save();
  }

  /** ✅ Delete Post with image cleanup */
  async remove(id: string) {
    const post = await this.postModel.findById(id);
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // ✅ NEW: Delete images from Cloudinary before deleting post
    if (post.content) {
      const imageUrls = this.contentImageService.extractImageUrls(post.content);
      await this.contentImageService.deleteCloudinaryImages(imageUrls);
    }

    return this.postModel.findByIdAndDelete(id);
  }

  /** ✅ Find All Posts with pagination + lean */
  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const posts = await this.postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title slug image likes content createdAt category views author')
      .populate('comments')
      .lean()
      .exec();

    const total = await this.postModel.countDocuments();

    return {
      data: posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total
    };
  }

  /** ✅ Find One Post by ID (read-only version) */
  async findOne(id: string) {
    const post = await this.postModel
      .findById(id)
      .populate('comments')
      .lean()
      .exec();

    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  /** ✅ Like / Unlike a Post */
  async toggleLike(postId: string, userId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const likes = post.likes.map((id) => id.toString());
    const hasLiked = likes.includes(userId);

    if (hasLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId as any);
    }

    await post.save();
    return post;
  }

  /** ✅ Helper methods for likes & comments */
  async pushLike(postId: string, userId: string) {
    await this.postModel.findByIdAndUpdate(postId, {
      $addToSet: { likes: userId },
    });
  }

  async pullLike(postId: string, userId: string) {
    await this.postModel.findByIdAndUpdate(postId, {
      $pull: { likes: userId },
    });
  }

  async pushComment(postId: string, commentId: string) {
    await this.postModel.findByIdAndUpdate(postId, {
      $push: { comments: commentId },
    });
  }

  async incrementShareCount(postId: string): Promise<{ sharesCount: number }> {
    const updated = await this.postModel.findByIdAndUpdate(
      postId,
      { $inc: { sharesCount: 1 } },
      { new: true },
    );

    if (!updated) {   
      throw new Error('Post not found');
    }

    return { sharesCount: updated.sharesCount };
  }

  async findOneWithRelated(idOrSlug: string) {
    let post;

    // Find the main post
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      post = await this.postModel.findById(idOrSlug).lean();
    } else {
      post = await this.postModel.findOne({ slug: idOrSlug }).lean();
    }

    if (!post) throw new NotFoundException('Post not found');

    // RELATED POSTS: ONLY SAME CATEGORY — SUPER FAST
    const related = await this.postModel
      .find({
        _id: { $ne: post._id },
        category: post.category,
      })
      .select('title slug image views category createdAt')
      .sort({ views: -1, createdAt: -1 })
      .limit(6)
      .lean()
      .exec();

    return { post, related };
  }

  /** ✅ Find One Post by Slug */
  async findBySlug(slug: string) {
    const post = await this.postModel
      .findOne({ slug })
      .populate('comments')
      .exec();

    if (!post) throw new NotFoundException('Post not found');
    
    // Increment view count
    post.views = (post.views || 0) + 1;
    await post.save();
    
    return post;
  }

  /** ✅ Get Trending Posts (Top by Views) */
  async getTrending(limit = 5) {
    return this.postModel
      .find()
      .sort({ views: -1 })
      .limit(limit)
      .select("title image views content slug")
      .lean()
      .exec();
  }

  /** ✅ Search Posts */
  async searchPosts(query: string) {
    if (!query || query.trim() === "") return [];

    return this.postModel
      .find({
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { keywords: { $regex: query, $options: "i" } },
        ],
      })
      .select("title slug image category createdAt views")
      .limit(10)
      .lean()
      .exec();
  }

  // ✅ NEW: Helper method to log content size
  private logContentSize(stage: string, dto: CreatePostDto | UpdatePostDto) {
    const contentSize = dto.content ? dto.content.length : 0;
    const totalSize = JSON.stringify(dto).length;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 ${stage}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📝 Title: ${dto.title || 'N/A'}`);
    console.log(`📄 Content field: ${(contentSize / 1024).toFixed(2)} KB (${contentSize.toLocaleString()} bytes)`);
    console.log(`📦 Total DTO: ${(totalSize / 1024).toFixed(2)} KB (${totalSize.toLocaleString()} bytes)`);
    
    if (dto.content) {
      // Check for base64 images
      const base64ImageRegex = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g;
      const base64Images = dto.content.match(base64ImageRegex);
      const imageCount = base64Images ? base64Images.length : 0;
      
      if (imageCount > 0 && base64Images) {
        const totalImageSize = base64Images.reduce((sum, img) => sum + img.length, 0);
        console.log(`🖼️  Base64 images: ${imageCount}`);
        console.log(`📸 Image data size: ${(totalImageSize / 1024).toFixed(2)} KB`);
        console.log(`📊 Images are ${((totalImageSize / contentSize) * 100).toFixed(1)}% of content`);
      } else {
        console.log(`✅ No base64 images detected (all images are Cloudinary URLs)`);
      }
    }
    
    // Size warnings
    if (totalSize > 100 * 1024) {
      console.log(`⚠️  WARNING: Body exceeds 100KB default limit`);
      console.log(`   Make sure you increased body-parser limit in main.ts`);
    }
    if (totalSize > 1024 * 1024) {
      console.log(`🔴 LARGE: Body exceeds 1MB - consider Cloudinary processing`);
    }
    if (totalSize > 16 * 1024 * 1024) {
      console.log(`❌ CRITICAL: Exceeds MongoDB 16MB document limit!`);
    }
    
    console.log(`${'='.repeat(70)}\n`);
  }
}