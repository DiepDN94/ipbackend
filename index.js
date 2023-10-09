const express = require('express');
const app = express();
const mysql = require('mysql2');

// cors. Need this to make stuff go.
const cors = require('cors');
app.use(cors());
app.use(express.json());

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

app.get('/health-check', (req, res) => {
  res.send('Hello World');
});

const port = 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

const queryPromise = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

{//pdf report
const PDFDocument = require('pdfkit');

app.get('/generateCustomerReport', async (req, res) => {
  try {
    // Fetch all customers who rented films and the corresponding film titles
    const sql = `
    SELECT customer.*, film.title AS rented_films
    FROM customer
    JOIN rental ON rental.customer_id = customer.customer_id
    JOIN inventory ON rental.inventory_id = inventory.inventory_id
    JOIN film ON inventory.film_id = film.film_id
    WHERE rental.return_date IS NULL;    
    `;

    const customers = await queryPromise(sql);

    const doc = new PDFDocument;
    doc.pipe(res);

    doc.fontSize(20).text('Customers Who Rented Movies', { align: 'center' });

    customers.forEach(customer => {
        doc.moveDown().fontSize(14).text(`Name: ${customer.first_name} ${customer.last_name}, Email: ${customer.email}`);
        doc.fontSize(12).text(`Rented Films: ${customer.rented_films}`, { indent: 15 });
    });

    doc.end();
  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).send("Error generating report");
  }
});
  
  
}//end pdf report

{//Homepage
/*
Get top 5 films for front page
STOP TRYING TO MAKE THIS GENERIC
*/
app.get('/top5Films', async (req, res) => {
  // SQL for top 5 films
  const sql = `
    SELECT film.film_id, film.title, COUNT(rental.rental_id) as rental_count 
    FROM film 
    JOIN inventory ON film.film_id = inventory.film_id 
    JOIN rental ON inventory.inventory_id = rental.inventory_id
    GROUP BY film.film_id, film.title
    ORDER BY rental_count DESC 
    LIMIT 5
  `;
  try {
    const results = await queryPromise(sql);
    res.json(results);
  } catch (err) {
    console.error("Error fetching top 5 films:", err);
    return res.send({err});
  }
});
  

//Get top 5 actors for front page
app.get('/top5Actors', async (req, res) => {
  //SQL for top 5 actors
  const sql = `
    SELECT actor.actor_id, actor.first_name, actor.last_name, COUNT(DISTINCT film.film_id) as film_count 
    FROM actor
    JOIN film_actor ON actor.actor_id = film_actor.actor_id
    JOIN film ON film_actor.film_id = film.film_id
    GROUP BY actor.actor_id, actor.first_name, actor.last_name
    ORDER BY film_count DESC
    LIMIT 5
  `;

  try {
    const results = await queryPromise(sql);
    res.json(results);
  } catch (err) {
    console.error("Error fetching top 5 actors:", err);
    return res.end({err});
  }
});

/*
Originally had two different functions one gets Film details and another got language details
Decided to combine the two to reduce the amount of query's to the server since everytime Film details was called
language details was also called. Made sense to just combine the two routes instead of two different routes for one call.
*/
app.get('/filmDetails/:film_id', async (req, res) => { // Was /filmDetails
  const film_id = req.params.film_id;
  const filmSql = `SELECT * FROM film WHERE film_id = ?`;
  const languageSql = 'SELECT name FROM language WHERE language_id = ?';
  
  try {
    const filmDetails = await queryPromise(filmSql, [film_id]);
    const languageDetails = await queryPromise(languageSql, [filmDetails[0].language_id]);

    // Combine filmdetails and actual language instead of language id into one object and return
    res.json({
      ...filmDetails[0],
      language: languageDetails[0].name
    });
  } catch (err) {
    res.send(err);
  }
});

/*
Get actor's details and their top 5 rented movies.
MAKE WORK WITH GENERIC TOP 5 LATER.
*/
app.get('/actorInfo/:actor_id', async (req, res) => {
  const actor_id = req.params.actor_id;

  // SQL for actor details
  const actorDetailsSql = `
    SELECT actor_id, first_name, last_name 
    FROM actor 
    WHERE actor_id = ?
  `;

  // SQL for actor's top 5 rented movies
  const topMoviesSql = `
    SELECT film.film_id, film.title, COUNT(rental.rental_id) as rental_count 
    FROM film
    JOIN inventory ON film.film_id = inventory.film_id
    JOIN rental ON inventory.inventory_id = rental.inventory_id
    JOIN film_actor ON film.film_id = film_actor.film_id
    WHERE film_actor.actor_id = ?
    GROUP BY film.film_id, film.title
    ORDER BY rental_count DESC
    LIMIT 5
  `;

  try {
    // Fetching actor details
    const actorResults = await queryPromise(actorDetailsSql, [actor_id]);

    // If no actor found, return 404 not found
    if (actorResults.length === 0) {
      return res.status(404).send({ message: 'Actor not found' });
    }

    // Fetching top 5 rented movies of the actor
    const movieResults = await queryPromise(topMoviesSql, [actor_id]);

    // Combine actor details and their top movies into one object and return
    res.json({
      actorDetails: actorResults[0],
      actorMovies: movieResults
    });
  } catch (err) {
    console.error("Error fetching actor info and top 5 movies:", err);
    return res.send({err});
  }
});

}//end Homepage

