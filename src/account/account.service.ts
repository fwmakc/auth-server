import { compare } from "bcryptjs";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { CommonService } from "api-server-toolkit";
import { RelationsDto } from "api-server-toolkit";
import { AccountDto } from "./account.dto";
import { AccountEntity } from "./account.entity";

@Injectable()
export class AccountService extends CommonService<AccountDto, AccountEntity> {
  constructor(
    @InjectRepository(AccountEntity)
    protected readonly repository: Repository<AccountEntity>
  ) {
    super();
  }

  async create(
    accountDto: AccountDto,
    relations: Array<RelationsDto> = undefined
  ): Promise<AccountEntity> {
    delete accountDto.isSuperuser;
    delete (accountDto as any).isDeleted;
    delete (accountDto as any).deletedAt;
    return await super.create(accountDto, relations);
  }

  async update(
    id: number,
    accountDto: AccountDto,
    relations: Array<RelationsDto> = undefined
  ): Promise<AccountEntity> {
    delete accountDto.isSuperuser;
    delete (accountDto as any).isDeleted;
    delete (accountDto as any).deletedAt;
    return await super.update(id, accountDto, relations);
  }

  async findByUsername(username: string): Promise<AccountEntity> {
    return await this.repository.findOneBy({ username });
  }

  async login(accountDto: AccountDto): Promise<AccountEntity> {
    const account = await this.findByUsername(accountDto.username);
    if (!account) {
      await compare(accountDto.password, "$2a$10$dummyhashvaluefornonexistentuser123456789012");
      throw new UnauthorizedException("Invalid credentials");
    }
    const isValidPassword = await compare(
      accountDto.password,
      account.password
    );
    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (!account.isActivated) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (account.isDeleted) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return account;
  }

  async hardDelete(id: number): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      await manager.query("DELETE FROM account_confirm WHERE account_id = $1", [id]);
      await manager.query("DELETE FROM clients WHERE account_id = $1", [id]);
      await manager.query("DELETE FROM users WHERE account_id = $1", [id]);
      await manager.query("DELETE FROM accounts WHERE id = $1", [id]);
    });
  }
}
