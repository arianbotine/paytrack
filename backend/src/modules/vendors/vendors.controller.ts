import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { VendorsService } from "./vendors.service";
import { CreateVendorDto, UpdateVendorDto } from "./dto/vendor.dto";
import { CurrentUser } from "../../shared/decorators";

@ApiTags("Credores")
@ApiBearerAuth()
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: "Listar todos os credores" })
  @ApiQuery({ name: "includeInactive", required: false, type: Boolean })
  async findAll(
    @CurrentUser("organizationId") organizationId: string,
    @Query("includeInactive") includeInactive?: boolean,
  ) {
    return this.vendorsService.findAll(organizationId, includeInactive);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obter credor por ID" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
  ) {
    return this.vendorsService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: "Criar novo credor" })
  async create(
    @CurrentUser("organizationId") organizationId: string,
    @Body() createDto: CreateVendorDto,
  ) {
    return this.vendorsService.create(organizationId, createDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualizar credor" })
  async update(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
    @Body() updateDto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(id, organizationId, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Excluir credor" })
  async remove(
    @Param("id") id: string,
    @CurrentUser("organizationId") organizationId: string,
  ) {
    return this.vendorsService.remove(id, organizationId);
  }
}
