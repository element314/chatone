import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (
          data &&
          typeof data === 'object' &&
          'status' in data &&
          'data' in data
        ) {
          return data;
        }

        let message: string | null = null;
        let responseData: Record<string, unknown> = {};

        if (data && typeof data === 'object') {
          const dataObj = data as Record<string, unknown>;
          responseData = { ...dataObj };

          if ('message' in dataObj && typeof dataObj.message === 'string') {
            message = dataObj.message;
            delete responseData.message;
          }
        } else {
          responseData = { value: data };
        }

        return {
          status: {
            success: true,
            message,
          },
          data: responseData,
        };
      }),
    );
  }
}
