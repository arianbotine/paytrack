import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { CurrentUser } from '../../shared/decorators';

@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as tags' })
  async findAll(@CurrentUser('organizationId') organizationId: string) {
    return this.tagsService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter tag por ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.tagsService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova tag' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateTagDto
  ) {
    return this.tagsService.create(organizationId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar tag' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateTagDto
  ) {
    return this.tagsService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir tag' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.tagsService.remove(id, organizationId);
  }
}
