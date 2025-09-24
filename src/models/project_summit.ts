import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("project_summit")
export class ProjectSummit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nomComplet: string;

  @Column()
  email: string;

  @Column()
  nomProjet: string;

  @Column()
  description: string;

  @Column()
  numeroWhatsapp: string;

  @CreateDateColumn()
  dateSoumission: Date;
}