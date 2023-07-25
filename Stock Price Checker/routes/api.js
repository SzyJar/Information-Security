'use strict';
const https = require('https');
const mongoose = require('mongoose');
const crypto = require('crypto');

mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });

const likesSchema = new mongoose.Schema({
  stock: { type: String, required: true },
  likes: { type: Number, default: 0 },
});

const clientSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  stock: [{ type: String }]
});

const Likes = mongoose.model('Likes', likesSchema);
const Client = mongoose.model('Client', clientSchema);

module.exports = function(app) {

  // If client likes stock - increment like value
  async function incLikes(stock, req) {
    let clientIP = await req.connection.remoteAddress;

    // Hash client's ip
    const hash = crypto.createHash('sha256');
    hash.update(clientIP);
    clientIP = hash.digest('hex');

    // Check if client is already in database, if not add him to database
    let client = await Client.findOne({ ip: clientIP });
    if (!client) {
      let newEntry = new Client({ ip: clientIP })
      await newEntry.save();
    };
    
    // Check if client already liked stock
    let likedStock = await Client.findOne({
      ip: clientIP,
      stock: { $elemMatch: { $eq: stock } },
    });

    // If user did not like stock in the past, increment likes and save liked stock
    if (!likedStock) {
      // Add the stock to the client's liked stocks array
      let likesClient = await Client.findOne({ ip: clientIP });
      likesClient.stock.push(stock)
      await likesClient.save();
      // Increment the likes for the given stock
      let likesValue = await Likes.findOne({ stock: stock });
      likesValue.likes += 1;
      await likesValue.save();
      return false;
    } else {
      return true;
    };
  };

  app.route('/api/stock-prices')
    .get(function(req, res) {
      let stock = [];
      const query = req.query.stock;
      const like = req.query.like;

      // Process query data
      if (typeof query === 'string') {
        stock.push(query.toUpperCase());
      } else {
        for (let i = 0; i <= query.length; i++) {
          if (query[i] !== undefined) {
            stock.push(query[i].toUpperCase());
          };
        };
      };
      
      function getStockData(callback) {
        // Get stock data from stock price API
        const stockDataPromises = stock.map((symbol) => {
          return new Promise((resolve, reject) => {
            https.get(
              `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`,
              (response) => {
                let responseData = '';
      
                response.on('data', (chunk) => {
                  responseData += chunk;
                });
      
                response.on('end', () => {
                  resolve(JSON.parse(responseData));
                });
              })
              .on('error', (error) => {
                reject(error);
              });
          });
        });
        Promise.all(stockDataPromises)
          .then((results) => {
            callback(results);
          })
          .catch((error) => {
            console.error('Error in getStockData:', error.message);
          });
      };
      
      function processStockData(stockData) { 
        let output = [];
        // Process data from stock price API and make response 
        if (stockData.length === 1) {
          output = {
            stock: stockData[0].symbol,
            price: stockData[0].latestPrice,
            likes: likeData[0],
          };
        } else {
          for(let i = 0; i < stockData.length; i++) {
            output.push({
              stock: stockData[i].symbol,
              price: stockData[i].latestPrice,
              rel_likes: likeData[i] - likeData[Math.abs(i - 1)],
            });
          };
        };
        res.json({ "stockData": output });
      };
      
      let likeData = [0 ,0];
      // Get number of likes or make new entry in database
      async function getDBdata() {
        for(let i = 0; i < stock.length; i++) {
          let dbentry = await Likes.findOne({ stock: stock[i] })
          if (!dbentry) {
            let newEntry = new Likes({ stock: stock[i], likes: 0 })
            await newEntry.save();
          } else {
            likeData[i] = dbentry.likes;
          };
          // Client likes stock
          if (like == 'true') {
            let alreadyLiked = await incLikes(stock[i], req);
            if(!alreadyLiked) {
              likeData[i] += 1;
            };
          };
        };
      };  
      
      async function stockPriceCheck() {
        await getDBdata();
        getStockData(processStockData);
      };

      stockPriceCheck();
    });

};
