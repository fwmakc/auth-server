import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { getClientIp } from '@supercharge/request-ip';
import { Observable } from 'rxjs';

@Injectable()
export class AddClientIpInterceptor implements NestInterceptor {
  constructor(private readonly key: string = 'ip') {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    request.body[this.key] = getClientIp(request);

    return next.handle();
  }
}
