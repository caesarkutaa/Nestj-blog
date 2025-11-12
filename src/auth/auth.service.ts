import { Injectable} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin/admin.service';
import { jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(private adminService: AdminService, private jwtService: JwtService) {}

  async validateAdmin(username: string, password: string) {
    const admin = await this.adminService.findByUsername(username);
    if (!admin) return null;
    const isMatch = await this.adminService.comparePassword(password, admin.password);
    if (!isMatch) return null;
    return admin;
  }

  async login(admin: any) {
    const payload = { username: admin.username, sub: admin._id };
    return {
      access_token: this.jwtService.sign(payload, { secret: jwtConstants.secret }),
      expires_in: process.env.JWT_EXPIRES_IN || '1d',
    };
  }
}
