import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { OpenAccountDto } from "@src/account/dto/open.account.dto";
import { ClientsDto } from "@src/clients/clients.dto";
import { ClientsEntity } from "@src/clients/clients.entity";
import { ClientsService } from "@src/clients/clients.service";
import { TokenService } from "@src/token/token.service";

@Injectable()
export class OpenAccountService {
  private readonly hmacSecret: string;
  private readonly logger = new Logger(OpenAccountService.name);

  constructor(
    private readonly clientsService: ClientsService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService
  ) {
    this.hmacSecret =
      this.configService.get<string>("CODE_HMAC_SECRET") ||
      this.configService.get<string>("AES_SECRET") ||
      "";
    if (!this.hmacSecret) {
      this.logger.warn(
        "CODE_HMAC_SECRET / AES_SECRET not set — using ephemeral random key. " +
        "Authorization codes will not survive restart. Set a secret in production."
      );
      this.hmacSecret = require("crypto").randomBytes(32).toString("hex");
    }
  }

  private signCode(data: object): string {
    const payload = Buffer.from(JSON.stringify(data)).toString("base64");
    const signature = createHmac("sha256", this.hmacSecret)
      .update(payload)
      .digest("base64url");
    return `${payload}.${signature}`;
  }

  private verifyCodeSignature(code: string): object {
    const [payload, signature] = code.split(".");
    if (!payload || !signature) {
      throw new BadRequestException("Invalid authorization code format");
    }
    const expected = createHmac("sha256", this.hmacSecret)
      .update(payload)
      .digest("base64url");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new BadRequestException("Invalid authorization code signature");
    }
    try {
      return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    } catch {
      throw new BadRequestException("Malformed authorization code");
    }
  }

  async code(
    clientsDto: ClientsDto,
    id: number,
    state: string
  ): Promise<string> {
    const updated = await this.codeGenerate({ ...clientsDto }, id);
    const [{ uri }] = clientsDto.redirects;
    if (!updated) {
      throw new BadRequestException(
        "Client authentication failed. Unknown client [code.open.account.service]",
        "invalid_client"
      );
    }
    return `${uri}?code=${updated.code}&client_id=${updated.client_id}${
      state ? `&state=${state}` : ""
    }`;
  }

  async token(
    clientsDto: ClientsDto,
    id: number,
    state: string
  ): Promise<string> {
    const [{ uri }] = clientsDto.redirects;
    delete (clientsDto as any).account;
    delete clientsDto.redirects;
    const token = await this.tokenService.pair({ id });
    if (!token) {
      throw new BadRequestException(
        "Client authentication failed. Unknown client [token.open.account.service]",
        "invalid_client"
      );
    }
    return `${uri}?token_type=Bearer&expires_in=${token.expires_in}${
      state ? `&state=${state}` : ""
    }#access_token=${token.access_token}`;
  }

  async verify(openAccountDto: OpenAccountDto): Promise<ClientsDto> {
    const { client_id, redirect_uri, response_type } = openAccountDto;
    if (response_type !== "code") {
      throw new BadRequestException(
        "Specified type of response_type field is not supported in this request. Use 'code'.",
        "invalid_request"
      );
    }
    const result = await this.clientsService.clientsGetWhere(
      {
        client_id,
        redirects: {
          uri: redirect_uri,
        },
      },
      [{ name: "account" }, { name: "redirects" }]
    );
    if (!result || !result.redirects.length) {
      throw new BadRequestException(
        "Client authentication failed. Unknown client [verify.open.account.service]",
        "invalid_client"
      );
    }
    return result;
  }

  async codeGenerate(
    clientsDto: ClientsDto,
    id: number
  ): Promise<ClientsEntity> {
    const data = {
      timestamp: Date.now(),
      id,
      client_id: clientsDto.client_id,
      redirect_uri: clientsDto.redirect_uri,
    };
    const code = this.signCode(data);

    clientsDto.code = code;
    delete (clientsDto as any).account;
    delete clientsDto.redirects;
    return await this.clientsService.update(
      clientsDto.id,
      clientsDto,
      null,
      null
    );
  }

  async codeVerify(code: string, clientsDto: ClientsDto): Promise<number> {
    const data = this.verifyCodeSignature(code) as any;
    const { timestamp, id, client_id, redirect_uri } = data;

    const clientIdMatched = clientsDto.client_id === client_id;
    const redirectUriMatched = clientsDto.redirect_uri === redirect_uri;
    const timestampNow = new Date();
    const timestampValid = timestampNow.setMinutes(
      timestampNow.getMinutes() - 10
    );
    const timestampMatched = timestampValid <= Number(timestamp);

    if (!clientIdMatched || !redirectUriMatched || !timestampMatched) {
      throw new BadRequestException(
        "Authorization code is invalid in verify process",
        "invalid_request"
      );
    }
    return id;
  }
}
