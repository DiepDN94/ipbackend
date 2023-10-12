const createConnection = jest.fn().mockReturnValue({
  query: jest.fn(),
  connect: jest.fn()
});

module.exports = {
  createConnection
};
