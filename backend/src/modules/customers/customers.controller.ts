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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CurrentUser } from '../../shared/decorators';

@ApiTags('Devedores')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os devedores' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query('includeInactive') includeInactive?: boolean
  ) {
    return this.customersService.findAll(organizationId, includeInactive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter devedor por ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.customersService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo devedor' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateCustomerDto
  ) {
    return this.customersService.create(organizationId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar devedor' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateCustomerDto
  ) {
    return this.customersService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir devedor' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.customersService.remove(id, organizationId);
  }
}
