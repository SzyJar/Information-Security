const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');


// Colors
const COOKIE_COLOR = '#F5F5DC';
const PLAYER_COLOR = '#3CFB49';
const OPPONENT_COLOR = '#F9B4B4';
const BG_COLOR = '#333';
const PLAYER_SIZE = 20;
//


// If key is pressed down sent it to server
function keydown(event) {
  // Send only WSAD and arrow keys codes
  if ([87, 83, 65, 68, 38, 40, 37, 39].includes(event.keyCode)) {
    socket.emit('playerMoveCommand', event.keyCode)
  };
};

function drawCharacter(character, type) {
  let color = OPPONENT_COLOR
  if (type === 'player') {
    color = PLAYER_COLOR;
  };
  // Draw the circle
  context.beginPath();
  context.arc(character.x, character.y, PLAYER_SIZE, 0, 2 * Math.PI);
  context.fillStyle = color;
  context.fill();
  
  // Display character score
  context.font = `${PLAYER_SIZE}px Arial`;
  context.fillStyle = '#000000';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(character.score.toString(), character.x, character.y);

  // Display character rank
  context.font = `${PLAYER_SIZE / 2}px Arial`;
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.fillText(`RANK: ${character.rank.toString()}`, character.x, character.y + PLAYER_SIZE + 2);
};


function drawGame(state) {
  // Erase previous game state
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = BG_COLOR;
  context.fillRect(0,0, canvas.width, canvas.height);
  // Draw cookie (objective)
  let size = state.cookie.value * 10;
  context.fillStyle = COOKIE_COLOR;
  context.fillRect(state.cookie.x, state.cookie.y, size, size);
  // Draw all players
  for (let player of state.players) {
    if(player.id !== socket.id) {
      drawCharacter(player, 'opponent');
    } else {
      drawCharacter(player, 'player');
    };
  };
};


socket.on('connect', () => {
  console.log(`\x1b[32mConnected to the server!\x1b[0m\nClient ID: ${socket.id}\n`)
  document.addEventListener('keydown', keydown);
  
  socket.on('gameState', (state) => {
    drawGame(state);
  });
});

socket.on('disconnect', () => {
  console.log('\x1b[31mDisconnected from the server!\x1b[0m');
});
