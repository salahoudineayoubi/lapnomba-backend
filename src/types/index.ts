export interface User {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Query {
    users: User[];
    user(id: string): User;
}

export interface Mutation {
    createUser(username: string, email: string): User;
    updateUser(id: string, username?: string, email?: string): User;
    deleteUser(id: string): boolean;
}