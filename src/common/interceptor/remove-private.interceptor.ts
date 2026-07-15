import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { removePrivateFields } from '../service/private_fields.service';

@Injectable()
export class RemovePrivateFieldsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const bind = {
      allow: user?.isSuperuser ?? false,
      id: user?.id,
      key: 'id',
      name: 'account',
    };

    return next
      .handle()
      .pipe(map((result) => removePrivateFields(result, bind)));
  }
}
