import { Test, TestingModule } from '@nestjs/testing';
import { JobaggregatorService } from './jobaggregator.service';

describe('JobaggregatorService', () => {
  let service: JobaggregatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobaggregatorService],
    }).compile();

    service = module.get<JobaggregatorService>(JobaggregatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
