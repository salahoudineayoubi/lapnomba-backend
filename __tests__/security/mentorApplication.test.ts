const mockCreate = jest.fn();
jest.mock("../../src/models/mentorApplication", () => ({
  __esModule: true,
  default: { create: (...a: any[]) => mockCreate(...a), find: jest.fn(), findByIdAndUpdate: jest.fn() },
}));

import { mentorResolvers } from "../../src/api/endpoints/mentor/resolvers";

const valid = {
  fullName: "Awa Njoya",
  email: "Awa@Example.com",
  phone: "+237677123456",
  domain: "DEVOPS_CLOUD",
  yearsExperience: 4,
  linkedinUrl: "https://www.linkedin.com/in/awa",
  motivation: "Je veux transmettre mon expérience DevOps aux jeunes de l'Academy.",
  hoursPerMonth: 8,
};

describe("createMentorApplication", () => {
  beforeEach(() => mockCreate.mockReset().mockImplementation(async (d: any) => ({ id: "m1", ...d })));

  it("enregistre une candidature valide en PENDING avec e-mail normalisé", async () => {
    const res = await mentorResolvers.Mutation.createMentorApplication(null, { input: valid }, { admin: null });
    expect(res.status).toBe("PENDING");
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ email: "awa@example.com" }));
  });

  it("refuse une URL LinkedIn invalide et une disponibilité nulle", async () => {
    await expect(
      mentorResolvers.Mutation.createMentorApplication(null, { input: { ...valid, linkedinUrl: "linkedin" } }, { admin: null })
    ).rejects.toThrow(/URL/);
    await expect(
      mentorResolvers.Mutation.createMentorApplication(null, { input: { ...valid, hoursPerMonth: 0 } }, { admin: null })
    ).rejects.toThrow(/disponibilité/);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
