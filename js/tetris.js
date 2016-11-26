/**
 * Created by Anykey on 18.11.2016.
 *
 */
'use strict';
const KEY_LEFT  = 37;
const KEY_UP    = 38;
const KEY_RIGHT = 39;
const KEY_DOWN  = 40;

const RECT_SIZE    = 25;
const FIELD_WIDTH  = 10;
const FIELD_HEIGHT = 20;

var paper = Raphael('canvas', FIELD_WIDTH * RECT_SIZE, FIELD_HEIGHT * RECT_SIZE);

function Field(width, height) {
  this.field    = [];
  this.width    = width;
  this.height   = height;
  this.rendered = null;
  
  // Fill with empty matrix
  for (var i = 0; i < height; i++) {
    this.field[i] = [];
    for (var j = 0; j < width; j++) {
      this.field[i][j] = 0;
    }
  }
  
  //Draw border
  paper.rect(0, 0, RECT_SIZE * FIELD_WIDTH, RECT_SIZE * FIELD_HEIGHT).attr({
    stroke: 'red'
  })
}

Field.prototype.clear = function () {
  if (this.rendered !== null) {
    this.rendered.remove();
    this.rendered.clear();
  }
};

Field.prototype.render = function () {
  this.clear();
  paper.setStart();
  this.field.forEach(function (row, y) {
    row.forEach(function (col, x) {
      if (col)
        paper.rect(x * RECT_SIZE, y * RECT_SIZE, RECT_SIZE, RECT_SIZE).attr({
          fill  : 'black',
          stroke: 'red'
        });
    })
  });
  this.rendered = paper.setFinish();
};


Field.prototype.merge = function (figure) {
  var self = this;
  figure.model.forEach(function (row, y) {
    row.forEach(function (value, x) {
      if (value === 1) self.field[y + figure.offset.y][x + figure.offset.x] = 1;
    });
  })
};

Field.prototype.willCollide = function (figure) {
  const m = figure.model, o = figure.offset, f = this.field;
  for (var y = 0; y < m.length; y++) {
    for (var x = 0; x < m[y].length; x++) {
      if (m[y][x] === 1 &&
          (f[y + o.y] && f[y + o.y][x + o.x]) !== 0)
        return true;
    }
  }
  return false;
};

Field.prototype.getFilledRows = function () {
  const f = this.field;
  
  var filled_rows = [];
  
  for (var y = 0; y < f.length; y++) {
    var row_is_filled = true;
    
    for (var x = 0; x < f[y].length; x++) {
      if (f[y][x] == 0) {
        row_is_filled = false;
        break;
      }
    }
    
    if (row_is_filled) filled_rows[filled_rows.length] = y;
  }
  
  return filled_rows;
};

Field.prototype.removeRow = function (y) {
  
  for (var i = y; i > 0; i--) {
    this.field[i] = this.field[i - 1].slice();
  }
  
};

function Figure() {
  this.offset   = {x: 3, y: 0};
  this.ticks    = 0;
  this.rendered = null;
  this.model    = this.generate();
}

Figure.prototype.generate = function () {
  var models = [
    [// T
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    [// L
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1]
    ],
    [// J
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0]
    ],
    [// S
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0]
    ],
    [// Z
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1]
    ],
    [// O
      [1, 1],
      [1, 1]
    ],
    [// I
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0]
    ]
  ];
  
  return models[parseInt(Math.random() * models.length)]
};

Figure.prototype.rotate = function (direction) {
  const matrix = this.model;
  for (var y = 0; y < matrix.length; ++y) {
    for (var x = 0; x < y; ++x) {
      [
        matrix[x][y],
        matrix[y][x]
      ] = [
        matrix[y][x],
        matrix[x][y]
      ];
    }
  }
  
  if (direction > 0) {
    matrix.forEach(function (row) { row.reverse()});
  }
  else {
    matrix.reverse();
  }
  
  return this.model;
};

Figure.prototype.clear = function () {
  if (this.rendered !== null) {
    this.rendered.remove();
    this.rendered.clear();
  }
};

Figure.prototype.render = function () {
  var self = this;
  this.clear();
  
  paper.setStart();
  this.model.forEach(function (row, y) {
    row.forEach(function (col, x) {
      if (col)
        paper.rect((x + self.offset.x) * RECT_SIZE, (y + self.offset.y) * RECT_SIZE, RECT_SIZE, RECT_SIZE).attr({
          fill  : 'black',
          stroke: 'red'
        });
    })
  });
  this.rendered = paper.setFinish();
};


