import { BadRequestException } from '@nestjs/common';
import {
  And,
  BaseEntity,
  DeepPartial,
  EntityTarget,
  FindOptionsOrder,
  FindOptionsWhere,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { RelationsDto } from '@src/common/dto/relations.dto';
import { relationsOrder } from '@src/common/service/relations.service';
import { CommonDto } from '@src/common/common.dto';
import { FindDto } from './dto/find.dto';
import { FindManyDto } from './dto/find_many.dto';
import { FindOneDto } from './dto/find_one.dto';
import { parseWhereObject } from './service/where.service';
import {
  removePrivateFields,
  stripWriteFields,
} from './service/private_fields.service';
import { sanitizeForSave } from './service/sanitize.service';
import { searchService } from './service/search.service';
import { bind } from './service/bind.service';
import { CsvService } from './service/csv.service';
import { BindDto } from './dto/bind.dto';

export class CommonService<Dto extends CommonDto, Entity extends BaseEntity> {
  protected readonly repository: Repository<Entity>;

  async find(
    find: FindDto = {},
    bind: BindDto = { allow: true },
  ): Promise<Entity[]> {
    const {
      relations,
      limit: take,
      offset: skip,
      search,
      ...otherParams
    } = find;

    const { id, name, key = 'id', allow } = bind;

    let where = parseWhereObject(find.where);
    // "username.not.like": "%user%"
    // "username.and.not.like": ["%user1%", "%user2%"]

    if (id !== undefined && !allow) {
      const bindValue = { [key]: id };
      if (name.includes('.')) {
        const segments = name.split('.');
        let nested: any = bindValue;
        for (let i = segments.length - 1; i >= 0; i--) {
          nested = { [segments[i]]: nested };
        }
        where = { ...where, ...nested };
      } else {
        where = { ...where, [name]: bindValue };
      }
    }

    const relationNames = relations?.map((i) => i.name) || [];
    if (
      id !== undefined &&
      !name.includes('.') &&
      !relationNames.includes(name)
    ) {
      relationNames.push(name);
    }

    const params = {
      ...otherParams,
      relations: relationNames.length > 0 ? relationNames : undefined,
      where,
      take: take || undefined,
      skip: skip || undefined,
    };

    try {
      let result;

      result = await this.repository.find(params);
      result = relationsOrder(result, relations);

      if (search) {
        result = result
          .map((i) => {
            const contains = searchService(i, search);
            return contains ? i : false;
          })
          .filter(Boolean);
      }

      if (id !== undefined && !allow && name.includes('.')) {
        const seen = new Set();
        result = result.filter((item: any) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      }

      result = removePrivateFields(result, bind);
      return result;
    } catch (e) {
      this.error(e);
    }
  }

  async findFirst(
    find: FindDto,
    bind: BindDto = { allow: true },
  ): Promise<Entity> {
    const [result] = await this.find(
      {
        ...find,
        limit: 1,
      },
      bind,
    );
    return result;
  }

  async findMany(
    findMany: FindManyDto,
    bind: BindDto = { allow: true },
  ): Promise<Entity[]> {
    const { ids, ...find } = findMany;
    const order: FindOptionsOrder<any> = { id: 'ASC' };
    const where: FindOptionsWhere<any> = {
      id: In(ids?.map((i) => Number(i) || 0)),
    };
    return await this.find(
      {
        ...find,
        order,
        where,
        limit: 0,
        offset: 0,
      },
      bind,
    );
  }

  async findOne(
    findOne: FindOneDto,
    bind: BindDto = { allow: true },
  ): Promise<Entity> {
    const { id, ...find } = findOne;
    const where: FindOptionsWhere<any> = { ...find.where, id };
    const [result] = await this.find(
      {
        ...find,
        where,
        limit: 1,
        offset: 0,
      },
      bind,
    );
    return result;
  }

  async count(find: FindDto, bind: BindDto = { allow: true }): Promise<number> {
    find.select = { id: true };
    const result = await this.find(find, bind);
    return result && Array.isArray(result) ? result.length : 0;
  }

  async countDistinct(field: string, find: FindDto): Promise<number> {
    const qb = this.repository.createQueryBuilder('t');

    const where = parseWhereObject(find.where);
    if (where) qb.where(where);

    const result = await qb
      .select(`COUNT(DISTINCT t.${field})`, 'count')
      .getRawOne();

    return Number(result?.count || 0);
  }

  async csv(
    find: FindDto,
    filename: string,
    bind: BindDto = { allow: true },
  ): Promise<any> {
    const csvService = new CsvService({
      service: this,
      find,
      bind,
      filename,
    });

    return csvService.execute();
  }

  async create(
    dto: Dto,
    relations: Array<RelationsDto> = undefined,
    bind: BindDto = { allow: true },
  ): Promise<Entity> {
    // next this columns from bind
    delete dto.id;
    // delete dto.createdAt;
    // delete dto.updatedAt;

    if (bind.id !== undefined) {
      const relationName = bind.name || 'account';
      if (!relationName.includes('.')) {
        const resolvedId = await this.resolveBindRelationId(bind);
        if (resolvedId !== null) {
          dto[relationName] = { id: resolvedId };
        }
      }
    }

    const entity: DeepPartial<any> = { ...dto };

    stripWriteFields(entity, this.repository.metadata.target, bind);
    sanitizeForSave(entity, this.repository.metadata, bind);

    try {
      const { id } = await this.createEntity(entity);
      return await this.findOne(
        {
          id,
          relations,
        },
        bind,
      );
    } catch (e) {
      this.error(e);
    }
  }

  async createEntity(entity: DeepPartial<any>): Promise<any> {
    return await this.repository.save(entity);
  }

  getUniqueColumns(): Array<string> {
    const uniques: Array<string> = [];
    this.repository.metadata.indices.forEach((index) => {
      if (index.isUnique) {
        const name = index.columns?.[0]?.propertyName;
        if (name) {
          uniques.push(name);
        }
      }
    });
    return uniques;
  }

  async findUniqueEntrie(entity: DeepPartial<any>): Promise<any> {
    const uniques = this.getUniqueColumns();
    if (uniques.length === 0) {
      return null;
    }

    const where = uniques
      .filter((field) => entity[field] !== undefined && entity[field] !== null)
      .map((field) => ({ [field]: entity[field] }));

    if (where.length === 0) {
      return null;
    }

    return await this.repository.findOne({
      select: { id: true } as any,
      where: where as any,
    });
  }

  async upsert(
    dto: Dto,
    relations: Array<RelationsDto> = undefined,
    bind: BindDto = { allow: true },
  ): Promise<Entity> {
    delete dto.id;

    const entity: DeepPartial<any> = { ...dto };

    if (bind.id !== undefined) {
      const relationName = bind.name || 'account';
      if (!relationName.includes('.')) {
        const resolvedId = await this.resolveBindRelationId(bind);
        if (resolvedId !== null) {
          entity[relationName] = { id: resolvedId };
        }
      }
    }

    const existsEntrie = await this.findUniqueEntrie(entity);

    if (existsEntrie?.id) {
      return await this.update(existsEntrie.id, dto, relations, bind);
    }

    return await this.create(dto, relations, bind);
  }

  async update(
    id: number,
    dto: Dto,
    relations: Array<RelationsDto> = undefined,
    bind: BindDto = { allow: true },
  ): Promise<Entity> {
    if (id === undefined) {
      return;
    }

    const select = { id: true };
    const find = await this.findOne({ id, select, relations }, bind);
    if (!find) {
      return;
    }

    // next from bind
    // delete dto.createdAt;
    // delete dto.updatedAt;

    const entity: DeepPartial<any> = { ...dto, id };

    stripWriteFields(entity, this.repository.metadata.target, bind);
    sanitizeForSave(entity, this.repository.metadata, bind);

    try {
      await this.updateEntity(entity);
      return await this.findOne(
        {
          id,
          relations,
        },
        bind,
      );
    } catch (e) {
      this.error(e);
    }
  }

  async updateEntity(entity: DeepPartial<any>): Promise<any> {
    const idType = this.getIdType();
    entity.id = idType === 'bigint' ? `${entity.id}` : +entity.id;
    return await this.repository.save(entity);
  }

  getIdType(): string {
    const column: DeepPartial<any> = this.repository.metadata.columns.find(
      (column) => column.propertyName === 'id',
    );
    return column?.type || 'int';
  }

  private async resolveBindRelationId(
    bind: BindDto,
  ): Promise<number | string | null> {
    const key = bind.key || 'id';
    if (key === 'id') {
      return bind.id;
    }
    const name = bind.name || 'account';
    const segments = name.split('.');
    let currentMetadata = this.repository.metadata;
    for (const segment of segments) {
      const relation = currentMetadata.relations.find(
        (r) => r.propertyName === segment,
      );
      if (!relation) {
        return null;
      }
      currentMetadata = relation.inverseEntityMetadata;
    }
    const relatedRepo = this.repository.manager.getRepository(
      currentMetadata.target,
    );
    const related = await relatedRepo.findOne({
      where: { [key]: bind.id } as any,
    });
    return related ? related.id : null;
  }

  async remove(id: number, bind: BindDto = { allow: true }): Promise<boolean> {
    if (bind.id !== undefined && !bind.allow) {
      const find = await this.findOne({ id, select: { id: true } }, bind);
      if (!find) {
        return false;
      }
    }
    try {
      const result = await this.repository.delete(id);
      return !!result?.affected;
    } catch (e) {
      this.error(e);
    }
  }

  async sortPosition(
    field: string,
    find: FindDto,
    bind: BindDto = { allow: true },
  ): Promise<boolean> {
    this.validatePositionField(field);

    if (!find.order) {
      find.order = { [field]: 'asc', id: 'asc' } as FindOptionsOrder<any>;
    }

    const entries = await this.find(find, bind);

    if (!entries) {
      return;
    }

    if (typeof entries?.[0]?.[field] !== 'number') {
      this.error({ message: 'cannot position by non-numeric field' });
    }

    try {
      await this.repository.manager.transaction(
        async (transactionalManager) => {
          const entityTarget: EntityTarget<Entity> = this.repository.target;

          if (find.where) {
            let resetWhere = parseWhereObject(find.where);
            if (bind.id !== undefined) {
              const resolvedId = await this.resolveBindRelationId(bind);
              resetWhere = {
                ...resetWhere,
                [bind.name || 'account']:
                  resolvedId !== null
                    ? { id: resolvedId }
                    : { [bind.key || 'id']: bind.id },
              };
            }
            if (Object.keys(resetWhere).length > 0) {
              await transactionalManager.update(entityTarget, resetWhere, {
                [field]: 0,
              } as DeepPartial<any>);
            }
          }

          entries.forEach((entrie, index) => {
            entrie[field] = index + 1;
          });

          await transactionalManager.save(entityTarget, entries);
        },
      );

      return true;
    } catch (e) {
      this.error(e);
    }
  }

  async movePosition(
    id: number,
    field: string,
    position: number,
    bind: BindDto = { allow: true },
  ): Promise<boolean> {
    this.validatePositionField(field);

    if (position === undefined || position === null) {
      return false;
    }

    const entrie = await this.findOne(
      {
        id,
        select: {
          [field]: true,
        },
      },
      bind,
    );

    if (!entrie) {
      return false;
    }

    if (typeof entrie[field] !== 'number') {
      this.error({ message: 'cannot position by non-numeric field' });
    }

    const lastEntrie: DeepPartial<any> = await this.findFirst(
      {
        select: {
          id: true,
          [field]: true,
        },
        order: {
          [field]: 'DESC',
        },
      },
      bind,
    );

    const lastPosition = +lastEntrie?.[field] || 0;

    if (position < 0 || position > lastPosition + 1) {
      if (+id === +lastEntrie?.id) {
        return false;
      }
      position = lastPosition + 1;
    }

    try {
      const oldPosition = +entrie[field] || 0;
      const newPosition = +position || 0;

      if (oldPosition === newPosition) {
        return false;
      }

      await this.repository.manager.transaction(
        async (transactionalManager) => {
          const entityTarget: EntityTarget<Entity> = this.repository.target;

          const updateEntries: DeepPartial<any> = {
            [field]: () =>
              oldPosition > newPosition ? `${field} + 1` : `${field} - 1`,
          };

          const whereEntries: DeepPartial<any> = {
            [field]:
              oldPosition > newPosition
                ? And(MoreThanOrEqual(newPosition), LessThan(oldPosition))
                : And(MoreThan(oldPosition), LessThanOrEqual(newPosition)),
          };

          await transactionalManager.update(
            entityTarget,
            whereEntries,
            updateEntries,
          );

          const updateCurrentEntrie: DeepPartial<any> = {
            [field]: newPosition,
          };
          await transactionalManager.update(
            entityTarget,
            id,
            updateCurrentEntrie,
          );
        },
      );

      return true;
    } catch (e) {
      this.error(e);
    }
  }

  bind(entrie, data) {
    return bind(entrie, data);
  }

  private validatePositionField(field: string) {
    if (!field || typeof field !== 'string') {
      throw new BadRequestException('Field name is required');
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
      throw new BadRequestException(`Invalid field name: ${field}`);
    }
    const primaryColumns = this.repository.metadata.primaryColumns.map(
      (c) => c.propertyName,
    );
    if (primaryColumns.includes(field)) {
      throw new BadRequestException(`Cannot sort by primary key: ${field}`);
    }
    const columnNames = this.repository.metadata.columns.map(
      (c) => c.propertyName,
    );
    if (!columnNames.includes(field)) {
      throw new BadRequestException(`Unknown field: ${field}`);
    }
  }

  error(e) {
    throw new BadRequestException(`Incorrect request conditions: ${e.message}`);
  }
}
