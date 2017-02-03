var robot = require('robotjs');

// Cache screen size
var screenSize = robot.getScreenSize();

var Scanner = require ('./Scanner');

var Learner = require('./Learner');

// COLOR DEFINITIONS
// This is the Dino's colour, also used by Obstacles.
var COLOR_DINOSAUR = '535353';
var COLOR_DINOSAUR_INVERTED = 'ACACAC';

var GameManipulator = {

  // Stores the game position (Globally)
  offset: null,
  width: null,

  // Stores points (jumps)
  points: 0,

  //Stores reward
  reward: 0,
  maxReward: 0,
  maxRewardPlayNum: 0,

  // Listners
  onGameEnd: null,
  onGameStart: null,
  onSensorData: null,

  // Game State
  gamestate: 'OVER',

  // GameOver Position
  gameOverOffset: [190, -82],

  // Stores an array of "sensors" (Ray tracings)
  // Positions are always relative to global "offset"
  sensors: [
    {//Sensor for the detection of small cacti
      lastValue: 1,

      value: null,
      offset: [90,-20],
      //offset: [84, -15],
      step: [4, 0],
      length: 0.6,

      // Speed
      speed: 0,
      lastComputeSpeed: 0,

      // Computes size of the object
      size: 0,
      computeSize: true,
    },
    {//Sensor for the detection of large cacti
      lastValue: 1,

      value: null,
      //offset: [69, -40], 
      offset: [90,-40],
      step: [4, 0],
      length: 0.6,

      // Speed
      speed: 0,
      lastComputeSpeed: 0,

      // Computes size of the object
      size: 0,
      computeSize: true,
    },
    {//Sensor for the detection of pterodactyls
      lastValue: 1,

      value: null,
      //offset: [69, -60], 
      offset: [90,-60],
      step: [4, 0],
      length: 0.6,

      // Speed
      speed: 0,
      lastComputeSpeed: 0,

      // Computes size of the object
      size: 0,
      computeSize: true,
    },
  ]
};

//Checks whether it is inverted (Night)
GameManipulator.isInverted = function (){
  //Checking if GameManipulator.offset exists
  if(GameManipulator.offset){
    if(robot.getPixelColor(GameManipulator.offset[0]+1,GameManipulator.offset[1]+25) == '000000')
      return true;
    else
      return false;
  }
  //If GameManipulator.offset does not exist, then game is played for first time, and so not inverted
  return false;
}

//Returns the color of the dinosaur
GameManipulator.getDinoColor = function(){
  if(GameManipulator.isInverted())
    return COLOR_DINOSAUR_INVERTED;
  else
    return COLOR_DINOSAUR;
}

//First, a random pixel of dinosaur is found.
//Using this, the leftmost pixel in the horizontal line (start of the game) is found.
GameManipulator.findDinoPosition = function(){
	var dinoPos, skipXFast = 15;
 	var dinoColor = GameManipulator.getDinoColor();

  	for (var x = 20; x < screenSize.width; x+= skipXFast) {
    dinoPos = Scanner.scanUntil(
      // Start position
      [x, 80],
      // Skip pixels
      [0, skipXFast],
      // Searching Color
      dinoColor,
      // Normal mode (not inverse)
      false,
      // Iteration limit
      500 / skipXFast);

    if (dinoPos) {
      break;
    }
  }

  if (!dinoPos) {
    return null;
  }
  return dinoPos;
}

// Find the start of the game
GameManipulator.findGamePosition = function () {
  
  var dinoColor = GameManipulator.getDinoColor();
  var dinoPos = GameManipulator.findDinoPosition();

  for (var x = dinoPos[0] - 50; x <= dinoPos[0]; x += 1) {
    startPos = Scanner.scanUntil(
      // Start position
      [x, dinoPos[1] - 2],
      // Skip pixels
      [0, 1],
      // Searching Color
      dinoColor,
      // Normal mode (not inverse)
      false,
      // Iteration limit
      100);

    if (startPos) {
      break;
    }
  }

  // Did actually found? If not, error!
  if (!startPos) {
    return null;
  }

  // Find the end of the game
  var endPos = startPos;

  while (robot.getPixelColor(endPos[0] + 3, endPos[1]) == dinoColor) {
     endPos = Scanner.scanUntil(
        // Start position
        [endPos[0] + 2, endPos[1]],
        // Skip pixels
        [2, 0],
        // Searching Color
        dinoColor,
        // Invert mode
        true,
        // Iteration limit
        600);
  }

  // Did actually found? If not, error!
  if (!endPos) {
    return null;
  }

  // Save to allow global access
  GameManipulator.offset = startPos;
  GameManipulator.width = 600;//endPos[0] - startPos[0];
 
  return startPos;
};


