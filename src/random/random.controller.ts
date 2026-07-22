import { Body, Controller, Get } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Account } from "api-server-toolkit";
import { RandomService } from "./random.service";

@ApiExcludeController()
@Controller("random")
export class RandomController {
  constructor(private readonly randomService: RandomService) {}

  @Get("random")
  @Account()
  random(
    @Body("min") min: number,
    @Body("max") max: number,
    @Body("step") step = 1
  ) {
    return this.randomService.random(min, max, step);
  }

  @Get("string")
  @Account()
  randomString(min, max = undefined, string = "") {
    return this.randomService.randomString(min, max, string);
  }

  @Get("set")
  @Account()
  randomSet(min, max = undefined, name = "") {
    return this.randomService.randomSet(min, max, name);
  }

  @Get("num")
  @Account()
  randomNum(min, max = undefined) {
    return this.randomService.randomNum(min, max);
  }

  @Get("bin")
  @Account()
  randomBin(min, max = undefined) {
    return this.randomService.randomBin(min, max);
  }

  @Get("hex")
  @Account()
  randomHex(min, max = undefined) {
    return this.randomService.randomHex(min, max);
  }

  @Get("array")
  @Account()
  randomArray(n, callback = (i) => i) {
    return this.randomService.randomArray(n, callback);
  }

  @Get("shuffle_array")
  @Account()
  shuffleArray([...array]) {
    return this.randomService.shuffleArray(array);
  }

  @Get("option")
  @Account()
  randomOption(...args) {
    return this.randomService.randomOption(...args);
  }

  @Get("email")
  @Account()
  randomEmail(min = 9, max = 30) {
    return this.randomService.randomEmail(min, max);
  }

  @Get("names")
  @Account()
  randomNames(words = 1) {
    return this.randomService.randomNames(words);
  }

  @Get("en_names")
  @Account()
  randomEnNames(words = 1) {
    return this.randomService.randomEnNames(words);
  }

  @Get("ru_names")
  @Account()
  randomRuNames(words = 1) {
    return this.randomService.randomRuNames(words);
  }
}
