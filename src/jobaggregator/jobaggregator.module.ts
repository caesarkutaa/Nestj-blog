import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobaggregatorService } from './jobaggregator.service';
import { JobaggregatorController } from './jobaggregator.controller';
import { Job, JobSchema } from '../job/schema/job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
  ],
  controllers: [JobaggregatorController],
  providers: [JobaggregatorService],
  exports: [JobaggregatorService],
})
export class JobaggregatorModule {}
