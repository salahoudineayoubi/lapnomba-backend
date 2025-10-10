import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

@Entity("join_team_request")
@Unique(["nomComplet", "email", "numeroWhatsapp"])
export class JoinTeamRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nomComplet: string;

  @Column()
  email: string;

  @Column()
  numeroWhatsapp: string;

  @Column({ type: "text" }) // <-- Change ici pour accepter les longs messages
  message: string;

  @Column()
  profession: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}