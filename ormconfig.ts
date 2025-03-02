import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Загружаем переменные окружения перед их использованием
config({
  path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev',
});

console.log(
  'Подключение к БД:',
  process.env.POSTGRES_HOST,
  process.env.POSTGRES_DB,
);

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, './migrations/*.{js,ts}')],
  synchronize: false,
  migrationsRun: true,
});
