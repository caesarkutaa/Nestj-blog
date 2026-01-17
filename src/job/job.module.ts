import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { JobaggregatorService } from '../jobaggregator/jobaggregator.service';
import { JobaggregatorController } from '../jobaggregator/jobaggregator.controller';
import { Job, JobSchema } from './schema/job.schema';
import { ApplicationModule } from '../application/application.module';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Company, CompanySchema } from '../company/schema/company.schema';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema },
       { name: User.name, schema: UserSchema },           
      { name: Company.name, schema: CompanySchema },  
    ]),
    ScheduleModule.forRoot(), // Enable cron jobs
    forwardRef(() => ApplicationModule),
    
  ],
  controllers: [JobController, JobaggregatorController],
  providers: [JobService,  JobaggregatorService],
  exports: [JobService,  JobaggregatorService],
})
export class JobModule {}