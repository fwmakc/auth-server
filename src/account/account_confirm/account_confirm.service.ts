import { v4 } from "uuid";
import { FindOptionsWhere, MoreThan, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomInt } from "crypto";
import { AccountConfirmEntity } from "./account_confirm.entity";

@Injectable()
export class AccountConfirmService {
  constructor(
    @InjectRepository(AccountConfirmEntity)
    protected readonly repository: Repository<AccountConfirmEntity>,
  ) {}

  async findById(id: number): Promise<AccountConfirmEntity> {
    const where: FindOptionsWhere<any> = { id };
    return await this.repository.findOne({
      where,
      relations: ["account"],
    });
  }

  async findByCode(code: string, type = "code"): Promise<AccountConfirmEntity> {
    const where: FindOptionsWhere<any> = { code, type };
    // createdAt is a naive UTC timestamp; compute the cutoff from Date.now()
    // so local-timezone setHours() can't shrink (or void) the window.
    // reset codes live 1 hour, 2FA login codes 5 minutes, confirm codes 24 hours
    const maxAgeMs =
      type === "reset" ? 3600_000 : type === "2fa" ? 5 * 60_000 : 24 * 3600_000;
    // created_at в колонке — naive UTC (DB CURRENT_TIMESTAMP), но Date-параметры
    // pg сериализует в локальной зоне, а postgres при сравнении с timestamp
    // отбрасывает offset → на хостах с TZ≠UTC свежий код выглядит старым и
    // валидация всегда падает. Отсечка строкой в UTC-naive — зона не участвует.
    const cutoff = new Date(Date.now() - maxAgeMs)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");
    where.createdAt = MoreThan(cutoff as any);
    return await this.repository.findOne({
      where,
      relations: ["account"],
      order: { createdAt: "DESC" },
    });
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return !!result?.affected;
  }

  async create(account, type = "code") {
    const entrie = {
      account: {
        id: account.id,
      },
      type,
      code: v4(),
    };

    await this.repository.delete({
      account: {
        id: account.id,
      },
      type,
    });

    const created = await this.repository.save(entrie);
    return await this.findById(created.id);
  }

  async generate(account, type = "code") {
    const code = String(randomInt(100000, 1000000));
    const entrie = {
      account: {
        id: account.id,
      },
      type,
      code,
    };
    // stale codes of the same type must not stay valid side by side
    await this.repository.delete({
      account: {
        id: account.id,
      },
      type,
    });
    const created = await this.repository.save(entrie);
    return await this.findById(created.id);
  }

  async validate(code, type = "code") {
    const entrie = await this.findByCode(code, type);
    if (entrie) {
      await this.remove(entrie.id);
    }
    return entrie;
  }
}
