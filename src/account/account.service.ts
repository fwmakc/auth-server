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
    return await super.create(accountDto, relations);
  }

  async update(
    id: number,
    accountDto: AccountDto,
    relations: Array<RelationsDto> = undefined
  ): Promise<AccountEntity> {
    delete accountDto.isSuperuser;
    return await super.update(id, accountDto, relations);
  }

  async findByUsername(username: string): Promise<AccountEntity> {
    return await this.repository.findOneBy({ username });
  }

  async login(accountDto: AccountDto): Promise<AccountEntity> {
    const account = await this.findByUsername(accountDto.username);
    if (!account) {
      throw new UnauthorizedException("User not found");
    }
    const isValidPassword = await compare(
      accountDto.password,
      account.password
    );
    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid password");
    }
    if (!account.isActivated) {
      throw new UnauthorizedException("Not activated");
    }
    return account;
  }
}
