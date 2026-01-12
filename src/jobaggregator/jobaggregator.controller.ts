import {
  Controller,
  Get,
  Post,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { JobaggregatorService } from './jobaggregator.service';

@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class JobaggregatorController {
  constructor(
    private readonly aggregatorService: JobaggregatorService,
  ) {}

  /**
   * Manually trigger job aggregation (ALL Greenhouse boards)
   * POST /admin/jobs/aggregate
   */
  @Post('aggregate')
  async triggerAggregation() {
    const result = await this.aggregatorService.triggerAggregation();

    return {
      success: true,
      message: 'Greenhouse job aggregation completed',
      stats: result,
    };
  }


  /**
   * Fetch jobs from a specific Greenhouse board (TESTING)
   * GET /admin/jobs/aggregate/source?source=greenhouse&board=stripe
   */
  @Get('aggregate/source')
  async fetchFromSource(
    @Query('source') source: string,
    @Query('board') board: string,
  ) {
    if (!source) {
      throw new BadRequestException(
        'source query param is required (greenhouse)',
      );
    }

    let jobs: any[] = [];

    switch (source.toLowerCase()) {
      case 'greenhouse':
        if (!board) {
          throw new BadRequestException(
            'board query param is required (e.g. stripe, airbnb)',
          );
        }

        jobs = await this.aggregatorService.fetchFromGreenhouse(board);
        break;

      default:
        throw new BadRequestException(
          'Invalid source. Use: greenhouse',
        );
    }

    return {
      source,
      board,
      count: jobs.length,
      preview: jobs.slice(0, 10),
    };
  }
}
