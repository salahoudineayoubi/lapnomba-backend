import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("students")
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  prenom: string;

  @Column({ unique: true })
  email: string;

  @Column()
  niveauEtude: string;

  @Column({ type: "date" })
  dateNaissance: Date;

  @Column()
  ville: string;

  @Column()
  numeroWhatsapp: string;

  @CreateDateColumn()
  dateInscription: Date;
}