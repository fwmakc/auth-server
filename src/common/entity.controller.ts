import {
  Body,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Post,
  Patch,
  applyDecorators,
} from '@nestjs/common';
import { BaseEntity } from 'typeorm';
import { RelationsDto } from '@src/common/dto/relations.dto';
import { Data, Doc } from '@src/common/common.decorator';
import { CommonService } from '@src/common/common.service';
import { CommonDto } from '@src/common/common.dto';
import { ApiTags } from '@nestjs/swagger';
import { AccountDto } from '@src/account/account.dto';
import { Account, Self } from '@src/account/account.decorator';
import { bind } from '@src/common/service/bind.service';
import { PermissionRegistry } from '@src/common/permission.registry';
import {
  EntityControllerOptions,
  OperationAccess,
  normalizeAccess,
  getBindPath,
} from '@src/common/access.type';
import { BindDto } from '@src/common/dto/bind.dto';

function resolveBind(
  access: OperationAccess,
  account: AccountDto,
  accountTable: string,
  accountField: string,
): BindDto | undefined {
  const level = normalizeAccess(access);
  if (level === 'owner') {
    const bindPath = getBindPath(access, accountTable || 'account');
    return bind(account, {
      name: bindPath,
      key: accountField,
      allow: account?.isSuperuser,
    });
  }
  if (level === 'admin') {
    if (!account?.isSuperuser) {
      throw new ForbiddenException('You have no rights!');
    }
    return { allow: true };
  }
  return undefined;
}

function guard(access: OperationAccess) {
  return normalizeAccess(access) === 'public' ? Account('noBlock') : Account();
}

function route(
  access: OperationAccess,
  method: MethodDecorator,
  docName: string,
  dto?: any,
): MethodDecorator {
  const level = normalizeAccess(access);
  if (level === 'closed') return applyDecorators();
  const decs: any[] = [guard(access), method];
  if (docName) decs.push(Doc(docName, dto));
  return applyDecorators(...decs);
}

