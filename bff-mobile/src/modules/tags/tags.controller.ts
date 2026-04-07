import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TagsService, CreateTagBffDto } from './tags.service';
import { CurrentUser } from '../shared/current-user.decorator';
import { JwtGuard } from '../shared/jwt.guard';

@ApiTags('Tags')
@ApiBearerAuth('JWT')
@Controller('tags')
@UseGuards(JwtGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tags da organização' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async findAll(@CurrentUser('accessToken') accessToken: string) {
    return this.tagsService.findAll(accessToken);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova tag' })
  @ApiResponse({ status: 201, description: 'Tag criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async create(
    @CurrentUser('accessToken') accessToken: string,
    @Body() dto: CreateTagBffDto
  ) {
    return this.tagsService.create(accessToken, dto);
  }
}
