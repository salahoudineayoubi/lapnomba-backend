// import { UserModel } from '../models/user';

// export class UserService {
//     async createUser(userData: any) {
//         const user = new UserModel(userData);
//         return await user.save();
//     }

//     async getUserById(userId: string) {
//         return await UserModel.findById(userId);
//     }

//     async getAllUsers() {
//         return await UserModel.find();
//     }

//     async updateUser(userId: string, updateData: any) {
//         return await UserModel.findByIdAndUpdate(userId, updateData, { new: true });
//     }

//     async deleteUser(userId: string) {
//         return await UserModel.findByIdAndDelete(userId);
//     }
// }