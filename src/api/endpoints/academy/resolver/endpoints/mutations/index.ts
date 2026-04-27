
import AcademyApplication from "../../../../../../models/academy";

export const createAcademyApplication = async (_: any, { input }: any) => {
  const requiresQuote =
    input.requiresQuote ??
    ["entreprise", "ong"].includes(input.applicantType);

  const paymentStatus = requiresQuote ? "non_requis" : "en_attente";

  const application = new AcademyApplication({
    ...input,
    requiresQuote,
    paymentStatus,
    status: "nouvelle",
    impactNote:
      "Chaque formation premium contribue directement au financement des formations gratuites des jeunes talents africains.",
  });

  await application.save();

  return application;
};

export const updateAcademyApplicationStatus = async (
  _: any,
  { input }: any
) => {
  const application = await AcademyApplication.findByIdAndUpdate(
    input.id,
    {
      status: input.status,
      adminNote: input.adminNote,
    },
    { new: true }
  );

  if (!application) {
    throw new Error("Candidature Academy introuvable.");
  }

  return application;
};

export const updateAcademyPayment = async (_: any, { input }: any) => {
  const application = await AcademyApplication.findByIdAndUpdate(
    input.id,
    {
      paymentStatus: input.paymentStatus,
      paymentMethod: input.paymentMethod,
      amount: input.amount,
      currency: input.currency,
      invoiceUrl: input.invoiceUrl,
      quoteUrl: input.quoteUrl,
    },
    { new: true }
  );

  if (!application) {
    throw new Error("Dossier Academy introuvable.");
  }

  return application;
};

export const deleteAcademyApplication = async (
  _: any,
  { id }: { id: string }
) => {
  const deleted = await AcademyApplication.findByIdAndDelete(id);
  return !!deleted;
};