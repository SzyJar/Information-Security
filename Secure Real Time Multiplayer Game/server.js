require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket = require('socket.io');
const cors = require('cors');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');
const helmet = require('helmet');

const app = express();


// Helmet directives
app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(helmet.noCache());
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' }));

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({origin: '*'})); 

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }); 

//For FCC testing purposes
fccTestingRoutes(app);
    
// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

// Set up server and tests
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

// Import "Player" and "Collectible" classes
const Collectible = require('./public/Collectible.mjs');
const Player = require('./public/Player.mjs');

// Current game state is stored here
const gameState = {
  cookie: new Collectible({x: 300, y: 200, value: 1, id: 'cookie'}),
  players: [],
};
// Canvas size
const canvas = { width: 640, height: 480 }

// Socket.io server side setup, handle game logic
const s_server = socket(server);
s_server.sockets.on('connect', (socket) => {
  console.log(`\x1b[32mNew client connected!\x1b[0m\nClient ID: ${socket.id}\n`);
  // Spawn new player, random position
  let x = Math.floor(Math.random() * (640 - 30 + 1) + 30);
  let y = Math.floor(Math.random() * (480 - 30 + 1) + 30);

  gameState.players.push(
    new Player({x: x, y: y, score: 0, id: socket.id})
  );
  
  // Update rank
  gameState.players.forEach(player => {
    player.calculateRank(gameState.players);
  });
  
  // Send updated game state to all clients
  socket.broadcast.emit('gameState', gameState);
  socket.emit('gameState', gameState);
  
  socket.on('playerMoveCommand', (keyCode) => {
    const index = gameState.players.findIndex(player => player.id === socket.id);
    // Proccess only move key codes
    if ([87, 83, 65, 68, 38, 40, 37, 39].includes(keyCode)) {
      let command = '';
      const speed = 10; // Movement speed
      // Change player postion
      if ([87, 38].includes(keyCode)) {
        if (gameState.players[index].y > 30) {
          command = 'up';
        };
      } else if ([83, 40].includes(keyCode)) {
        if (gameState.players[index].y < canvas.height - 40) {
          command = 'down';
        };
      } else if ([65, 37].includes(keyCode)) {
        if (gameState.players[index].x > 30) {
          command = 'left';
        };
      } else if ([68, 39].includes(keyCode)) {
        if (gameState.players[index].x < canvas.width - 30) {
          command = 'right';
        };
      };

      gameState.players[index].movePlayer(command, speed);
      
      // Check if player got cookie (objective)
      if (gameState.cookie.x + 20 > gameState.players[index].x
          && gameState.cookie.x - 20 < gameState.players[index].x
          && gameState.cookie.y + 20 > gameState.players[index].y
          && gameState.cookie.y - 20 < gameState.players[index].y) {
        gameState.players[index].collision(gameState.cookie.value);
        // Spawn new cookie
        let x = Math.floor(Math.random() * (640 - 30 + 1) + 30);
        let y = Math.floor(Math.random() * (480 - 30 + 1) + 30);
        gameState.cookie.y = y;
        gameState.cookie.x = x;
      };
    };
    
    // Update rank
    gameState.players.forEach(player => {
      player.calculateRank(gameState.players);
    });
    
    // Send updated game state to all clients
    socket.broadcast.emit('gameState', gameState);
    socket.emit('gameState', gameState);
  });
  
  socket.on('disconnect', () => {
    console.log(`\x1b[31mClient disconnected!\x1b[0m\nClient ID: ${socket.id}\n`)
    // Remove player from the game
    const playerIndex = gameState.players.findIndex((player) => player.id === socket.id);
    if (playerIndex !== -1) {
      gameState.players.splice(playerIndex, 1);
    }

    // Update rank
    gameState.players.forEach(player => {
      player.calculateRank(gameState.players);
    });
    
    // Send updated game state to all clients
    socket.broadcast.emit('gameState', gameState);
    socket.emit('gameState', gameState);
  });
});


module.exports = app; // For testing
