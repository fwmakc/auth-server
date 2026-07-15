import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { tokenValidate } from './secure.guard.service';

@Injectable()
export class SecureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization'];

    return tokenValidate(token);
  }
}
