// posts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Post } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import slugify from 'slugify';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    private readonly cloudinary: CloudinaryService,
  ) {}
   
  /** ✅ Create Post with Cloudinary image & admin name */
  async create(
  createDto: CreatePostDto,
  file?: Express.Multer.File,           // Featured image (optional)
  contentFiles?: Express.Multer.File[], // Additional content images (optional)
  adminName?: string                     // Admin name (optional)
) {
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

  // Create slug
  const slug =
    createDto.slug || slugify(createDto.title, { lower: true, strict: true });

  const created = new this.postModel({
    ...createDto,
    image: imageUrl,          // Featured image
    contentImages: contentImageUrls, // Array of content images
    author: adminName,
    slug,
  });

  return created.save();
}


  /** ✅ Update Post (and replace image if new one is uploaded) */
  /** ✅ Update Post (and replace images if new ones are uploaded) */
async update(
  id: string,
  dto: UpdatePostDto,
  file?: Express.Multer.File,              // Featured image
  contentFiles?: Express.Multer.File[]     // Additional content images
) {
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

  Object.assign(post, dto);
  return post.save();
}


  /** ✅ Delete Post */
  async remove(id: string) {
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
    .select('title slug image likes createdAt category views author') // lightweight
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
    .lean()                 // ✅ safe (read only)
    .exec();

  if (!post) throw new NotFoundException('Post not found');
  return post;
}

   

  /** ✅ Like / Unlike a Post */
  async toggleLike(postId: string, userId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    // Convert ObjectId[] to string[] if necessary
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

  // Check if the input is a valid ObjectId
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    post = await this.postModel.findById(idOrSlug);
  } else {
    post = await this.postModel.findOne({ slug: idOrSlug }).exec();
  }

  if (!post) throw new NotFoundException('Post not found');

  // Find related posts (same category or overlapping keywords)
  const related = await this.postModel
    .find({
      _id: { $ne: post._id },
      $or: [
        { category: post.category },
        { keywords: { $in: post.keywords } },
      ],
    })
    .limit(4)
    .lean()
    .exec();

  return { post, related };
}

/** ✅ Find One Post by Slug */
async findBySlug(slug: string) {
  const post = await this.postModel
    .findOne({ slug }) // search by slug
    .populate('comments') // include comments
    .exec();

  if (!post) throw new NotFoundException('Post not found');
  // Increment view count
  post.views = (post.views || 0) + 1;
  await post.save();
  return post;
}


}
