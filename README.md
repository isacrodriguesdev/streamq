
# StreamQ

StreamQ is a library for processing events and managing message queues.

If you have scalability problems you need to control the speed at which data is processed this lib is ideal for your project, the goal is not to have a complex queue like kafka the idea is just to control the flow of huge amounts of data.

It is in experimental phase.

## Features

- Efficient event processing and message queuing
- Asynchronous message handling
- Event registration and callback functionality
- Flexible persistence options

## Known issues
- When issuing before starting and connecting to redis, error occurs.

## Recommendation
- Always use the same instance to run the library methods.
- Do not emit in one project and use onEvent in another. This library only works within the same instance in which it was created.

## Installation

``npm install @isacrodriguesdev/streamq``

## Usage

~~~javascript  
const { StreamQ, RedisPersist } = require('@isacrodriguesdev/streamq');

const redisPersist = new RedisPersist({
  host: "localhost",
  port: 6379,
  username: "myusername",
  password: "yourpassword",
});

// Create an instance of StreamQ with a persistence implementation
const streamq = new StreamQ(persist);

// Register an event with a configuration
const eventConfig = { delayBetweenUpdates: 1000 }; // example configuration
streamq.register('eventName', eventConfig);

// Define the event callback
streamq.onEvent('eventName', async (message) => {
  // Process the received message
  console.log('Received message:', message);
  // Perform necessary operations based on the message
});

// You can pass any information in the array, numbers, strings or objects the only rule is that it has to be an array even if it is only 1 item
const values = [{ email: "bob@email" }, { email: "alice@email.com" }]; // example values
await streamq.emit('eventName', values);

~~~

## API
The constructor of the StreamQ class accepts a persist parameter, which should be an implementation of the IPersist interface. This determines the storage and persistence mechanism for messages.

``StreamQ(persist: IPersist)``

Registers an event with the specified eventName and eventConfig object, which contains the configuration options for the event.

``register(eventName: string, eventConfig: IEventConfig): Promise<void>``

Defines a callback function to be executed when an event with the specified eventName occurs. The callback function receives the message as a parameter.

``onEvent(eventName: string, callback: (message: MessageQ) => Promise<void>): void``

Sends an array of values to the event with the specified eventName. The values are added to the message queue for further processing.

``emit(eventName: string, values: any[]): Promise<void>``

