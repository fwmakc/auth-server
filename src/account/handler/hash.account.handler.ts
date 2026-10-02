import { Injectable } from "@nestjs/common";
// @node-rs/bcrypt: native (Rust) bcrypt off the event loop — the pure-JS
// bcryptjs blocked the loop ~100–300 ms per verify and, under login storms,
// starved pooled pg connections into QueryRunnerAlreadyReleased 500s
// (cost-12 storm: 2–3.4% of logins failed). Call shape: hash(input, cost?,
// salt?) — cost goes directly, genSalt is gone.
import { hash } from "@node-rs/bcrypt";

@Injectable()
export class HashAccountHandler {
  async generate(password: string): Promise<string> {
    // cost 10 stays the project constant (see AGENTS.md)
    return hash(password, 10);
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
