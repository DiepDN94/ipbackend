const request = require('supertest');
const server = require('../index.js');

describe('Home API Endpoints', () => {

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

  it('fetches the film details for a given film ID', async () => {
    const film_id = 1; // This is a sample film ID for testing
    const res = await request(server).get(`/filmDetails/${film_id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('description');
    expect(res.body).toHaveProperty('language');
    expect(res.body).toHaveProperty('release_year');
    expect(res.body).toHaveProperty('rating');
  });

});
