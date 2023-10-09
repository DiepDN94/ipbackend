const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app'); // Import your Express app
//connect to sakila db. use .env file for password
require('dotenv').config(); 
const db = mysql.createConnection({ 
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});
db.connect(err => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Connected to Sakila')
});
const sinon = require('sinon');

chai.use(chaiHttp);
const expect = chai.expect;

describe('POST /rentFilm', () => {
  it('should rent a film to a customer', async () => {
    // Mock database queries using Sinon
    const queryPromiseStub = sinon.stub();
    db.query = queryPromiseStub;

    // Stub the queries to simulate a successful rental
    queryPromiseStub.onCall(0).returns([{ customer_id: 1 }]); // Simulate finding the customer
    queryPromiseStub.onCall(1).returns([{ available_copies: 2 }]); // Simulate available copies
    queryPromiseStub.onCall(2).resolves(); // Simulate successful rental insert

    const response = await chai
      .request(app)
      .post('/rentFilm')
      .send({ filmId: 1, firstName: 'John', lastName: 'Doe' });

    // Assertions
    expect(response).to.have.status(200);
    expect(response.body).to.deep.equal({
      success: true,
      message: 'Film rented successfully!',
    });
  });

  it('should handle renting when the customer is not found', async () => {
    // Mock database queries using Sinon
    const queryPromiseStub = sinon.stub();
    db.query = queryPromiseStub;

    // Stub the queries to simulate not finding the customer
    queryPromiseStub.onCall(0).returns([]); // Simulate not finding the customer

    const response = await chai
      .request(app)
      .post('/rentFilm')
      .send({ filmId: 1, firstName: 'John', lastName: 'Doe' });

    // Assertions
    expect(response).to.have.status(400);
    expect(response.body).to.deep.equal({
      success: false,
      message: 'Customer not found.',
    });
  });

  it('should handle renting when the film is not available', async () => {
    // Mock database queries using Sinon
    const queryPromiseStub = sinon.stub();
    db.query = queryPromiseStub;

    // Stub the queries to simulate unavailable copies
    queryPromiseStub.onCall(0).returns([{ customer_id: 1 }]); // Simulate finding the customer
    queryPromiseStub.onCall(1).returns([{ available_copies: 0 }]); // Simulate no available copies

    const response = await chai
      .request(app)
      .post('/rentFilm')
      .send({ filmId: 1, firstName: 'John', lastName: 'Doe' });

    // Assertions
    expect(response).to.have.status(400);
    expect(response.body).to.deep.equal({
      success: false,
      message: 'Film is not available for rental.',
    });
  });

  it('should handle internal server error', async () => {
    // Mock database queries using Sinon
    const queryPromiseStub = sinon.stub();
    db.query = queryPromiseStub;

    // Stub the queries to simulate an internal server error
    queryPromiseStub.throws(new Error('Database error'));

    const response = await chai
      .request(app)
      .post('/rentFilm')
      .send({ filmId: 1, firstName: 'John', lastName: 'Doe' });

    // Assertions
    expect(response).to.have.status(500);
    expect(response.body).to.deep.equal({
      success: false,
      message: 'Error renting the film.',
    });
  });
});
