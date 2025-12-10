import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CurrentUser } from '../../shared/decorators';

@ApiTags('Categorias')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as categorias' })
  @ApiQuery({ name: 'type', required: false, enum: CategoryType })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query('type') type?: CategoryType,
    @Query('includeInactive') includeInactive?: boolean
  ) {
    return this.categoriesService.findAll(
      organizationId,
      type,
      includeInactive
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter categoria por ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.categoriesService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova categoria' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateCategoryDto
  ) {
    return this.categoriesService.create(organizationId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar categoria' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateCategoryDto
  ) {
    return this.categoriesService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir categoria' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.categoriesService.remove(id, organizationId);
  }
}
