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

  @Column({ type: "enum", enum: ["visa", "transfert_bancaire", "mobile_money"] })
  typePaiement: "visa" | "transfert_bancaire" | "mobile_money";

  @CreateDateColumn()
  date: Date;
}