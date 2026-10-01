import { v4 } from "uuid";
import { FindOptionsWhere, MoreThan, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomInt } from "crypto";
import { AccountConfirmEntity } from "./account_confirm.entity";
import { AccountEntity } from "../account.entity";

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
    // Atomic consumption: the row is claimed by the DELETE itself, so two
    // concurrent submissions of the same code cannot both pass a find-then-
    // delete race. Freshness (the same age windows as findByCode) is enforced
    // in the same statement; stale codes stay until TTL cleanup but never
    // validate.
    const maxAgeMs =
      type === "reset" ? 3600_000 : type === "2fa" ? 5 * 60_000 : 24 * 3600_000;
    const cutoff = new Date(Date.now() - maxAgeMs)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");
    // Raw SQL: TypeORM's query-builder .returning() silently drops columns
    // that are not entity property names (account_id is only a join column),
    // so the atomic claim goes through the driver directly. repository.query
    // returns [rows, affected] for DML — unwrap both possible shapes.
    const result: any = await this.repository.query(
      "DELETE FROM account_confirm WHERE code = $1 AND type = $2 AND created_at > $3 RETURNING id, account_id, code, type",
      [code, type, cutoff],
    );
    const rows = Array.isArray(result?.[0]) ? result[0] : result;
    const raw = rows?.[0];
    if (!raw) {
      return null;
    }
    // The DELETE itself claimed the row, so the entity must be hydrated from
    // the RETURNING payload — findById would find nothing. Callers rely on
    // the account relation (username check, account.id), load it explicitly.
    const account = await this.repository.manager.findOne(AccountEntity, {
      where: { id: Number(raw.account_id) },
    });
    const entity = new AccountConfirmEntity();
    entity.id = Number(raw.id);
    entity.code = raw.code;
    entity.type = raw.type;
    entity.account = account;
    return entity;
  }
}
