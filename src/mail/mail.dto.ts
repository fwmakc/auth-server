import { IsEmail, IsString } from "class-validator";
import { CommonDto } from "@lms/common";

export class MailDto extends CommonDto {
  @IsEmail()
  from?: string;

  @IsEmail()
  to: string;

  @IsString()
  subject?: string;

  @IsString()
  text?: string;

  @IsString()
  html?: string;

  @IsString()
  template?: string;
}
