import { Injectable } from "@nestjs/common";
import { genSalt, hash } from "bcryptjs";

@Injectable()
export class HashAccountHandler {
  async generate(password: string): Promise<string> {
    const salt = await genSalt(10);
    const passwordHashed = await hash(password, salt);
    return passwordHashed;
  }
}
