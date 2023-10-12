const request = require('supertest');
const server = require('../index.js');

describe('API Endpoints', () => {
  afterAll((done) => {
    server.close(done);
  });

  it('fetches the top 5 films', async () => {
    const res = await request(server).get('/top5Films');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(5);
  });

  it('fetches the top 5 actors', async () => {
    const res = await request(server).get('/top5Actors');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(5);
  });

});
