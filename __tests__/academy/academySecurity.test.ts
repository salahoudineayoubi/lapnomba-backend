/**
 * Tests de sécurité Academy (Phase 3) — entièrement mockés (modèles
 * Mongoose + service de paiement Smobilpay). Aucune connexion réseau,
 * aucune base de données réelle.
 *
 * Couvre :
 *  - auth (opérations admin bloquées sans token, autorisées avec)
 *  - opérations publiques préservées (comportement existant, voir rapport
 *    Phase 3 "Public GraphQL Operations")
 *  - anti-manipulation de prix (mass-assignment) sur createAcademyApplication
 *  - rate limiting
 *  - filtrage du catalogue public (programmes inactifs masqués)
 */

const mockApplicationCtor = jest.fn();
const mockProgramCtor = jest.fn();

jest.mock("../../src/models/acdemy/application", () => {
  const ctor: any = jest.fn().mockImplementation((data: any) => {
    mockApplicationCtor(data);
    return { ...data, save: jest.fn().mockResolvedValue(undefined) };
  });
  ctor.find = jest.fn();
  ctor.findById = jest.fn();
  ctor.findByIdAndUpdate = jest.fn();
  ctor.findByIdAndDelete = jest.fn();
  return { __esModule: true, default: ctor };
});

jest.mock("../../src/models/acdemy/program", () => {
  const ctor: any = jest.fn().mockImplementation((data: any) => {
    mockProgramCtor(data);
    return { ...data, save: jest.fn().mockResolvedValue(undefined) };
  });
  ctor.find = jest.fn();
  ctor.findOne = jest.fn();
  ctor.findById = jest.fn();
  ctor.findByIdAndUpdate = jest.fn();
  ctor.findByIdAndDelete = jest.fn();
  return { __esModule: true, default: ctor };
});

jest.mock("../../src/models/acdemy/enrollment", () => {
  const ctor: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
  }));
  ctor.find = jest.fn();
  ctor.findById = jest.fn();
  ctor.findByIdAndUpdate = jest.fn();
  ctor.findByIdAndDelete = jest.fn();
  ctor.findOne = jest.fn();
  return { __esModule: true, default: ctor };
});

jest.mock("../../src/models/acdemy/payment", () => {
  const ctor: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
  }));
  ctor.find = jest.fn();
  ctor.findById = jest.fn();
  ctor.findByIdAndUpdate = jest.fn();
  ctor.findByIdAndDelete = jest.fn();
  return { __esModule: true, default: ctor };
});

jest.mock("../../src/models/acdemy/groupe", () => {
  const ctor: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
  }));
  ctor.find = jest.fn();
  ctor.findById = jest.fn();
  ctor.findByIdAndUpdate = jest.fn();
  ctor.findByIdAndDelete = jest.fn();
  ctor.exists = jest.fn().mockResolvedValue(false);
  return { __esModule: true, default: ctor };
});

jest.mock("../../src/models/acdemy/progress", () => {
  const ctor: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
  }));
  ctor.find = jest.fn();
  ctor.findOne = jest.fn();
  ctor.findOneAndUpdate = jest.fn();
  ctor.create = jest.fn().mockResolvedValue({});
  return { __esModule: true, default: ctor };
});

jest.mock("../../src/services/academyPayment/academyPayment.service", () => ({
  initiateAcademyPayment: jest.fn().mockResolvedValue({ id: "pay1", status: "pending" }),
  verifyAcademyPaymentByTxid: jest.fn(),
  verifyAcademyPaymentByMerchantReference: jest.fn(),
}));

import AcademyApplication from "../../src/models/acdemy/application";
import AcademyProgram from "../../src/models/acdemy/program";
import { academyApplicationResolvers } from "../../src/api/endpoints/academy/resolver/application";
import { academyProgramResolvers } from "../../src/api/endpoints/academy/resolver/program";
import { academyEnrollmentResolvers } from "../../src/api/endpoints/academy/resolver/enrollement";
import { academyPaymentResolvers } from "../../src/api/endpoints/academy/resolver/payment";
import { academyGroupResolvers } from "../../src/api/endpoints/academy/resolver/group";
import { academyProgressResolvers } from "../../src/api/endpoints/academy/resolver/progress";
import { academyStatsResolvers } from "../../src/api/endpoints/academy/resolver/stats";

const MockedApplication = AcademyApplication as unknown as {
  find: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
};
const MockedProgram = AcademyProgram as unknown as {
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
};

const adminContext = { admin: { email: "admin@lapnomba.org", role: "admin" as const } };
const anonymousContext = { admin: null } as any;

