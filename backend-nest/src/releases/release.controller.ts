import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { RequestUser } from '../common/request-user';
import { ReleaseService } from './release.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { LinkItemsDto } from './dto/link-items.dto';

@UseGuards(JwtAuthGuard)
@Controller('releases')
export class ReleaseController {
  constructor(private readonly releaseService: ReleaseService) {}

  @Post()
  create(@Body() dto: CreateReleaseDto) {
    return this.releaseService.create(dto);
  }

  @Get()
  findAll() {
    return this.releaseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.releaseService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReleaseDto) {
    return this.releaseService.update(id, dto);
  }

  @Post(':id/link-items')
  linkItems(@Param('id') id: string, @Body() dto: LinkItemsDto) {
    return this.releaseService.linkItems(id, dto);
  }

  @Post(':id/deploy')
  @HttpCode(HttpStatus.OK)
  deploy(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.releaseService.deploy(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.releaseService.remove(id);
  }
}
