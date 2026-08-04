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
    protected readonly repository: Repository<AccountConfirmEntity>
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
    const now = new Date();
    const maxAge = type === "reset" ? 1 : 24;
    now.setHours(now.getHours() - maxAge);
    where.createdAt = MoreThan(now);
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
