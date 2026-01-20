// import Material from "../../../models/material";

// export const materialResolvers = {
//   Query: {
//     materials: async () => {
//       return await Material.find().sort({ createdAt: -1 });
//     },
//     material: async (_: any, { id }: { id: string }) => {
//       return await Material.findById(id);
//     },
//   },
//   Mutation: {
//     createMaterial: async (_: any, { input }: any) => {
//       const material = new Material(input);
//       await material.save();
//       return material;
//     },
//     deleteMaterial: async (_: any, { id }: { id: string }) => {
//       const res = await Material.findByIdAndDelete(id);
//       return !!res;
//     },
//   },
// };