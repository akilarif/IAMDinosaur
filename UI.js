var contrib = require('blessed-contrib')
var blessed = require('blessed')
var fs = require('fs');
var robot = require('robotjs');

var screen = blessed.screen()

var UI = {};

var savegame = function(){
  if(!UI.learner.agent){
    UI.logger.log('Agent is empty');
  }else{
    var jsonPlay = UI.learner.agent.toJSON();

    UI.logger.log('Saving the play...');

    var dir = './plays';
    var fileName = dir + '/play_'+UI.learner.playCount+'_'+UI.gm.reward+'_'+Date.now()+'.json';
    fs.writeFile(fileName, JSON.stringify(jsonPlay), function (err){
      if (err) {
        UI.logger.log('Failed to save! '+err);
      } else {
        UI.logger.log('Saved to '+fileName);
      }

      UI.refreshFiles();
    });
  
  }
  
};


// Initialize UI objects
UI.init = function (gameManipulator, learner) {
  UI.gm = gameManipulator;
  UI.learner = learner;

  UI.grid = new contrib.grid({
    rows: 12,
    cols: 6,
    screen: screen
  });


  // Build Sensor inputs
  UI.uiSensors = UI.grid.set(0, 0, 3, 6, contrib.bar, {
    label: 'Network Inputs',
    // bg: 'white',
    barWidth: 4,
    barSpacing: 1,
    xOffset: 0,
    maxHeight: 100,
  });


  // Build Log box
  UI.logger = UI.grid.set(3, 0, 3, 6, contrib.log, {
    fg: 'green',
    selectedFg: 'green',
    label: 'Logs'
  });


  // Current score/time view
  UI.uiScore = UI.grid.set(6, 0, 3, 3, blessed.Text, {
    label: 'Game Stats',
    // bg: 'green',
    fg: 'white',
    content: 'Loading...',
    align: 'center',
  });


  // Current Genomes stats
  UI.uiGenomes = UI.grid.set(6, 3, 3, 3, blessed.Text, {
    label: 'Play Stats',
    // bg: 'green',
    fg: 'white',
    content: 'Hey!',
    align: 'center',
  });


  // Load Tree
  UI.savesTree = UI.grid.set(9, 0, 3, 3, contrib.tree, {
    label: 'Saved Genomes',
  });


  // Callback for Loading genomes and focusing tree
  screen.key(['l','L'], UI.savesTree.focus.bind(UI.savesTree));
  UI.savesTree.on('click', UI.savesTree.focus.bind(UI.savesTree));
  UI.savesTree.on('select', function (item){

    if (item.isFile) {
      var fileName = item.name;

      UI.logger.log('Loading the play from file:');
      UI.logger.log(fileName);

      var play = require('./plays/'+fileName);

      UI.learner.loadPlay(play);
    } else {
      UI.refreshFiles();
    }
  });

  UI.refreshFiles();


  // Save Btn
  UI.btnSave = UI.grid.set(9, 3, 3, 3, blessed.box, {
    label: 'Save to File',
    bg: 'green',
    fg: 'red',
    content: '\n\n\n\nSave The Play',
    align: 'center',
  });

  UI.btnSave.on('click', savegame())
  screen.key(['o','O'], savegame());

  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
  });

  screen.key(['s'], function (ch, key){
    if (learner.state == 'STOP') {
      learner.state = 'LEARNING';
      gameManipulator.focusGame();
      learner.startLearning();
    } else {
      learner.state = 'STOP';
      robot.keyToggle('up', 'up');
      robot.keyToggle('down', 'up');
    }
  });

  screen.render()
};


// Read entire folder and select files that match a .json file
UI.refreshFiles = function (){
  var files = [];
  var fileData = {
    name: 'Saved Files',
    extended: true,
    children: [{
      name: 'Refresh Folders'
    }]
  };

  // Populate tree
  UI.logger.log('Reading plays directory...')
  var files = fs.readdirSync('./plays');
  for (var k in files) {
    if (files[k].indexOf('.json') >= 0) {

      fileData.children.push({
        name: files[k],
        isFile: true,
      });

    }
  }

  UI.savesTree.setData(fileData);
}


// Updates data on the screen and render it
UI.render = function () {

  // Update data
  UI.uiSensors.setData({
    titles: ['Distance 1', 'Size 1', 'Speed 1', 'Distance 2', 'Size 2', 'Speed 2', 'Distance 3', 'Size 3', 'Speed 3', 'Activation'],
    data: [
      Math.round(UI.gm.sensors[0].value * 100),
      Math.round(UI.gm.sensors[0].size * 100),
      Math.round(UI.gm.sensors[0].speed * 100),
      Math.round(UI.gm.sensors[1].value * 100),
      Math.round(UI.gm.sensors[1].size * 100),
      Math.round(UI.gm.sensors[1].speed * 100),
      Math.round(UI.gm.sensors[2].value * 100),
      Math.round(UI.gm.sensors[2].size * 100),
      Math.round(UI.gm.sensors[2].speed * 100),
      Math.round(UI.gm.gameOutput * 100),
    ]
  })

  // Set Genome stats and score
  var learn = UI.learner;
  var uiStats = '';
  uiStats += 'Status: ' + learn.state + '\n';
  uiStats += 'Play: ' + learn.playCount + '\n';
  uiStats += 'Reward: ' + UI.gm.reward + '\n';
  uiStats += 'GameStatus: ' + UI.gm.gamestate + '\n';
  uiStats += 'Inverted: ' + UI.gm.isInverted();
  UI.uiScore.setText(uiStats);

  if (UI.gm.gameOutputString) {
    var str = '';
    str += 'Action: ' + UI.gm.gameOutputString + '\n';
    str += 'Activation: ' + UI.gm.gameOutput + '\n';
    str += 'Maximum Reward: ' + UI.gm.maxReward + '\n';
    str += 'Achieved at Play: ' + UI.gm.maxRewardPlayNum + '\n';
    UI.uiGenomes.setText(str);
  } else {
    UI.uiGenomes.setText('Loading...');
  }

  // Render screen
  screen.render();
}

// Continuously render screen
setInterval(UI.render, 25);

module.exports = UI;
