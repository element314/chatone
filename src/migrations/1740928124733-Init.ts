import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1740928124733 implements MigrationInterface {
  name = 'Init1740928124733';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "chats" ("id" SERIAL NOT NULL, "chatId" character varying NOT NULL, "role" character varying NOT NULL, "content" text NOT NULL, "attachment" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0117647b3c4a4e5ff198aeb6206" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "chats"`);
  }
}
