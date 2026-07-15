import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { tokenValidateSimple } from './secure.guard.service';

@Injectable()
export class SimpleSecureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization'];

    return tokenValidateSimple(token);
  }
}
