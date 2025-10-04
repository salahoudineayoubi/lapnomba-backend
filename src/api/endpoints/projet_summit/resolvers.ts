import { AppDataSource } from "../../../data-source";
import { ProjectSummit } from "../../../models/project_summit";

const projectRepo = AppDataSource.getRepository(ProjectSummit);

export const projectSummitResolvers = {
  Query: {
    projectSummits: async () => projectRepo.find(),
    projectSummit: async (_: any, { id }: { id: number }) =>
      projectRepo.findOne({ where: { id } }),
  },
  Mutation: {
    createProjectSummit: async (
      _: any,
      { nomComplet, email, nomProjet, description, numeroWhatsapp }: any
    ) => {
      if (!nomComplet || !email || !nomProjet || !description || !numeroWhatsapp) {
        throw new Error("Tous les champs sont requis");
      }
      const project = projectRepo.create({
        nomComplet,
        email,
        nomProjet,
        description,
        numeroWhatsapp,
      });
      return projectRepo.save(project);
    },

    updateProjectSummit: async (
      _: any,
      { id, ...fields }: any
    ) => {
      const project = await projectRepo.findOne({ where: { id } });
      if (!project) throw new Error("Projet non trouvé");
      Object.assign(project, fields);
      return projectRepo.save(project);
    },

    deleteProjectSummit: async (_: any, { id }: { id: number }) => {
      const result = await projectRepo.delete(id);
      return result.affected !== 0;
    },
  },
};