function Game() {
  this.field  = new Field(FIELD_WIDTH, FIELD_HEIGHT);
  this.figure = new Figure();
  this.score  = new Score();
}
Game.prototype.rotate = function (direction) {
  this.figure.rotate(direction);
  
  if (this.field.willCollide(this.figure)) {
    this.figure.rotate(direction * -1);
  }
  
  this.nextAnimationFrame();
};
Game.prototype.move   = function (direction) {
  this.figure.offset.x += direction;
  
  if (this.field.willCollide(this.figure)) {
    this.figure.offset.x -= direction;
  }
  this.nextAnimationFrame();
};

Game.prototype.nextTick = function () {
  this.figure.ticks++;
  if (!this.moveDown(true) && !this.nextFigure()) this.gameOver();
};

Game.prototype.gameOver = function () {
  this.field.clear();
  this.figure.clear();
  this.score.clear();
  
  this.field  = new Field(FIELD_WIDTH, FIELD_HEIGHT);
  this.figure = new Figure();
};

Game.prototype.moveDown = function (byTick) {
  // If figure was just created
  // need to skip "down" key
  if (this.figure.ticks == 0 && !byTick) return true;
  
  var free_way = true;
  this.figure.offset.y++;
  
  if (this.field.willCollide(this.figure)) {
    this.figure.offset.y--;
    free_way = false;
  }
  
  this.nextAnimationFrame();
  return free_way;
};

Game.prototype.nextAnimationFrame = function () {
  this.figure.render();
  this.field.render();
  
};

Game.prototype.checkFilledRows = function () {
  var filled_rows = this.field.getFilledRows();
  var count       = filled_rows.length;
  
  if (count > 0) {
    const f = this.field;
    filled_rows.forEach(function (row_index) {
      f.removeRow(row_index);
    });
    this.field.render();
    this.updateScore(count);
  }
};

Game.prototype.nextFigure = function () {
  this.field.merge(this.figure);
  
  this.checkFilledRows();
  
  this.figure.clear();
  this.figure = new Figure();
  
  this.nextAnimationFrame();
  // Check for the end
  return !this.field.willCollide(this.figure);
};

Game.prototype.updateScore = function (score) {
  this.score.update(score)
};

function KeyboardButton(id, listener) {
  var self        = this;
  this.domElement = $('button#' + id);
  
  this.domElement.on('click', function () {
    self.domElement.addClass('btn-success');
    setTimeout(function () {
      self.domElement.removeClass('btn-success');
    }, 200);
    listener();
  });
  
  
}

function KeyboardListener(options) {
  $(document).on('keydown', function (e) {
    if (options['' + e.keyCode]) {
      e.preventDefault();
      options[e.keyCode]();
    }
  });
}

function Score() {
  var self      = this;
  this.score    = 0;
  this.maxScore = localStorage.getItem('tetris-maxScore') || 0;
  
  this.scoreSpan    = null;
  this.maxScoreSpan = null;
  
  $(function () {
    self.scoreSpan    = $('#score');
    self.maxScoreSpan = $('#maxScore').text(self.maxScore);
  })
}

Score.prototype.update = function (score) {
  this.score += score;
  if (this.score > this.maxScore) {
    this.maxScore = this.score;
    localStorage.setItem('tetris-maxScore', this.score);
    this.maxScoreSpan.text(this.maxScore);
  }
  
  this.scoreSpan.text(this.score);
};

Score.prototype.clear = function () {
  this.score = 0;
  this.scoreSpan.text(0);
};


$(function () {
  var game    = new Game();
  game.figure = new Figure();
  
  setInterval(game.nextTick.bind(game), 1000);
  
  var listener_options        = {};
  listener_options[KEY_LEFT]  = function () {game.move(-1)};
  listener_options[KEY_RIGHT] = function () {game.move(1)};
  listener_options[KEY_DOWN]  = function () {if (!game.moveDown(false)) game.nextFigure() };
  listener_options[KEY_UP]    = function () {game.rotate(1) };
  
  
  new KeyboardButton('btnUp', listener_options[KEY_UP]);
  new KeyboardButton('btnDown', listener_options[KEY_DOWN]);
  new KeyboardButton('btnLeft', listener_options[KEY_LEFT]);
  new KeyboardButton('btnRight', listener_options[KEY_RIGHT]);
  
  new KeyboardListener(listener_options);
  $(window).on('scroll', function () {return false});
});
