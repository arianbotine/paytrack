import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger("Performance");
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 segundo

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;

          if (duration > this.SLOW_QUERY_THRESHOLD) {
            this.logger.warn(`🐌 SLOW: ${method} ${url} - ${duration}ms`);
          } else if (duration > 500) {
            this.logger.log(`⚠️  ${method} ${url} - ${duration}ms`);
          } else {
            this.logger.log(`✅ ${method} ${url} - ${duration}ms`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.log(`❌ ${method} ${url} - ${duration}ms - Error: ${error.message}`);
        }
      })
    );
  }
}