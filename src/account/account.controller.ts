import { Controller, Get, NotFoundException } from "@nestjs/common";
import { ApiTags, ApiExcludeEndpoint } from "@nestjs/swagger";
import { Account, Self } from "@core/common";
import { AccountDto } from "./account.dto";
import { AccountService } from "./account.service";

@ApiTags("Авторизация")
@Controller("account")
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Account()
  @Get("self")
  @ApiExcludeEndpoint()
  async self(@Self() account: AccountDto) {
    const { id } = account;
    const result = await this.accountService.findOne({
      id,
      relations: [{ name: "strategies" }],
    });
    if (!result) {
      throw new NotFoundException("Entrie not found");
    }
    return result;
  }
}
