import { IsEnum } from 'class-validator';
import { ServiceStatus } from '../schema/service.schema';

export class UpdateServiceStatusDto {
  @IsEnum(ServiceStatus)
  status: ServiceStatus;
}