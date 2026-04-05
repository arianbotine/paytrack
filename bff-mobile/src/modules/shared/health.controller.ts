import { Controller, Get } from '@nestjs/common';
import { HttpClientService } from '../../infrastructure/http-client.service';

@Controller('health')
export class HealthController {
  constructor(private readonly httpClient: HttpClientService) {}

  @Get()
  check() {
    // Fire-and-forget: acorda o backend em paralelo sem bloquear a resposta.
    // O interceptor de retry do HttpClientService cuidará de tentar novamente
    // até o backend estar pronto — útil para cold start em cascata no Render.
    this.httpClient.get('/health').catch(() => {
      // silencia erros — o objetivo é apenas disparar o cold start do backend
    });

    return {
      status: 'ok',
      service: 'bff-mobile',
      timestamp: new Date().toISOString(),
    };
  }
}
