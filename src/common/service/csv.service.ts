import { createWriteStream, mkdirSync } from 'fs';
import * as converter from 'json-2-csv';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { ForbiddenException } from '@nestjs/common';

dotenv.config();

export class CsvService {
  batchSize;
  bind;
  converterOptions;
  filename;
  find;
  flattened;
  folder;
  limit;
  offset;
  service;

  constructor({ bind, find, service, filename }) {
    this.batchSize = 1000;
    this.bind = bind;
    this.flattened = {};
    this.folder = 'csv';
    this.service = service;

    this.setConverterOptions();
    this.setFilename(filename);
    this.makeFolder();
    this.setFind(find);
  }

  setConverterOptions() {
    this.converterOptions = {
      delimiter: {
        field: ';',
        wrap: '"',
        eol: '\r\n',
      },
      escapeHeaderNestedDots: false,
      excelBOM: true,
      expandNestedObjects: false,
      expandArrayObjects: false,
      prependHeader: true,
      trimFieldValues: true,
      trimHeaderFields: true,
      useLocaleFormat: true,
      unwindArrays: false,
    };
  }

  makeFolder() {
    if (!this.folder) {
      return;
    }

    const path = join(process.env.UPLOADS_PATH, this.folder);

    try {
      mkdirSync(path, { recursive: true });
    } catch (err) {
      throw new ForbiddenException(`Error creating directory: ${err.message}`);
    }
  }

  setFilename(filename) {
    const now = new Date();
    const name = filename
      ? `${filename}.`.replace(/[^0-9A-Za-zА-Яа-я_.-]/giu, '_')
      : '';
    const datetime = now.toISOString().slice(0, 19).replace(/\D/giu, '-');
    this.filename = `${name}${datetime}.csv`;
  }

  setFind(find) {
    this.find = find;
    this.limit = find.limit;
    this.offset = find.offset;

    this.find.limit = undefined;
    this.find.offset = undefined;
  }

  async getEntries(limit, offset) {
    const find = {
      ...this.find,
      limit,
      offset,
    };
    return await this.service.find(find, this.bind);
  }

  async execute() {
    const startedAt = Date.now();

    const path = join(process.env.UPLOADS_PATH, this.folder, this.filename);
    const url = `${process.env.UPLOADS_URL}${
      this.folder ? `/${this.folder}` : ''
    }/${this.filename}`;

    const result = await this.exportToCSV(path);

    const finishAt = Date.now();

    return {
      ...result,
      duration: `${(finishAt - startedAt) / 1000}sec`,
      message: 'CSV file creation completed',
      url,
    };
  }

  async exportToCSV(filePath: string) {
    const writeStream = createWriteStream(filePath, {
      flags: 'w',
    });

    writeStream.on('error', (err) => {
      writeStream.end();
      throw new ForbiddenException(`Error writing to file: ${err.message}`);
    });

    let batchSize = this.batchSize;
    let offset = this.offset || 0;
    let hasMoreData = true;
    let entriesCount = 0;
    let requestsCount = 0;

    while (hasMoreData) {
      const entriesRemaind = this.limit - entriesCount;
      if (entriesRemaind > 0 && entriesRemaind < batchSize) {
        batchSize = entriesRemaind;
      }

      const entries = await this.getEntries(batchSize, offset);
      entriesCount += entries?.length;

      if (!entries?.length) {
        hasMoreData = false;
      } else {
        const json = this.flattenBatch(entries);
        const csv = this.prepareCsv(json);

        writeStream.write(csv + '\r\n', (err) => {
          if (err) {
            writeStream.end();
            throw new ForbiddenException(`Error during write: ${err.message}`);
          }
        });

        if (this.limit && entriesCount >= this.limit) {
          hasMoreData = false;
        }

        offset += batchSize;
        requestsCount += 1;
      }
    }

    writeStream.end();

    return {
      success: !hasMoreData,
      entries: entriesCount,
      requests: requestsCount,
    };
  }

  flatten(obj, parentKey = '') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = parentKey ? `${parentKey}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (Array.isArray(obj[key])) {
            obj[key].forEach((item, index) => {
              this.flatten(item, `${newKey}.${index}`);
            });
          } else {
            this.flatten(obj[key], newKey);
          }
        } else {
          this.flattened[newKey] = obj[key];
        }
      }
    }
  }

  flattenEntrie(entrie) {
    this.flattened = {};
    this.flatten(entrie);
    return this.flattened;
  }

  flattenBatch(batch) {
    const json = [];

    for (const entrie of batch) {
      const flattened = this.flattenEntrie(entrie);
      json.push(flattened);
    }

    return json;
  }

  prepareCsv(json) {
    return converter.json2csv(json, this.converterOptions);
  }
}
