import { Injectable } from "@nestjs/common";
import { genSalt, hash } from "bcryptjs";

@Injectable()
export class HashAccountHandler {
  async generate(password: string): Promise<string> {
    const salt = await genSalt(10);
    const passwordHashed = await hash(password, salt);
    return passwordHashed;
  }

  /**
   * bcrypt той же стоимости, что реальная проверка пароля: выравнивает
   * тайминги ответов там, где проверять нечего (reset несуществующего
   * аккаунта) — иначе время ответа выдаёт существование аккаунта.
   */
  async dummyHash(): Promise<string> {
    return this.generate("dummy");
  }
}
