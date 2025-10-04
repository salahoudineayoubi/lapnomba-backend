import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("donateur")
export class Donateur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column()
  email: string;

  @Column("decimal", { precision: 10, scale: 2 })
  montant: number;

  @Column({ type: "varchar", length: 32 })
  typePaiement: string; // "visa", "orange_money", "mtn_money", "bank_transfer", etc.

  // Pour Mobile Money (optionnel)
  @Column({ nullable: true })
  numeroMobileMoney?: string;

  // Pour virement bancaire (optionnel)
  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  bankAccount?: string;

  @Column({ nullable: true })
  bankSwift?: string;

  // Pour commentaire ou message du donateur (optionnel)
  @Column({ nullable: true, type: "text" })
  commentaire?: string;

  @Column({ default: false })
  futureContact: boolean;

  @CreateDateColumn()
  date: Date;
}