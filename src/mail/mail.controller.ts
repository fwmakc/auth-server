import {
  Body,
  Controller,
  Headers,
  NotFoundException,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiExcludeController } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import { MailDto } from "./mail.dto";
import { MailService } from "./mail.service";

@ApiExcludeController()
@Controller("mail")
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService
  ) {}

  private verifyInternalKey(provided: string): boolean {
    const expected = this.configService.get("INTERNAL_API_KEY");
    if (!expected || !provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  @Post("send")
  @UseInterceptors(FilesInterceptor("file"))
  async send(
    @Headers("x-internal-api-key") internalKey: string,
    @Body("options") options: MailDto,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    if (!this.verifyInternalKey(internalKey)) {
      throw new NotFoundException();
    }
    return await this.mailService.send(options, files);
  }

  @Post("send_by_template")
  @UseInterceptors(FilesInterceptor("file"))
  async sendByTemplate(
    @Headers("x-internal-api-key") internalKey: string,
    @Body("options") options: MailDto,
    @Body("data") data: object,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    if (!this.verifyInternalKey(internalKey)) {
      throw new NotFoundException();
    }
    return await this.mailService.sendByTemplate(options, data, files);
  }
}
