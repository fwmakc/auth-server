import { v4 } from "uuid";
import { FindOptionsWhere, MoreThan, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { hash } from "@src/common/service/crypt.service";
import { RandomService } from "@src/random/random.service";
import { AccountConfirmEntity } from "./account_confirm.entity";

@Injectable()
export class AccountConfirmService {
  constructor(
    @InjectRepository(AccountConfirmEntity)
    protected readonly repository: Repository<AccountConfirmEntity>,
    protected readonly randomService: RandomService
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
    if (type === "reset") {
      const now = new Date();
      now.setHours(now.getHours() - 1);
      where.createdAt = MoreThan(now);
    }
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
      code: `${v4()}-${hash(account.id)}`,
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
    const code = this.randomService.randomNum(6);
    const exists = await this.findByCode(code);
    if (exists) {
      return await this.generate(account);
    }
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
