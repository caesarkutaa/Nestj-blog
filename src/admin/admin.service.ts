import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Admin, AdminDocument } from './schemas/admin.schema';
import { jwtConstants } from 'src/auth/constants';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
  ) {}

  async create(createAdminDto: { username: string; password: string }) {
    const existing = await this.adminModel.findOne({ username: createAdminDto.username });
    if (existing) throw new BadRequestException('Admin username already exists');


  const created = new this.adminModel(createAdminDto);
    return created.save();
  }

  async findByUsername(username: string) {
    return this.adminModel.findOne({ username }).exec();
  }

 async comparePassword(plain: string, hash: string) {
  const result = await bcrypt.compare(plain, hash);
  console.log('🧩 Comparing passwords:', { plain, hash, result });
  return result;
}


  async login(dto: { username: string; password: string }) {
    console.log('LOGIN DTO:', dto);
    const { username, password } = dto;
    const admin = await this.findByUsername(username);
    console.log('FOUND ADMIN:', admin?.toObject ? admin.toObject() : admin);

    if (!admin) throw new UnauthorizedException('Invalid ADMIN');

    console.log('RAW PASSWORD FROM DTO:', password);
    console.log('HASHED PASSWORD IN DB:', admin.password);

    const isMatch = await this.comparePassword(password, admin.password);
    console.log('PASSWORD MATCH:', isMatch);

    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { username: admin.username, sub: admin._id };
    const token = this.jwtService.sign(payload, { secret: jwtConstants.secret });

    return {
      message: 'Login successful',
      token,
      admin: {      
        id: admin._id,
        username: admin.username,
      },
    };
  }
}
