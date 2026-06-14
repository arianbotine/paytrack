import {
  BadGatewayException,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiQueryChatRequestDto, AiQueryChatResponseDto } from './dto';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class AiQueryService {
  private readonly aiServiceUrl: string;
  private readonly aiServiceApiKey: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly systemSettingsService: SystemSettingsService
  ) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      'http://localhost:8000';
    this.aiServiceApiKey =
      this.configService.get<string>('AI_SERVICE_API_KEY') || '';
    this.timeoutMs = Number(
      this.configService.get<string>('AI_SERVICE_TIMEOUT_MS') || '15000'
    );
  }

  async chat(
    organizationId: string,
    payload: AiQueryChatRequestDto
  ): Promise<AiQueryChatResponseDto> {
    await this.systemSettingsService.ensureAiQueryChatEnabled();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.aiServiceUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.aiServiceApiKey,
        },
        body: JSON.stringify({
          message: payload.message,
          organization_id: organizationId,
          response_mode: payload.responseMode || 'basic',
        }),
        signal: controller.signal,
      });

      const rawBody = await response.text();
      const data = rawBody ? JSON.parse(rawBody) : null;

      if (!response.ok) {
        throw new BadGatewayException(
          data?.message || 'Falha ao consultar AI Query Engine'
        );
      }

      return data as AiQueryChatResponseDto;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException(
          'Timeout ao consultar AI Query Engine'
        );
      }

      throw new BadGatewayException('Falha de comunicacao com AI Query Engine');
    } finally {
      clearTimeout(timeout);
    }
  }
}