{//Movie Page

app.get('/searchMovies', async (req, res) => {
  const { filmName, actorName, genre } = req.query;

  // SQL for film search
  let sql = `
    SELECT DISTINCT film.film_id, film.title 
    FROM film
    LEFT JOIN film_category ON film.film_id = film_category.film_id
    LEFT JOIN category ON film_category.category_id = category.category_id
    WHERE 1=1 
  `;
  const queryParams = [];

  // SQL for film name param
  if (filmName) {
    sql += ` AND film.title LIKE ?`;
    queryParams.push(`%${filmName}%`);
  }

  // SQL for actor name param
  if (actorName) {
    sql += `
      AND EXISTS (
        SELECT 1
        FROM film_actor
        INNER JOIN actor ON film_actor.actor_id = actor.actor_id
        WHERE film_actor.film_id = film.film_id
        AND (actor.first_name LIKE ? OR actor.last_name LIKE ?)
      )`;
    queryParams.push(`%${actorName}%`, `%${actorName}%`);
  }
  
  // SQL for genre param
  if (genre) {
    sql += `AND category.name = ?`;
    queryParams.push(genre);
  }

  try {
    const movies = await queryPromise(sql, queryParams);
    const moviesWithAvailability = await Promise.all(movies.map(async (movie) => {
      const availabilitySql = `
        SELECT COUNT(inventory.inventory_id) as available_copies 
        FROM inventory 
        LEFT JOIN rental ON inventory.inventory_id = rental.inventory_id AND rental.return_date IS NULL
        WHERE inventory.film_id = ? AND rental.rental_id IS NULL
      `;
      const availableCopiesResults = await queryPromise(availabilitySql, [movie.film_id]);
      return {
        ...movie,
        available_copies: availableCopiesResults[0].available_copies
      };
    }));
    res.json(moviesWithAvailability);
  } catch (err) {
    console.error("Error in /searchMovies:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/getGenres', async (req, res) => {
  try {
    const sql = `SELECT DISTINCT name FROM category`;
    const genres = await queryPromise(sql);
    res.json(genres);
  } catch (err) {
    console.error("Error in /getGenres:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/rentFilm', async (req, res) => {
  try {
    const { filmId, firstName, lastName } = req.body;

    if (!filmId || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'Please provide filmId, firstName, and lastName.' });
    }

    const customerQuery = `
      SELECT customer_id
      FROM customer
      WHERE first_name = ? AND last_name = ?
    `;

    const [customerRow] = await queryPromise(customerQuery, [firstName, lastName]);

    if (!customerRow) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const customerId = customerRow.customer_id;

    // get inventory_id
    const findAvailableCopySql = `
      SELECT inventory.inventory_id
      FROM inventory
      LEFT JOIN rental ON inventory.inventory_id = rental.inventory_id AND rental.return_date IS NULL
      WHERE inventory.film_id = ? AND rental.inventory_id IS NULL
      LIMIT 1
    `;

    const [availableCopy] = await queryPromise(findAvailableCopySql, [filmId]);

    if (!availableCopy) {
      return res.status(400).json({ success: false, message: 'No available copies of the film.' });
    }

    const inventoryId = availableCopy.inventory_id;

    const createRentalSql = `
      INSERT INTO rental (rental_date, inventory_id, customer_id, return_date, staff_id)
      VALUES (NOW(), (SELECT inventory_id FROM inventory WHERE inventory_id = ? LIMIT 1), ?, NULL, 1);
    `;

    await queryPromise(createRentalSql, [inventoryId, customerId]);

    // update inventory
    const updateInventorySql = `
      UPDATE inventory
      SET last_update = NOW()
      WHERE inventory_id = ?
    `;

    await queryPromise(updateInventorySql, [inventoryId]);

    return res.status(200).json({ success: true, message: 'Film rented successfully.' });
  } catch (error) {
    console.error('Error renting the film:', error);
    return res.status(500).json({ success: false, message: 'Error renting the film.' });
  }
});


}//end Movie Page

{//Customer Page
  app.get('/customer', async (req, res) => {
    const search = req.query.search || ''; // Get the search text from the query parameters
    try {
      const sql = `
      SELECT customer.customer_id, customer.first_name, customer.last_name, customer.email, address.address
      FROM customer
      JOIN address ON customer.address_id = address.address_id
      WHERE 
        customer.first_name LIKE ? OR
        customer.last_name LIKE ? OR
        customer.email LIKE ?
      `;
      const searchValue = `%${search}%`; // Wrap the search term with '%' for a partial match
      const customers = await queryPromise(sql, [searchValue, searchValue, searchValue]);
      res.json(customers);
    } catch (err) {
      console.error("Error in /customer:", err);
      res.status(500).send(err.message);
    }
  });

  const getCityId = async (cityName) => {
    const result = await queryPromise('SELECT city_id FROM city WHERE city = ?', [cityName]);
    
    if (!result.length) {
        throw new Error('City not found!');
    }
    
    return result[0].city_id;
  }

  
  const insertAddress = async (addressData, cityId) => {
    const result = await queryPromise('INSERT INTO address (address, address2, district, postal_code, phone, location, city_id) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [addressData.address, addressData.address2, addressData.district, addressData.postalCode, addressData.phone, addressData.location, cityId]);
    
    return result.insertId; // This is the address_id for the new address
  }


  const insertCustomer = async (customerData, addressId) => {
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const result = await queryPromise('INSERT INTO customer (store_id, first_name, last_name, email, address_id, active, create_date, last_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [customerData.storeId, customerData.firstName, customerData.lastName, customerData.email, addressId, 1, currentDate, currentDate]);
    
    return result.insertId; // This is the customer_id for the new customer
  }

  const createNewCustomer = async (customerData, addressData, cityName) => {
    try {
        const cityId = await getCityId(cityName);
        const addressId = await insertAddress(addressData, cityId);
        const customerId = await insertCustomer(customerData, addressId);

        return customerId;
    } catch (error) {
        throw error;
    }
  }
}//end Customer Page