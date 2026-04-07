import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CurrentUser } from '../shared/current-user.decorator';
import { JwtGuard } from '../shared/jwt.guard';
import { CategoryQueryDto } from './categories.dto';

@ApiTags('Categories')
@ApiBearerAuth('JWT')
@Controller('categories')
@UseGuards(JwtGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorias' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async findAll(
    @CurrentUser('accessToken') accessToken: string,
    @Query() query: CategoryQueryDto
  ) {
    return this.categoriesService.findAll(accessToken, query);
  }
}