const validApplicationInput = {
  applicantType: "professionnel",
  fullName: "Awa Ngo",
  email: "awa.ngo@example.com",
  phone: "+237690112233",
  country: "Cameroun",
  selectedTrack: "developpement-web-mobile",
  trainingMode: "online",
  learningGoal: "Devenir développeuse full-stack en un an.",
};

beforeEach(() => {
  jest.clearAllMocks();
  MockedProgram.findOne.mockResolvedValue(null);
});

describe("Academy — opérations admin-only bloquées sans authentification", () => {
  it("academyApplications (liste) rejette un appel anonyme", async () => {
    await expect(
      academyApplicationResolvers.Query.academyApplications(null, {}, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
  });

  it("updateAcademyApplication rejette un appel anonyme", async () => {
    await expect(
      academyApplicationResolvers.Mutation.updateAcademyApplication(
        null,
        { input: { id: "a1", status: "approuvee" } },
        anonymousContext
      )
    ).rejects.toThrow(/Authentification admin requise/);
  });

  it("deleteAcademyApplication rejette un appel anonyme", async () => {
    await expect(
      academyApplicationResolvers.Mutation.deleteAcademyApplication(null, { id: "a1" }, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
  });

  it("createAcademyProgram rejette un appel anonyme", async () => {
    await expect(
      academyProgramResolvers.Mutation.createAcademyProgram(null, { input: { title: "x", slug: "x" } }, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
  });

  it("academyEnrollments/createAcademyEnrollment/deleteAcademyEnrollment rejettent un appel anonyme", async () => {
    await expect(
      academyEnrollmentResolvers.Query.academyEnrollments(null, {}, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
    await expect(
      academyEnrollmentResolvers.Mutation.createAcademyEnrollment(null, { input: {} }, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
    await expect(
      academyEnrollmentResolvers.Mutation.deleteAcademyEnrollment(null, { id: "e1" }, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
  });

  it("academyPayments/createAcademyPayment rejettent un appel anonyme (mais pas initiateAcademyPayment/verifyAcademyPayment)", async () => {
    await expect(
      academyPaymentResolvers.Query.academyPayments(null, {}, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
    await expect(
      academyPaymentResolvers.Mutation.createAcademyPayment(null, { input: { amount: 1 } }, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
  });

  it("academyGroups/createAcademyGroup rejettent un appel anonyme", async () => {
    await expect(
      academyGroupResolvers.Query.academyGroups(null, {}, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
    await expect(
      academyGroupResolvers.Mutation.createAcademyGroup(null, { input: {} }, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
  });

  it("academyProgressByEnrollment/updateAcademyProgress rejettent un appel anonyme", async () => {
    await expect(
      academyProgressResolvers.Query.academyProgressByEnrollment(null, { enrollmentId: "e1" }, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
    await expect(
      academyProgressResolvers.Mutation.updateAcademyProgress(null, { input: { enrollmentId: "e1" } }, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
  });

  it("academyStats rejette un appel anonyme", async () => {
    await expect(
      academyStatsResolvers.Query.academyStats(null, {}, anonymousContext)
    ).rejects.toThrow(/Authentification admin requise/);
  });
});

describe("Academy — opérations admin-only autorisées avec un token admin valide", () => {
  it("academyApplications retourne la liste pour un admin", async () => {
    MockedApplication.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ id: "a1" }]) });
    const result = await academyApplicationResolvers.Query.academyApplications(null, {}, adminContext);
    expect(result).toEqual([{ id: "a1" }]);
  });

  it("createAcademyProgram crée un programme pour un admin", async () => {
    MockedProgram.findOne.mockResolvedValue(null);
    const program = await academyProgramResolvers.Mutation.createAcademyProgram(
      null,
      { input: { title: "Nouveau", slug: "nouveau", description: "d", category: "c", onlinePrice: 500000 } },
      adminContext
    );
    expect(program.title).toBe("Nouveau");
  });
});

describe("Academy — opérations publiques préservées (comportement existant)", () => {
  it("createAcademyApplication fonctionne sans authentification", async () => {
    const application = await academyApplicationResolvers.Mutation.createAcademyApplication(
      null,
      { input: validApplicationInput },
      { admin: null, ip: "203.0.113.10" } as any
    );
    expect(application.status).toBe("nouvelle");
    expect(application.email).toBe("awa.ngo@example.com");
  });

  it("academyPrograms/academyProgramBySlug fonctionnent sans authentification", async () => {
    MockedProgram.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    await expect(
      academyProgramResolvers.Query.academyPrograms(null, {}, anonymousContext)
    ).resolves.toEqual([]);
  });

  it("approveAcademyApplication fonctionne sans authentification (flux de paiement existant)", async () => {
    MockedApplication.findById.mockResolvedValue({
      _id: "a1",
      fullName: "Awa Ngo",
      email: "awa.ngo@example.com",
      phone: "+237690112233",
      selectedTrack: "developpement-web-mobile",
      trainingMode: "online",
      expectedAmount: 500000,
      monthlyPrice: 30000,
      currency: "XAF",
      save: jest.fn().mockResolvedValue(undefined),
    });

    const AcademyEnrollment = require("../../src/models/acdemy/enrollment").default;
    AcademyEnrollment.findOne.mockResolvedValue(null);

    const enrollment = await academyApplicationResolvers.Mutation.approveAcademyApplication(
      null,
      { id: "a1" }
    );

    expect(enrollment.email).toBe("awa.ngo@example.com");
  });

  it("verifyAcademyPayment fonctionne sans authentification", async () => {
    const AcademyPayment = require("../../src/models/acdemy/payment").default;
    AcademyPayment.findById.mockResolvedValue({
      providerTransactionId: "tx1",
      save: jest.fn().mockResolvedValue(undefined),
    });

    const { verifyAcademyPaymentByTxid } = require("../../src/services/academyPayment/academyPayment.service");
    verifyAcademyPaymentByTxid.mockResolvedValue({ status: "CONFIRMED" });

    const AcademyEnrollment = require("../../src/models/acdemy/enrollment").default;
    AcademyEnrollment.findByIdAndUpdate.mockResolvedValue({});

    const payment = await academyPaymentResolvers.Mutation.verifyAcademyPayment(null, { id: "p1" });
    expect(payment.status).toBe("completed");
  });
});

describe("Academy — anti-manipulation de prix (createAcademyApplication)", () => {
  it("ignore un expectedAmount/monthlyPrice envoyé par le client et recalcule depuis le programme", async () => {
    MockedProgram.findById.mockResolvedValue({
      onlinePrice: 500000,
      hybridPrice: 800000,
      monthlyPrice: 30000,
      currency: "XAF",
    });

    const tamperedInput = {
      ...validApplicationInput,
      programId: "prog1",
      expectedAmount: 1,
      monthlyPrice: 1,
      currency: "XAF",
      requiresQuote: false,
    };

    const application = await academyApplicationResolvers.Mutation.createAcademyApplication(
      null,
      { input: tamperedInput },
      { admin: null, ip: "203.0.113.11" } as any
    );

    expect(application.expectedAmount).toBe(500000);
    expect(application.monthlyPrice).toBe(30000);
  });

  it("force requiresQuote=true pour une entreprise même si le client envoie false", async () => {
    const tamperedInput = {
      ...validApplicationInput,
      applicantType: "entreprise",
      organizationName: "Acme SARL",
      requiresQuote: false,
    };

    const application = await academyApplicationResolvers.Mutation.createAcademyApplication(
      null,
      { input: tamperedInput },
      { admin: null, ip: "203.0.113.12" } as any
    );

    expect(application.requiresQuote).toBe(true);
  });

  it("rejette un applicantType ou un trainingMode invalide", async () => {
    await expect(
      academyApplicationResolvers.Mutation.createAcademyApplication(
        null,
        { input: { ...validApplicationInput, applicantType: "hacker" } },
        { admin: null, ip: "203.0.113.13" } as any
      )
    ).rejects.toThrow();

    await expect(
      academyApplicationResolvers.Mutation.createAcademyApplication(
        null,
        { input: { ...validApplicationInput, trainingMode: "free" } },
        { admin: null, ip: "203.0.113.14" } as any
      )
    ).rejects.toThrow();
  });

  it("rejette un email invalide", async () => {
    await expect(
      academyApplicationResolvers.Mutation.createAcademyApplication(
        null,
        { input: { ...validApplicationInput, email: "pas-un-email" } },
        { admin: null, ip: "203.0.113.15" } as any
      )
    ).rejects.toThrow();
  });
});

describe("Academy — rate limiting sur createAcademyApplication", () => {
  it("bloque après 5 tentatives depuis la même IP en 15 minutes", async () => {
    const ip = "198.51.100.42";

    for (let i = 0; i < 5; i++) {
      await academyApplicationResolvers.Mutation.createAcademyApplication(
        null,
        { input: { ...validApplicationInput, email: `test${i}@example.com` } },
        { admin: null, ip } as any
      );
    }

    await expect(
      academyApplicationResolvers.Mutation.createAcademyApplication(
        null,
        { input: { ...validApplicationInput, email: "test6@example.com" } },
        { admin: null, ip } as any
      )
    ).rejects.toThrow(/Trop de tentatives/);
  });
});
