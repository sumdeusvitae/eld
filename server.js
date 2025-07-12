import express from 'express';
import scrapeDrivers from './scrape.js'; // Move scrape logic to an exportable function

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', async (req, res) => {
    await scrapeDrivers(); // Run scraper
    res.send('Scrape complete');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
