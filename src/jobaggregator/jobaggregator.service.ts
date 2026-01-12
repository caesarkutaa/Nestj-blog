import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Job, JobStatus } from '../job/schema/job.schema';

interface ExternalJob {
  title: string;
  company: string;
  description: string;
  location: string;
  type: string;
  category: string;
  applyUrl: string;
  source: string;
  sourceId: string;
  publishedAt: Date;
  companyLogo?: string;
  tags?: string[];
}

@Injectable()
export class JobaggregatorService {
  private readonly logger = new Logger(JobaggregatorService.name);

  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<Job>,
  ) {}

  // =============================================
  // GREENHOUSE BOARDS YOU WANT TO TRACK
  // =============================================
  private readonly greenhouseBoards = [
    'stripe',
    'airbnb',
    'webflow',
    'shopify',
  ];

  // =============================================
  // FETCH FROM GREENHOUSE (PER COMPANY)
  // =============================================
  async fetchFromGreenhouse(boardToken: string): Promise<ExternalJob[]> {
    this.logger.log(`🔄 Fetching Greenhouse jobs from ${boardToken}`);

    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`,
      );

      if (!res.ok) {
        throw new Error(`Greenhouse API error: ${res.status}`);
      }

      const data = await res.json();
      const jobs: ExternalJob[] = [];

      for (const job of data.jobs || []) {
        jobs.push({
          title: job.title,
          company: boardToken,
          description: this.cleanHtml(job.content),
          location: job.location?.name || 'Remote',
          type: this.mapJobType(job.employment_type),
          category: this.mapCategory(job.departments?.[0]?.name),
          applyUrl: job.absolute_url,
          source: 'Greenhouse',
          sourceId: `greenhouse-${boardToken}-${job.id}`,
          publishedAt: new Date(job.updated_at),
          tags: job.departments?.map(d => d.name) || [],
        });
      }

      this.logger.log(
        `✅ ${boardToken}: fetched ${jobs.length} Greenhouse jobs`,
      );

      return jobs;
    } catch (err) {
      this.logger.error(
        `❌ Greenhouse fetch failed for ${boardToken}`,
        err,
      );
      return [];
    }
  }

  // =============================================
  // AGGREGATE ALL GREENHOUSE JOBS
  // =============================================
  async aggregateAllJobs() {
    this.logger.log('🚀 Aggregating Greenhouse jobs...');

    const stats = {
      fetched: 0,
      saved: 0,
      duplicates: 0,
      errors: 0,
    };

    const results = await Promise.all(
      this.greenhouseBoards.map(board =>
        this.fetchFromGreenhouse(board),
      ),
    );

    const allJobs = results.flat();
    stats.fetched = allJobs.length;

    for (const job of allJobs) {
      try {
        const exists = await this.jobModel.findOne({
          externalSourceId: job.sourceId,
        });

        if (exists) {
          stats.duplicates++;
          continue;
        }

        await new this.jobModel({
          title: job.title,
          company: job.company,
          description: job.description,
          location: job.location,
          type: job.type,
          category: job.category,
          slug: this.generateSlug(job.title, job.company),
          status: 'active' as JobStatus,

          isExternal: true,
          externalSource: job.source,
          externalSourceId: job.sourceId,
          externalApplyUrl: job.applyUrl,
          tags: job.tags,

          postedBy: null,
          createdAt: job.publishedAt,
          updatedAt: new Date(),
        }).save();

        stats.saved++;
      } catch (err) {
        stats.errors++;
        this.logger.error(`❌ Failed saving ${job.title}`, err);
      }
    }

    this.logger.log(`
      ✅ Greenhouse Aggregation Complete
      - Fetched: ${stats.fetched}
      - Saved: ${stats.saved}
      - Duplicates: ${stats.duplicates}
      - Errors: ${stats.errors}
    `);

    return stats;
  }

  // =============================================
  // CRON JOB
  // =============================================
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledAggregation() {
    await this.aggregateAllJobs();
  }

  async triggerAggregation() {
    return this.aggregateAllJobs();
  }

  // =============================================
  // HELPERS
  // =============================================
  private generateSlug(title: string, company: string) {
    return `${title}-${company}-${Date.now()}`
      .toLowerCase()
      .replace(/\s+/g, '-')
      .slice(0, 90);
  }

  private cleanHtml(html = '') {
    return html.replace(/<[^>]+>/g, '').trim();
  }

  private mapJobType(type = '') {
    const t = type.toLowerCase();
    if (t.includes('contract')) return 'contract';
    if (t.includes('part')) return 'part-time';
    if (t.includes('intern')) return 'internship';
    return 'full-time';
  }

  private mapCategory(category = '') {
    const c = category.toLowerCase();
    if (c.includes('engineer')) return 'Technology';
    if (c.includes('design')) return 'Design';
    if (c.includes('marketing')) return 'Marketing';
    if (c.includes('sales')) return 'Sales';
    return 'Other';
  }
}
