import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CurrentUser } from '../shared/current-user.decorator';
import { JwtGuard } from '../shared/jwt.guard';
import { CustomerQueryDto, CreateCustomerBffDto } from './customers.dto';

@ApiTags('Customers')
@ApiBearerAuth('JWT')
@Controller('customers')
@UseGuards(JwtGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async findAll(
    @CurrentUser('accessToken') accessToken: string,
    @Query() query: CustomerQueryDto
  ) {
    return this.customersService.findAll(accessToken, query);
  }

  @Post()
  @ApiOperation({ summary: 'Criar cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado.' })
  async create(
    @CurrentUser('accessToken') accessToken: string,
    @Body() dto: CreateCustomerBffDto
  ) {
    return this.customersService.create(accessToken, dto);
  }
}
