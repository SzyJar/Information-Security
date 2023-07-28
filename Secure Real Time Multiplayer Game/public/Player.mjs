class Player {
  constructor({x, y, score, id}) {
    this.x = x;
    this.y = y
    this.score = score;
    this.id = id;
    this.rank = 'None';
  }

  movePlayer(dir, speed) {
    if (['left', 'right', 'up', 'down'].includes(dir)) {
      switch (dir) {
        case 'left':
          this.x -= speed;
          break;
        case 'right':
          this.x += speed;
          break;
        case 'down':
          this.y += speed;
          break;
        case 'up':
          this.y -= speed;
          break;
      };
    };
  }

  collision(item) {
    this.score += item;
    return true;
  }

  calculateRank(arr) {
    const scoresArray = arr.map(player => player.score);
    const sortedArr = scoresArray.slice().sort((a, b) => b - a);
    const rank = sortedArr.indexOf(this.score) + 1;

    this.rank = rank;
    return `Rank: ${rank} / ${arr.length}`
  }
}

/*
  Note: Attempt to export this for use
  in server.js
*/
try {
  module.exports = Player;
} catch(e) {}

export default Player;
