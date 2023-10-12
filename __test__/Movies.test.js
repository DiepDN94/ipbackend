const request = require('supertest');
const app = require('../index.js');

describe('/searchMovies', () => {

  it('should return movies that match the given film name', async () => {
    const response = await request(app).get('/searchMovies').query({
      filmName: 'ExampleFilmName'
    });
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    response.body.forEach(movie => {
      expect(movie.title).toContain('ExampleFilmName'); 
    });
  });

  it('should return movies with the given actor', async () => {
    const response = await request(app).get('/searchMovies').query({
      actorName: 'ExampleActorName' 
    });
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  it('should return movies of the given genre', async () => {
    const response = await request(app).get('/searchMovies').query({
      genre: 'ExampleGenre' 
    });
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  it('should return movies that match a combination of search criteria', async () => {
    const response = await request(app).get('/searchMovies').query({
      filmName: 'ExampleFilmName',
      actorName: 'ExampleActorName',
      genre: 'ExampleGenre'
    });
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  it('should return an empty array when no movies match the criteria', async () => {
    const response = await request(app).get('/searchMovies').query({
      filmName: 'NonExistentFilmName'
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

