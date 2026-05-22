import { Injectable } from "@nestjs/common";
import { IdGenerator } from "../../application/ports/id-generator";

@Injectable()
export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID();
  }
}
