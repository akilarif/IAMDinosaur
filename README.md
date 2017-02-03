# IAMDinosaur

![IAMDinosaur](https://raw.githubusercontent.com/ivanseidel/IAMDinosaur/master/assets/top_score.png)

A simple artificial intelligence to teach Google Chrome's offline dinosaur to play the game by itself (The goal of the game is to avoide the obstacles), using Reinforcement Learning.

## Installation

1. Install `Node.js` on your computer.

2. Clone/download this folder to your computer.

3. run `npm install` within this folder

4. Open Chrome's dinosaur game and put aside the terminal (It MUST be on the same screen)
   **(Tip: go to developer tools, and under network, set to offline )**

5. run `node index` within this folder. If the game was located, it will move the cursor
   of the mouse to the origin of the `floor` of the dino. Press `s` key in the terminal to 
   start learning. 


## How does it work

We have 3 different inputs read from the pixels of the screen:

1. Distance from the next cactus
2. Length of the next cactus
3. Speed of the current cactus

We have also, one output with 3 possible states:

1. output = 0.00: Press DOWN key
2. output = 1.00: Press UP key
2. output = 0.50: Release both keys

## Reinforcement Learning Algorithm

There are currently 3 sensors:

1.For sensing smaller cacti & pterodactyls flying at the bottom, 
2.For sensing larger cacti & pterodactyls flying in the middle, and 
3.For sensing the pterodactlys flying above the dinosaur's head.

Each sensor has 3 parameters- value, size and speed. value measures the distance from the obstacle, size measures the width of the obstacle and speed measures the speed of the approaching obstacle.

Speed of all the approaching obstacles are same at an instant. So, speed from the first sensor(refer above) is enough.

So, there are 7 inputs in total. The set of these 7 inputs constitutes a state. An action is carried out depending on the current state. Epsilon-greedy policy is followed (i.e.) a random action occurs with a probability epsilon (0 < epsilon < 1). This is used for exploration, so that the dinosaur may find a better action and improve. 

If the dinosaur crosses a cactus, then a reward of +1 is given. If the dinosaur dies (Game over), then a reward of -1000 is given.


## Implementation

All the implementation was done using Node.js, Reinforcejs (Reinforcement Learning library, developed by karpathy-> https://github.com/karpathy/reinforcejs), and RobotJs (a library to read pixels and simulate key presses).

There are a few files in the project:

- `index.js`: It tight all things together.

- `Scanner.js`: Basic abstraction layer above RobotJs library that reads the screen like
  ray tracing. Also have some utilities functions.

- `UI.js`: Global scope for the UI management. It initializes and also updates the screen
  on changes.

- `GameManipulator.js`: Has all the necessary code to read sensors, and apply outputs
  to the game. Is also responsible for computing points, getting the game state and
  triggering callbacks/listeners to real implementation.

- `Learner.js`: It is the core implementation of Reinforcement Learning. This is where
  "magic" happens, by executing an action, finding its reward which is used by the agent for 	     learning. 


### How to: Load a play

1. Make sure the play is inside `plays` folder with a `.json` extension
2. Run the program
3. Click the list in the terminal
4. Navigate up/down to the wanted file
5. Press `enter` (then, to start, press `s`)


### Be aware of a game bug

The dino game has a anoying bug: It starts to "drift" to the right with time
making the dino to be wrong offseted from the origin of the game. That, makes
the program to read the dino as a cactus, since it is the same color.

This bug is being avoided by the program as it refreshes the page after a game is over

## Development guidelines

Please, follow the Node.js style guide from [Felix](https://github.com/felixge/node-style-guide).
It is not complex, and has a great simple pattern for things.

## Credits

- [Ivan Seidel](https://github.com/ivanseidel)
- [João Pedro](https://github.com/joaopedrovbs)
- [Tony Ngan](https://github.com/tngan) **The idea came from him**

