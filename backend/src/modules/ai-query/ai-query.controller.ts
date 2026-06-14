import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { AiQueryService } from './ai-query.service';
import { AiQueryChatRequestDto, AiQueryChatResponseDto } from './dto';

@ApiTags('AI Query')
@ApiBearerAuth()
@Controller('ai-query')
export class AiQueryController {
  constructor(private readonly aiQueryService: AiQueryService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Encaminha pergunta para o AI Query Engine' })
  @ApiResponse({
    status: 201,
    description: 'Resposta gerada com sucesso',
    type: AiQueryChatResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Payload invalido' })
  @ApiResponse({ status: 401, description: 'Nao autenticado' })
  @ApiResponse({ status: 502, description: 'Falha no servico de IA' })
  async chat(
    @CurrentUser('organizationId') organizationId: string,
    @Body() payload: AiQueryChatRequestDto
  ): Promise<AiQueryChatResponseDto> {
    return this.aiQueryService.chat(organizationId, payload);
  }
}
