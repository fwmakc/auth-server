import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommonService } from '@src/common/common.service';
import { encrypt, decrypt } from '@src/common/service/crypt.service';
import { FindDto } from '@src/common/dto/find.dto';
import { FindManyDto } from '@src/common/dto/find_many.dto';
import { FindOneDto } from '@src/common/dto/find_one.dto';
import { RelationsDto } from '@src/common/dto/relations.dto';
import { AccountStrategiesDto } from './account_strategies.dto';
import { AccountStrategiesEntity } from './account_strategies.entity';
import { BindDto } from '@src/common/dto/bind.dto';

@Injectable()
export class AccountStrategiesService extends CommonService<
  AccountStrategiesDto,
  AccountStrategiesEntity
> {
  constructor(
    @InjectRepository(AccountStrategiesEntity)
    protected readonly repository: Repository<AccountStrategiesEntity>,
  ) {
    super();
  }

  async find(
    find: FindDto,
    bind: BindDto = { allow: true },
  ): Promise<AccountStrategiesEntity[]> {
    const result = await super.find(find, bind);
    return await this.decodeEntries(result);
  }

  async findFirst(
    find: FindDto,
    bind: BindDto = { allow: true },
  ): Promise<AccountStrategiesEntity> {
    const result = await super.findFirst(find, bind);
    return await this.decodeTokens(result);
  }

  async findMany(
    find: FindManyDto,
    bind: BindDto = { allow: true },
  ): Promise<AccountStrategiesEntity[]> {
    const result = await super.findMany(find, bind);
    return await this.decodeEntries(result);
  }

  async findOne(
    find: FindOneDto,
    bind: BindDto = { allow: true },
  ): Promise<AccountStrategiesEntity> {
    const result = await super.findOne(find, bind);
    return await this.decodeTokens(result);
  }

  async encodeTokens(
    authStrategiesDto: AccountStrategiesDto,
  ): Promise<AccountStrategiesDto> {
    if (authStrategiesDto?.accessToken) {
      const accessToken = await encrypt(authStrategiesDto.accessToken);
      authStrategiesDto.accessToken = JSON.stringify(accessToken);
    }
    if (authStrategiesDto?.refreshToken) {
      const refreshToken = await encrypt(authStrategiesDto.refreshToken);
      authStrategiesDto.refreshToken = JSON.stringify(refreshToken);
    }
    return authStrategiesDto;
  }

  async decodeTokens(
    authStrategiesDto: AccountStrategiesEntity,
  ): Promise<AccountStrategiesEntity> {
    if (authStrategiesDto?.accessToken) {
      try {
        const { encrypted, iv } = JSON.parse(authStrategiesDto.accessToken);
        authStrategiesDto.accessToken = await decrypt(encrypted, iv);
      } catch {}
    }
    if (authStrategiesDto?.refreshToken) {
      try {
        const { encrypted, iv } = JSON.parse(authStrategiesDto.refreshToken);
        authStrategiesDto.refreshToken = await decrypt(encrypted, iv);
      } catch {}
    }
    return authStrategiesDto;
  }

  async decodeEntries(
    authStrategiesDto: Array<AccountStrategiesEntity>,
  ): Promise<AccountStrategiesEntity[]> {
    for await (const [index, item] of authStrategiesDto.entries()) {
      authStrategiesDto[index] = await this.decodeTokens(item);
    }
    return authStrategiesDto;
  }

  async updateBy(
    authStrategiesDto: AccountStrategiesDto,
    relations: Array<RelationsDto> = undefined,
  ): Promise<AccountStrategiesEntity> {
    authStrategiesDto = await this.encodeTokens(authStrategiesDto);
    const strategy = await this.findFirst({
      where: {
        uid: authStrategiesDto.uid,
        name: authStrategiesDto.name,
        account: {
          id: authStrategiesDto.account.id,
        },
      },
    });
    if (!strategy) {
      return await this.create(authStrategiesDto, relations);
    }
    return await this.update(strategy.id, authStrategiesDto, relations, {
      allow: true,
    });
  }

  async removeBy(authStrategiesDto: AccountStrategiesDto): Promise<boolean> {
    const strategy = await this.findFirst({ where: authStrategiesDto });
    if (!strategy) {
      return;
    }
    return await this.remove(strategy.id);
  }
}