// Read Game state
// (If game is ended or is playing)
GameManipulator.readGameState = function () {
	var dinoColor = GameManipulator.getDinoColor();
  // Read GameOver
  var found = Scanner.scanUntil(
    [
      GameManipulator.offset[0] + GameManipulator.gameOverOffset[0],
      GameManipulator.offset[1] + GameManipulator.gameOverOffset[1]
    ],

    [2, 0], dinoColor, false, 20);

  if (found && GameManipulator.gamestate != 'OVER') {
    GameManipulator.gamestate = 'OVER';

    // Clear keys
    GameManipulator.setGameOutput(0.5);
    robot.keyToggle('up', 'up');
    robot.keyToggle('down', 'up');

    // Trigger callback and clear
    GameManipulator.onGameEnd && GameManipulator.onGameEnd(GameManipulator.reward);
    GameManipulator.onGameEnd = null;

    // console.log('GAME OVER: '+GameManipulator.points);

  } else if (!found && GameManipulator.gamestate != 'PLAYING') {
    GameManipulator.gamestate = 'PLAYING';

    // Clear points
    GameManipulator.points = 0;
    GameManipulator.reward = 0;
    GameManipulator.lastScore = 0;

    // Clear keys
    GameManipulator.setGameOutput(0.5);

    //Clear all sensors
    for(var k in GameManipulator.sensors){
      GameManipulator.sensors[k].lastComputeSpeed = 0;
      GameManipulator.sensors[k].lastSpeeds = [];
      GameManipulator.sensors[k].lastValue = 1;
      GameManipulator.sensors[k].value = 1;
      GameManipulator.sensors[k].speed = 0;
      GameManipulator.sensors[k].size = 0;
    }

    // Clar Output flags
    GameManipulator.lastOutputSet = 'NONE';

    // Trigger callback and clear
    GameManipulator.onGameStart && GameManipulator.onGameStart();
    GameManipulator.onGameStart = null;

    // console.log('GAME RUNNING '+GameManipulator.points);
  }
}


// Call this to start a fresh new game
// Will wait untill game has ended,
// and call the `next` callback
var _startKeyInterval;
GameManipulator.startNewGame = function (next) {
  
  // Refresh state
  GameManipulator.readGameState();

  // If game is already over, press space
  if (GameManipulator.gamestate == 'OVER') {
    //console.log("Reached if of startNewGame");

    clearInterval(_startKeyInterval);

    // Set start callback
    GameManipulator.onGameStart = function (argument) {
      //console.log("Reached onGameStart inside startNewGame");
      clearInterval(_startKeyInterval);
      next && next();
    };

    // Press space to begin game (repetidelly)
    _startKeyInterval = setInterval(function (){
      // Due to dino slowly gliding over the screen after multiple restarts, its better to just reload the page
      GameManipulator.reloadPage();
      setTimeout(function() {
        // Once reloaded we wait 0.5sec for it to let us start the game with a space.
          robot.keyTap(' ');
      }, 500);
    }, 300);

    // Refresh state
    GameManipulator.readGameState();

  } else {
    //console.log("Reached else of startNewGame");
    // Wait die, and call recursive action
    GameManipulator.onGameEnd = function () {
      //console.log("Reached onGameEnd inside startNewGame");
      GameManipulator.startNewGame(next);
    }
  }


}

// reload the page
GameManipulator.reloadPage = function ()
{ 
  var startTime = Date.now();
  // retrieves platform
  var platform = process.platform;

  if(/^darwin/.test(process.platform)) {
    robot.keyTap('r','command');
  }
  else{
    robot.keyTap('r','control');
  }
  robot.keyTap(' ');
}


// Compute points based on sensors
// Basicaly, checks if an object has passed trough the sensor and the value is now higher than before
GameManipulator.computePoints = function () {
  for (var k in GameManipulator.sensors) {
    var sensor = GameManipulator.sensors[k];
    
    if(sensor.value > 0.4 && sensor.lastValue < 0.2){
      GameManipulator.reward++;
    }
  } 
  
  //In case of a large cactus, both sensor[0] and sensor[1] will satisfy the above condition. So, points is incremented twice.
  //This code removes this extra point
  if(GameManipulator.sensors[0].value > 0.4 && GameManipulator.sensors[0].lastValue < 0.2 
    && GameManipulator.sensors[1].value > 0.4 && GameManipulator.sensors[1].lastValue < 0.2){
    GameManipulator.reward--;
  }
  if(GameManipulator.reward >= GameManipulator.maxReward){
    GameManipulator.maxReward = GameManipulator.reward;
    GameManipulator.maxRewardPlayNum = Learner.playCount;
  }
}

