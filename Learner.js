var RL = require('./rl');
var R = require('./r');
var robot = require('robotjs');
var async = require('async');
var _ = require('lodash');

var GameManipulator = require('./GameManipulator');

// Create Environment
var env = {};
env.getNumStates = function() { return 7; }
env.getMaxNumActions = function() { return 3; }
env.sampleNextState=function(action){
  
  if(action == 0){
    Learn.gm.setGameOutput(0.5);
  } 
  else if(action == 1){
    Learn.gm.setGameOutput(1.0);
  } 
  else if(action == 2){
    Learn.gm.setGameOutput(0.0);
  } 
  
  if(Learn.gm.gamestate == 'OVER' && Learn.gm.points == 0){
    Learn.gm.reward-=1000;
    Learn.gm.points--;
  }
  return Learn.gm.reward;
}

// Initialise spec
var spec = {};
spec.update = 'qlearn'; // qlearn | sarsa 
spec.gamma = 0.6; // discount factor, [0, 1)
spec.epsilon = 0.2; // initial epsilon for epsilon-greedy policy, [0, 1)
spec.alpha = 0.01; // value function learning rate
spec.num_hidden_units_1 = 3; // number of neurons in hidden layer 1
spec.num_hidden_units_2 = 3; // number of neurons in hidden layer 2
/*spec.experience_add_every = 10; // number of time steps before we add another experience to replay memory
spec.experience_size = 5000; // size of experience replay memory
spec.learning_steps_per_iteration = 20;
spec.tderror_clamp = 1.0; // for robustness*/

// Create the Agent
var agent = new RL.DQNAgent(env, spec);

var Learn = {
  // Current state of learning [STOP, LEARNING]
  state: 'STOP',
  playCount: 0,
};


// Initialize the Learner
Learn.init = function (gameManipulator, ui) {
  Learn.gm = gameManipulator;
  Learn.ui = ui;
  Learn.playCount = 0;

}


// This is the function in which learning occurs
Learn.startLearning = function () {

  if (Learn.state == 'STOP') {
    robot.keyToggle('up', 'up');
    robot.keyToggle('down', 'up');
    return;
  }
  Learn.playCount++;
  Learn.ui.logger.log('Executing Play '+Learn.playCount);

  Learn.gm.startNewGame(function (){

    Learn.gm.onSensorData = function(){

      //Set of sensor inputs constitute a state 
      var state = [
        Learn.gm.sensors[0].value,
        Learn.gm.sensors[0].size,
        Learn.gm.sensors[0].speed,
        Learn.gm.sensors[1].value,
        Learn.gm.sensors[1].size,
        Learn.gm.sensors[2].value,
        Learn.gm.sensors[2].size
      ];
      
      // Get an action which is possible in the current state
      var action = agent.act(state);
       
      // Execute action in environment and get the reward
      var reward_action = env.sampleNextState(action);

      // The agent learns from the reward and improves its Q, policy, model, etc.
      agent.learn(reward_action);
    } 

    // onGameEnd Listener
    Learn.gm.onGameEnd = function (reward){

      Learn.ui.logger.log('Play '+Learn.playCount+' ended. Reward: '+reward);
      robot.keyToggle('up', 'up');
      robot.keyToggle('down', 'up');
      
      if(Learn.state == 'LEARNING'){
        Learn.startLearning(); 
      }
    }
  });

} 

// Load the play saved from JSON file
Learn.loadPlay = function (play){
  //Reset agent first
  Learn.agent = new RL.DQNAgent(env, spec);
  //Load the play
  Learn.agent.fromJSON(play);
  Learn.ui.logger.log('Loaded the play');
  // set epsilon to be much lower for more optimal behavior
  Learn.agent.epsilon = 0.05;
  // kill learning rate to not learn
  Learn.agent.alpha = 0;
}


module.exports = Learn;