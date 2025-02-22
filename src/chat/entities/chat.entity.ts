import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'chats' })
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  // Идентификатор чата (например, id из Telegram)
  @Column()
  chatId: string;

  // Роль отправителя: 'user', 'assistant', 'system'
  @Column()
  role: string;

  // Основной текст сообщения
  @Column('text')
  content: string;

  // Опциональное поле для файла (например, изображение) — можно хранить URL или Base64
  @Column('text', { nullable: true })
  attachment?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
