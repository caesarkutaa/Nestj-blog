import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { Job, JobSchema } from './schema/job.schema';
import { ApplicationModule } from '../application/application.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]), ApplicationModule],
  controllers: [JobController],
  providers: [JobService],
  exports: [JobService],
})
export class JobModule {}