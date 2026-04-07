const { v4: uuidv4 } = require("uuid");

// In production replace this with your database layer (Prisma, Knex, Mongoose…)
let users = [
  { id: "u-1", name: "Alice", email: "alice@example.com", role: "admin",  createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "u-2", name: "Bob",   email: "bob@example.com",   role: "member", createdAt: "2024-02-01T00:00:00.000Z" },
];

const UserStore = {
  findAll({ page = 1, limit = 10, role } = {}) {
    let result = [...users];
    if (role) result = result.filter((u) => u.role === role);
    const total = result.length;
    const start = (page - 1) * limit;
    return { items: result.slice(start, start + limit), total };
  },

  findById(id) {
    return users.find((u) => u.id === id) ?? null;
  },

  findByEmail(email) {
    return users.find((u) => u.email === email) ?? null;
  },

  create(data) {
    const user = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
    users.push(user);
    return user;
  },

  update(id, data) {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...data, updatedAt: new Date().toISOString() };
    return users[idx];
  },

  delete(id) {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    users.splice(idx, 1);
    return true;
  },
};

module.exports = { UserStore };
