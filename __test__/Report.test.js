const request = require('supertest');
const app = require('../index.js'); 
const mysql = require('mysql2');

// Mock the entire mysql2 module
jest.mock('mysql2', () => ({
  createConnection: jest.fn().mockReturnValue({
    connect: jest.fn(),
    query: jest.fn(),
  }),
}));

describe('PDF Report Generation', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test to avoid side effects
  });

  it('should generate a PDF report for customers', async () => {
    mysql.createConnection().query.mockImplementation((sql, params, callback) => {
      callback(null, [
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'johndoe@example.com',
          rented_films: 'Example Film Title'
        }
      ]);
    });

    const response = await request(app).get('/generateCustomerReport');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
  });
});
