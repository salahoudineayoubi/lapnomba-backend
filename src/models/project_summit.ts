import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ProjectSummit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nomComplet!: string;

  @Column()
  email!: string;

  @Column()
  nomProjet!: string;

  @Column('text')
  description!: string;

  @Column()
  numeroWhatsapp!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}