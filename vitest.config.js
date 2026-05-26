module.exports = {
  test: {
    environment: "node",
    include: ["backend/**/*.test.js", "frontend/**/*.test.jsx"],
    globals: true,
  },
};
