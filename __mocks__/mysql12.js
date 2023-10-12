const mockQuery = jest.fn();

const createConnection = jest.fn().mockReturnValue({
  query: mockQuery,
  connect: jest.fn()
});

module.exports = {
  createConnection
};
