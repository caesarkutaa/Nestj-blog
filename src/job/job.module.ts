import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { JobaggregatorService } from '../jobaggregator/jobaggregator.service';
import { JobaggregatorController } from '../jobaggregator/jobaggregator.controller';
import { Job, JobSchema } from './schema/job.schema';
import { ApplicationModule } from '../application/application.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    ScheduleModule.forRoot(), // Enable cron jobs
    forwardRef(() => ApplicationModule),
  ],
  controllers: [JobController, JobaggregatorController],
  providers: [JobService,  JobaggregatorService],
  exports: [JobService,  JobaggregatorService],
})
export class JobModule {}