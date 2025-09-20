import User, { IUser } from '../src/models/User';

describe('User Model', () => {
  it('should create a user', async () => {
    const user = new User({ name: 'Test', email: 'test@example.com' });
    expect(user.name).toBe('Test');
    expect(user.email).toBe('test@example.com');
  });
});
