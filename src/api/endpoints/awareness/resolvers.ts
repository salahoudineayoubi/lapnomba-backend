import AwarenessAgent from "../../../models/awarenessAgent";
import { sendMail } from "../../../utils/sendMail";

const buildAwarenessMail = (
  type: "CONFIRMATION" | "APPROBATION" | "REFUS",
  nomComplet: string,
  zoneIntervention?: string
): { subject: string; text: string; html: string } => {
  const safeName = nomComplet?.trim() || "Cher candidat";
  const safeZone = zoneIntervention?.trim() || "votre zone d’intervention";

  const messages = {
    CONFIRMATION: {
      subject: "Confirmation de réception de votre candidature - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous vous remercions pour votre engagement en faveur de la mission de la Fondation Lap Nomba.

Votre candidature en tant qu’Agent de Sensibilisation a bien été reçue et enregistrée par notre équipe.

Nous préparons actuellement l’étude de votre dossier ainsi que les éléments relatifs à votre zone d’intervention : ${safeZone}.

Nous reviendrons vers vous très prochainement pour la suite du processus.

Cordialement,
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Confirmation de réception de votre candidature</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous remercions pour votre engagement en faveur de la mission de la
            <strong>Fondation Lap Nomba</strong>.
          </p>
          <p>
            Votre candidature en tant qu’<strong>Agent de Sensibilisation</strong> a bien
            été reçue et enregistrée par notre équipe.
          </p>
          <p>
            Nous préparons actuellement l’étude de votre dossier ainsi que les éléments
            relatifs à votre zone d’intervention : <strong>${safeZone}</strong>.
          </p>
          <p>
            Nous reviendrons vers vous très prochainement pour la suite du processus.
          </p>
          <p>
            Cordialement,<br />
            <strong>Fondation Lap Nomba</strong>
          </p>
        </div>
      `,
    },

    APPROBATION: {
      subject: "Validation de votre candidature - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous avons le plaisir de vous informer que votre candidature en tant qu’Agent de Sensibilisation a été approuvée.

Nous vous remercions pour votre disponibilité à contribuer aux actions de terrain de la Fondation Lap Nomba.

Notre équipe vous contactera prochainement afin de vous transmettre les consignes de mobilisation, les éléments de travail et les prochaines étapes relatives à votre zone d’intervention.

Cordialement,
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Validation de votre candidature</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous avons le plaisir de vous informer que votre candidature en tant qu’
            <strong>Agent de Sensibilisation</strong> a été approuvée.
          </p>
          <p>
            Nous vous remercions pour votre disponibilité à contribuer aux actions de
            terrain de la <strong>Fondation Lap Nomba</strong>.
          </p>
          <p>
            Notre équipe vous contactera prochainement afin de vous transmettre les
            consignes de mobilisation, les éléments de travail et les prochaines étapes
            relatives à votre zone d’intervention.
          </p>
          <p>
            Cordialement,<br />
            <strong>Fondation Lap Nomba</strong>
          </p>
        </div>
      `,
    },

    REFUS: {
      subject: "Suivi de votre candidature - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous vous remercions sincèrement pour l’intérêt porté aux actions de la Fondation Lap Nomba.

Après examen de votre candidature, nous sommes au regret de vous informer qu’elle n’a pas été retenue pour cette phase.

Nous saluons votre volonté de contribuer à la sensibilisation des jeunes et vous encourageons à rester proche de nos initiatives futures.

Cordialement,
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Suivi de votre candidature</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous remercions sincèrement pour l’intérêt porté aux actions de la
            <strong>Fondation Lap Nomba</strong>.
          </p>
          <p>
            Après examen de votre candidature, nous sommes au regret de vous informer
            qu’elle n’a pas été retenue pour cette phase.
          </p>
          <p>
            Nous saluons votre volonté de contribuer à la sensibilisation des jeunes et
            vous encourageons à rester proche de nos initiatives futures.
          </p>
          <p>
            Cordialement,<br />
            <strong>Fondation Lap Nomba</strong>
          </p>
        </div>
      `,
    },
  };

  return messages[type];
};

export const awarenessResolvers = {
  Query: {
    awarenessAgents: async () => await AwarenessAgent.find().sort({ createdAt: -1 }),
  },

  Mutation: {
    createAwarenessAgent: async (_: any, { input }: any) => {
      try {
        const agent = await AwarenessAgent.create(input);

        if (agent?.email) {
          const { subject, text, html } = buildAwarenessMail(
            "CONFIRMATION",
            agent.nomComplet,
            agent.zoneIntervention
          );

          await sendMail({
            to: agent.email,
            subject,
            text,
            html,
          });
        }

        return agent;
      } catch (error: any) {
        if (error.code === 11000) {
          throw new Error("Cet email est déjà utilisé.");
        }
        throw error;
      }
    },

    updateAwarenessAgentStatus: async (_: any, { id, statut }: any) => {
      const agent = await AwarenessAgent.findByIdAndUpdate(
        id,
        { statut },
        { new: true }
      );

      if (agent?.email && agent?.nomComplet) {
        if (statut === "approuvée") {
          const { subject, text, html } = buildAwarenessMail(
            "APPROBATION",
            agent.nomComplet,
            agent.zoneIntervention
          );

          await sendMail({
            to: agent.email,
            subject,
            text,
            html,
          });
        } else if (statut === "refusée") {
          const { subject, text, html } = buildAwarenessMail(
            "REFUS",
            agent.nomComplet,
            agent.zoneIntervention
          );

          await sendMail({
            to: agent.email,
            subject,
            text,
            html,
          });
        }
      }

      return agent;
    },
  },
};