import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { RequestUser } from '../common/request-user';
import { ItWorkspaceService } from './it-workspace.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { CreateQaCheckDto } from './dto/create-qa-check.dto';
import { UpdateQaCheckDto } from './dto/update-qa-check.dto';

@UseGuards(JwtAuthGuard)
@Controller('it-workspace')
export class ItWorkspaceController {
  constructor(private readonly workspace: ItWorkspaceService) {}

  @Get('summary')
  summary() {
    return this.workspace.summary();
  }

  // --- Work Items ---

  @Post('work-items')
  createWorkItem(
    @Body() dto: CreateWorkItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workspace.create(dto, user);
  }

  @Get('work-items')
  listWorkItems(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignee') assignee?: string,
    @Query('search') search?: string,
    @Query('myWork') myWork?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.workspace.findAll({
      status: status as any,
      priority,
      assignee,
      search,
      myWork,
      userId: user?.id,
    });
  }

  @Get('work-items/:id')
  getWorkItem(@Param('id') id: string) {
    return this.workspace.findOne(id);
  }

  @Patch('work-items/:id')
  updateWorkItem(
    @Param('id') id: string,
    @Body() dto: UpdateWorkItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workspace.update(id, dto, user);
  }

  @Delete('work-items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteWorkItem(@Param('id') id: string) {
    return this.workspace.remove(id);
  }

  // --- QA Checks ---

  @Post('work-items/:workItemId/qa-checks')
  createQaCheck(
    @Param('workItemId') workItemId: string,
    @Body() dto: CreateQaCheckDto,
  ) {
    return this.workspace.createQaCheck(workItemId, dto);
  }

  @Get('work-items/:workItemId/qa-checks')
  listQaChecks(@Param('workItemId') workItemId: string) {
    return this.workspace.listQaChecks(workItemId);
  }

  @Patch('qa-checks/:checkId')
  updateQaCheck(
    @Param('checkId') checkId: string,
    @Body() dto: UpdateQaCheckDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workspace.updateQaCheck(checkId, dto, user);
  }

  @Delete('qa-checks/:checkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeQaCheck(@Param('checkId') checkId: string) {
    return this.workspace.removeQaCheck(checkId);
  }
}
