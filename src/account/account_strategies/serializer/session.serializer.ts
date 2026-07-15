import { PassportSerializer } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { AccountEntity } from "@src/account/account.entity";
import { AccountService } from "@src/account/account.service";

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly accountService: AccountService) {
    super();
  }

  serializeUser(account: AccountEntity, done) {
    console.log("serializeUser");
    done(undefined, account);
  }

  async deserializeUser(payload: any, done) {
    console.log("deserializeUser");
    const account = await this.accountService.findOne({ id: payload.id });
    return done(undefined, account ?? undefined);
  }
}