// Read sensors
// Sensors are like ray-traces: They have a starting point, and a limit to search for.
// Each sensor can gatter data about the DISTANCE of the object, it's SIZE and it's speed
// Note: There are currently 3 sensors.
GameManipulator.readSensors = function () {
  var offset = GameManipulator.offset;
  var dinoPos = GameManipulator.findDinoPosition();
  var startTime = Date.now();

  for (var k in GameManipulator.sensors) {

    var sensor = GameManipulator.sensors[k];

    // Calculate absolute position of ray tracing
    var start = [dinoPos[0] + 50, offset[1] + sensor.offset[1]];

    var dinoColor = GameManipulator.getDinoColor();

    var end = Scanner.scanUntil(
      // console.log(
        // Start position
        [start[0], start[1]],
        // Skip pixels
        sensor.step,
        // Searching Color
        dinoColor,
        // Invert mode?
        false,
        // Iteration limit
        (GameManipulator.width * sensor.length) / sensor.step[0]);

    // Save lastValue
    sensor.lastValue = sensor.value;

    // Calculate the Sensor value
    if (end) {
      sensor.value = (end[0] - start[0]) / (GameManipulator.width * sensor.length);

      // Calculate size of obstacle
      var endPoint = Scanner.scanUntil(
        [end[0] + 75, end[1]],
        [-2, 0],
        dinoColor,
        false,
        75 / 2
      );

      // If no end point, set the start point as end
      if (!endPoint) {
        endPoint = end;
      }

      var sizeTmp = (endPoint[0] - end[0]) / 100.0;
      if (GameManipulator.reward == sensor.lastScore) {
        // It's the same obstacle. Set size to "max" of both
        sensor.size = Math.max(sensor.size, sizeTmp);
      } else {
        sensor.size = sizeTmp;
      }


      // We use the current score to check for object equality
      sensor.lastScore = GameManipulator.reward;

      // sensor.size = Math.max(sensor.size, endPoint[0] - end[0]);

    } else {
      sensor.value = 1;
      sensor.size = 0;
    }

    var dt = (Date.now() - sensor.lastComputeSpeed) / 1000;
    sensor.lastComputeSpeed = Date.now();
    if (sensor.value < sensor.lastValue) {
      sensor.speed = (sensor.lastValue - sensor.value) / dt;
    }

    // Save length/size of sensor value
    sensor.size = Math.min(sensor.size, 1.0);

    startTime = Date.now();
  }

  // Compute points
  GameManipulator.computePoints();

  // Call sensor callback (to act)
  GameManipulator.onSensorData && GameManipulator.onSensorData();
}


// Set action to game
// Values:
//  0.0: DOWN (DUCK)
//  0.5: NOTHING (NORM)
//  1.0: UP (JUMP)
var PRESS = 'down';
var RELEASE = 'up';

GameManipulator.lastOutputSet = 'NONE';
GameManipulator.lastOutputSetTime = 0;

GameManipulator.setGameOutput = function (output){

  GameManipulator.gameOutput = output;
  GameManipulator.gameOutputString = GameManipulator.getDiscreteState(output);

  if (GameManipulator.gameOutputString == 'DUCK') {
    robot.keyToggle('up', RELEASE);
    robot.keyToggle('down', PRESS);
  } else if (GameManipulator.gameOutputString == 'NORM') {
    // DO Nothing
  } else {
    robot.keyToggle('up', PRESS);
    robot.keyToggle('down', RELEASE);
  }

  GameManipulator.lastOutputSet = GameManipulator.gameOutputString;
}

// This function maps a real number to the corresponding string action
GameManipulator.getDiscreteState = function (value){
  if (value == 0.0) {
    return 'DUCK';
  } else if(value == 1.0) {
    return 'JUMP';
  } else{
    return 'NORM';
  } 
}

// Click on the starting point to make sure game is focused
GameManipulator.focusGame = function (){
  robot.mouseClick('left');
}

module.exports = GameManipulator;