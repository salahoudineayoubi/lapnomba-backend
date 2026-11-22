jest.mock("../../src/utils/privateFiles", () => ({ isPrivateRef: () => false, getPrivateFileUrl: () => "u" }));
jest.mock("../../src/utils/sendMail", () => ({ sendMail: jest.fn() }));

import { admissionResolvers } from "../../src/api/endpoints/admission/resolvers";

const admin = { admin: { id: "a" } } as any;
const identite = (admissionResolvers as any).Candidature.identite;

describe("Candidature.identite", () => {
  it("ancienne candidature (identite vide de Mongoose) : null, pas d'erreur GraphQL", () => {
    expect(identite({ identite: { documents: {} } }, {}, admin)).toBeNull();
    expect(identite({}, {}, admin)).toBeNull();
  });
  it("candidature v2 : bloc identité pour l'admin uniquement", () => {
    const p = { identite: { typePiece: "CNI", numeroFin: "1234", statut: "a_verifier", documents: {} } };
    expect(identite(p, {}, admin)).toMatchObject({ typePiece: "CNI", statut: "a_verifier", purgee: false });
    expect(identite(p, {}, {} as any)).toBeNull();
  });
});
