import { Test, TestingModule } from '@nestjs/testing';
import { JobaggregatorController } from './jobaggregator.controller';

describe('JobaggregatorController', () => {
  let controller: JobaggregatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobaggregatorController],
    }).compile();

    controller = module.get<JobaggregatorController>(JobaggregatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
