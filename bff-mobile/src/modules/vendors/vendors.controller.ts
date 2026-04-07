import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { CurrentUser } from '../shared/current-user.decorator';
import { JwtGuard } from '../shared/jwt.guard';
import { VendorQueryDto, CreateVendorBffDto } from './vendors.dto';

@ApiTags('Vendors')
@ApiBearerAuth('JWT')
@Controller('vendors')
@UseGuards(JwtGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar fornecedores' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async findAll(
    @CurrentUser('accessToken') accessToken: string,
    @Query() query: VendorQueryDto
  ) {
    return this.vendorsService.findAll(accessToken, query);
  }

  @Post()
  @ApiOperation({ summary: 'Criar fornecedor' })
  @ApiResponse({ status: 201, description: 'Fornecedor criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async create(
    @CurrentUser('accessToken') accessToken: string,
    @Body() dto: CreateVendorBffDto
  ) {
    return this.vendorsService.create(accessToken, dto);
  }
}
