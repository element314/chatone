import { UseInterceptors, applyDecorators } from '@nestjs/common';

import { ResponseInterceptor } from '../interceptors/response.interceptor';

export function ApiCustomResponse() {
  return applyDecorators(UseInterceptors(ResponseInterceptor));
}