export const EntityController = (options: EntityControllerOptions) => {
  const { name, dto, entity } = options;
  const accountTable = options.accountTable ?? '';
  const accountField = options.accountField ?? 'id';

  const readAccess = options.operations?.read ?? 'public';
  const createAccess = options.operations?.create ?? 'public';
  const updateAccess = options.operations?.update ?? 'public';
  const deleteAccess = options.operations?.delete ?? 'public';

  PermissionRegistry.set(entity, {
    create: createAccess,
    read: readAccess,
    update: updateAccess,
    delete: deleteAccess,
  });

  const readRoute = route(readAccess, Get('find'), 'find', dto);
  const readFirstRoute = route(readAccess, Get('find/first'), 'findFirst', dto);
  const readManyRoute = route(
    readAccess,
    Get('find/many/:ids'),
    'findMany',
    dto,
  );
  const readOneRoute = route(readAccess, Get('find/:id'), 'findOne', dto);
  const countRoute = route(readAccess, Get('count'), 'count', dto);
  const selfRoute = route(readAccess, Get('self'), 'self', dto);
  const createRoute = route(createAccess, Post('create'), 'create', dto);
  const updateRoute = route(updateAccess, Patch('update/:id'), 'update', dto);
  const removeRoute = route(deleteAccess, Delete('remove/:id'), 'remove');
  const sortRoute = route(
    updateAccess,
    Post('position/sort'),
    'sortPosition',
    dto,
  );
  const moveRoute = route(
    updateAccess,
    Post('position/move/:id'),
    'movePosition',
    dto,
  );

  const hasSelf = normalizeAccess(readAccess) === 'owner';
  const selfDecorator = hasSelf ? selfRoute : applyDecorators();

  @ApiTags(name)
  class BaseEntityController<
    Dto extends CommonDto,
    Entity extends BaseEntity,
    Service extends CommonService<Dto, Entity>,
  > {
    readonly service: Service;

    @selfDecorator
    async self(
      @Data('select') select: object,
      @Data('where') where: object,
      @Data('order') order: object,
      @Data('relations') relations: Array<RelationsDto>,
      @Self('noBlock') account: AccountDto,
    ): Promise<Entity[]> {
      const b = bind(account, {
        name: accountTable || 'account',
        key: accountField,
        allow: false,
      });
      return await this.service.find({ where, select, order, relations }, b);
    }

    @readRoute
    async find(
      @Data('search') search: object,
      @Data('select') select: object,
      @Data('where') where: object,
      @Data('order') order: object,
      @Data('limit') limit: number = undefined,
      @Data('offset') offset: number = undefined,
      @Data('relations') relations: Array<RelationsDto>,
      @Self('noBlock') account: AccountDto,
    ): Promise<Entity[]> {
      const b = resolveBind(readAccess, account, accountTable, accountField);
      return await this.service.find(
        { search, select, where, order, limit, offset, relations },
        b,
      );
    }

    @readFirstRoute
    async findFirst(
      @Data('search') search: object,
      @Data('select') select: object,
      @Data('where') where: object,
      @Data('order') order: object,
      @Data('relations') relations: Array<RelationsDto>,
      @Self('noBlock') account: AccountDto,
    ): Promise<Entity> {
      const b = resolveBind(readAccess, account, accountTable, accountField);
      return await this.service.findFirst(
        { search, select, where, order, relations },
        b,
      );
    }

    @readManyRoute
    async findMany(
      @Param('ids', new ParseArrayPipe({ items: Number, separator: ',' }))
      ids: Array<number>,
      @Data('select') select: object,
      @Data('relations') relations: Array<RelationsDto>,
      @Self('noBlock') account: AccountDto,
    ): Promise<Entity[]> {
      const b = resolveBind(readAccess, account, accountTable, accountField);
      const result = await this.service.findMany({ ids, select, relations }, b);
      if (!result) {
        throw new NotFoundException('Entrie not found');
      }
      return result;
    }

    @readOneRoute
    async findOne(
      @Param('id', ParseIntPipe) id: number,
      @Data('select') select: object,
      @Data('relations') relations: Array<RelationsDto>,
      @Self('noBlock') account: AccountDto,
    ): Promise<Entity> {
      const b = resolveBind(readAccess, account, accountTable, accountField);
      const result = await this.service.findOne(
        { id: Number(id), select, relations },
        b,
      );
      if (!result) {
        throw new NotFoundException('Entrie not found');
      }
      return result;
    }

    @countRoute
    async count(
      @Data('where') where: object,
      @Data('limit') limit: number = undefined,
      @Data('offset') offset: number = undefined,
      @Data('relations') relations: Array<RelationsDto>,
      @Self('noBlock') account: AccountDto,
    ): Promise<number> {
      const b = resolveBind(readAccess, account, accountTable, accountField);
      return await this.service.count({ where, limit, offset, relations }, b);
    }

    @createRoute
    async create(
      @Body('create') dto: Dto,
      @Body('relations') relations: Array<RelationsDto>,
      @Self('noBlock') account: AccountDto,
    ): Promise<Entity> {
      const b = resolveBind(createAccess, account, accountTable, accountField);
      return await this.service.create(dto, relations, b);
    }

    @updateRoute
    async update(
      @Param('id', ParseIntPipe) id: number,
      @Body('update') dto: Dto,
      @Body('relations') relations: Array<RelationsDto>,
      @Self('noBlock') account: AccountDto,
    ): Promise<Entity> {
      const b = resolveBind(updateAccess, account, accountTable, accountField);
      const result = await this.service.update(Number(id), dto, relations, b);
      if (!result) {
        throw new NotFoundException('Entrie not found');
      }
      return result;
    }

    @removeRoute
    async remove(
      @Param('id', ParseIntPipe) id: number,
      @Self('noBlock') account: AccountDto,
    ): Promise<boolean> {
      const b = resolveBind(deleteAccess, account, accountTable, accountField);
      return await this.service.remove(id, b);
    }

    @sortRoute
    async sortPosition(
      @Data('field') field: string,
      @Data('select') select: object,
      @Data('where') where: object,
      @Data('order') order: object,
      @Data('limit') limit: number = undefined,
      @Data('offset') offset: number = undefined,
      @Data('relations') relations: Array<RelationsDto>,
      @Self('noBlock') account: AccountDto,
    ): Promise<boolean> {
      const b = resolveBind(updateAccess, account, accountTable, accountField);
      const result = await this.service.sortPosition(
        field,
        { select, where, order, limit, offset, relations },
        b,
      );
      if (!result) {
        throw new NotFoundException('Entries not found');
      }
      return result;
    }

    @moveRoute
    async movePosition(
      @Param('id', ParseIntPipe) id: number,
      @Data('field') field: string,
      @Data('position') position: number = undefined,
      @Self('noBlock') account: AccountDto,
    ): Promise<boolean> {
      const b = resolveBind(updateAccess, account, accountTable, accountField);
      const result = await this.service.movePosition(id, field, position, b);
      if (!result) {
        throw new NotFoundException('Entrie position has not been moved');
      }
      return result;
    }
  }

  return BaseEntityController;
};
