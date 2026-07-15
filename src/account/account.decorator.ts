import {
  UseGuards,
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { ApiType } from "@src/common/type/api.type";
import { JwtAccountGuard } from "./guard/jwt.account.guard";
import { JwtNoBlockAccountGuard } from "./guard/jwt_no_block.account.guard";

export const Account = (apiType: ApiType = undefined) => {
  if (apiType === "noBlock") {
    return applyDecorators(UseGuards(JwtNoBlockAccountGuard));
  }
  return applyDecorators(UseGuards(JwtAccountGuard));
};

export const Self = createParamDecorator(
  async (apiType: ApiType = undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (apiType !== "noBlock") {
      if (!user || user?.id === undefined) {
        throw new ForbiddenException("You have no rights!");
      }
    }
    return user;
  }
);
