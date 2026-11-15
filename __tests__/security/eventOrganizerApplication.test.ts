const mockCreate = jest.fn();
jest.mock("../../src/models/eventOrganizerApplication", () => {
  const actual = jest.requireActual("../../src/models/eventOrganizerApplication");
  return {
    __esModule: true,
    ...actual,
    default: { create: (...a: any[]) => mockCreate(...a), find: jest.fn(), findByIdAndUpdate: jest.fn() },
  };
});
jest.mock("../../src/utils/sendMail", () => ({ sendMail: jest.fn().mockResolvedValue(undefined) }));

import { eventOrganizerResolvers } from "../../src/api/endpoints/eventOrganizer/resolvers";
import { ADMIN_ONLY_OPERATIONS } from "../../src/api/endpoints/accessControl";

const valid = {
  fullName: "Moussa Ndam",
  email: "Moussa@Example.com",
  phone: "+237 677 12 34 56",
  country: "CM",
  city: "Foumban",
  eventTypes: ["CAMPUS", "HACKATHON", "CAMPUS", "INVALID"],
  skills: ["LOGISTICS", "PHOTO_VIDEO"],
  experience: "SOME",
  availability: "WEEKENDS",
  motivation: "Je veux organiser des journées de sensibilisation contre le Zaguina dans mon lycée.",
};

const create = (input: any) =>
  eventOrganizerResolvers.Mutation.createEventOrganizerApplication(null, { input }, { admin: null } as any);

describe("createEventOrganizerApplication", () => {
  beforeEach(() => mockCreate.mockReset().mockImplementation(async (d: any) => ({ id: "e1", ...d })));

  it("enregistre une candidature valide en PENDING, e-mail normalisé et types dédoublonnés", async () => {
    const res: any = await create(valid);
    expect(res.status).toBe("PENDING");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "moussa@example.com", eventTypes: ["CAMPUS", "HACKATHON"] })
    );
  });

  it("exige au moins un type d'événement et une motivation suffisante", async () => {
    await expect(create({ ...valid, eventTypes: [] })).rejects.toThrow(/type d'événement/);
    await expect(create({ ...valid, motivation: "trop court" })).rejects.toThrow(/motivation/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("la liste et la modération sont réservées à l'admin", () => {
    expect(ADMIN_ONLY_OPERATIONS.Query).toContain("eventOrganizerApplications");
    expect(ADMIN_ONLY_OPERATIONS.Mutation).toContain("updateEventOrganizerApplicationStatus");
    expect(ADMIN_ONLY_OPERATIONS.Mutation).toContain("deleteEventOrganizerApplication");
  });
});
