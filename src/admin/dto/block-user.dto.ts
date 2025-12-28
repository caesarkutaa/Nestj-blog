import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class BlockUserDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UnblockUserDto {
  @IsBoolean()
  @IsOptional()
  clearReason?: boolean;
}