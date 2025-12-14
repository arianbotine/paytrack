import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Global interceptor that transforms Prisma Decimal objects to numbers
 * and Date objects to ISO strings in all HTTP responses.
 *
 * This ensures consistent data types across the API, preventing issues
 * with JSON serialization and frontend parsing.
 */
@Injectable()
export class SerializationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(data => this.transformResponse(data)));
  }

  private transformResponse(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.transformResponse(item));
    }

    // Handle objects (including nested objects)
    if (typeof data === 'object') {
      // Transform Prisma Decimal to number
      if (data instanceof Decimal) {
        return Number.parseFloat(data.toString());
      }

      // Transform Date to ISO string
      if (data instanceof Date) {
        return data.toISOString();
      }

      // Recursively transform nested objects
      const transformed: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        transformed[key] = this.transformResponse(value);
      }
      return transformed;
    }

    // Return primitive values as-is
    return data;
  }
}
