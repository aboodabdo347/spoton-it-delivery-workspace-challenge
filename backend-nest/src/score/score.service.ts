import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoreEvent } from './score-event.entity';
import type { RequestUser } from '../common/request-user';

@Injectable()
export class ScoreService {
  constructor(
    @InjectRepository(ScoreEvent)
    private readonly eventRepo: Repository<ScoreEvent>,
  ) {}

  async summaryFor(user: RequestUser) {
    const events = await this.eventRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    return {
      total: events.reduce((sum, e) => sum + e.points, 0),
      events: events.map((e) => ({
        id: e.id,
        action: e.action,
        points: e.points,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  // Idempotent — silently skips if (userId, action, entityId) already exists
  async awardOnce(
    userId: string,
    action: string,
    entityId: string,
    points: number,
  ): Promise<void> {
    const existing = await this.eventRepo.findOne({
      where: { userId, action, entityId },
    });
    if (existing) return;
    const event = this.eventRepo.create({ userId, action, entityId, points });
    await this.eventRepo.save(event);
  }

  // Non-idempotent manual award (kept for the existing POST /score/events endpoint)
  async award(user: RequestUser, action: string, points: number) {
    const event = this.eventRepo.create({
      userId: user.id,
      action,
      entityId: `manual_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      points,
    });
    return this.eventRepo.save(event);
  }
}
