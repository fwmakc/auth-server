import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CommonService } from "api-server-toolkit";
import { RelationsDto } from "api-server-toolkit";
import { AccountSessionsDto } from "./account_sessions.dto";
import { AccountSessionsEntity } from "./account_sessions.entity";

@Injectable()
export class AccountSessionsService extends CommonService<
  AccountSessionsDto,
  AccountSessionsEntity
> {
  constructor(
    @InjectRepository(AccountSessionsEntity)
    protected readonly repository: Repository<AccountSessionsEntity>
  ) {
    super();
  }

  async log(account, request, description = "") {
    const { ip, method, originalUrl, headers } = request;
    const data = {
      ip,
      userAgent: headers["user-agent"],
      referrer: originalUrl,
      method,
      locale:
        headers["accept-language"]?.split(",")?.[0]?.split(";")?.[0] || null,
      timezone: headers["timezone"],
      account: account,
      description,
    };
    return await this.create(data, [{ name: "account" }]);
  }

  async start(account, request) {
    const { session } = request;
    if (!session) {
      return;
    }
    session.save(async (e) => {
      await this.log(account, request, e ? "create error" : "create");
    });
  }

  async destroy(account, request) {
    const { session } = request;
    if (session) {
      await session.destroy(async (e) => {
        await this.log(account, request, e ? "destroy error" : "destroy");
      });
    }
  }

  async getByAuthId(
    authId: number,
    relations: Array<RelationsDto> = undefined
  ): Promise<AccountSessionsEntity[]> {
    const sessions = await this.repository.find({
      relations: relations?.map((i) => i.name),
      where: {
        account: {
          id: authId,
        },
      },
    });
    if (!sessions || !sessions.length) {
      return;
    }
    return sessions;
  }
}
