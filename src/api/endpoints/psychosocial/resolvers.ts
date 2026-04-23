import Psychosocial from "../../../models/psychosocial";
import { sendMail } from "../../../utils/sendMail";

const buildPsychosocialMail = (
  type: "CONFIRMATION" | "APPROVAL" | "REJECTION",
  nomComplet: string
): { subject: string; text: string; html: string } => {
  const safeName = nomComplet?.trim() || "Cher candidat";

  const messages = {
    CONFIRMATION: {
      subject: "Confirmation de réception de votre engagement psychosocial - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous vous remercions sincèrement pour votre disponibilité et votre volonté d’accompagner les jeunes dans le cadre des actions de la Fondation Lap Nomba.

Votre candidature à l’engagement psychosocial a bien été reçue et sera examinée avec attention par notre équipe.

Nous reviendrons vers vous très prochainement pour la suite du processus.

Cordialement,
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Confirmation de réception de votre engagement psychosocial</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous remercions sincèrement pour votre disponibilité et votre volonté
            d’accompagner les jeunes dans le cadre des actions de la
            <strong>Fondation Lap Nomba</strong>.
          </p>
          <p>
            Votre candidature à l’engagement psychosocial a bien été reçue et sera
            examinée avec attention par notre équipe.
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

    APPROVAL: {
      subject: "Validation de votre engagement psychosocial - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous avons le plaisir de vous informer que votre candidature à l’engagement psychosocial a été approuvée.

Nous vous remercions pour votre disponibilité à contribuer à l’accompagnement humain et social des jeunes que nous servons.

Notre équipe vous contactera prochainement pour vous transmettre les prochaines étapes de collaboration.

Cordialement,
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Validation de votre engagement psychosocial</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous avons le plaisir de vous informer que votre candidature à
            l’engagement psychosocial a été approuvée.
          </p>
          <p>
            Nous vous remercions pour votre disponibilité à contribuer à
            l’accompagnement humain et social des jeunes que nous servons.
          </p>
          <p>
            Notre équipe vous contactera prochainement pour vous transmettre les
            prochaines étapes de collaboration.
          </p>
          <p>
            Cordialement,<br />
            <strong>Fondation Lap Nomba</strong>
          </p>
        </div>
      `,
    },

    REJECTION: {
      subject: "Suivi de votre candidature psychosociale - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous vous remercions sincèrement pour l’intérêt porté à la mission de la Fondation Lap Nomba.

Après étude de votre candidature, nous sommes au regret de vous informer qu’elle n’a pas été retenue pour cette phase.

Nous vous remercions pour votre engagement et vous encourageons à rester proche de nos initiatives.

Cordialement,
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Suivi de votre candidature psychosociale</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous remercions sincèrement pour l’intérêt porté à la mission de la
            <strong>Fondation Lap Nomba</strong>.
          </p>
          <p>
            Après étude de votre candidature, nous sommes au regret de vous informer
            qu’elle n’a pas été retenue pour cette phase.
          </p>
          <p>
            Nous vous remercions pour votre engagement et vous encourageons à rester
            proche de nos initiatives.
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

export const psychosocialResolvers = {
  Query: {
    psychosocials: async () => await Psychosocial.find().sort({ createdAt: -1 }),
  },

  Mutation: {
    createPsychosocial: async (_: any, { input }: any) => {
      const res = await Psychosocial.create(input);

      if (res?.email) {
        const { subject, text, html } = buildPsychosocialMail(
          "CONFIRMATION",
          res.nomComplet
        );

        await sendMail({
          to: res.email,
          subject,
          text,
          html,
        });
      }

      return res;
    },

    updatePsychosocialStatus: async (_: any, { id, statut }: any) => {
      const res = await Psychosocial.findByIdAndUpdate(
        id,
        { statut },
        { new: true }
      );

      if (res && res.email && res.nomComplet) {
        if (statut === "approuvée") {
          const { subject, text, html } = buildPsychosocialMail(
            "APPROVAL",
            res.nomComplet
          );

          await sendMail({
            to: res.email,
            subject,
            text,
            html,
          });
        } else if (statut === "refusée") {
          const { subject, text, html } = buildPsychosocialMail(
            "REJECTION",
            res.nomComplet
          );

          await sendMail({
            to: res.email,
            subject,
            text,
            html,
          });
        }
      }

      return res;
    },
  },
};