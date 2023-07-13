# StreamQ

StreamQ is an advanced library that specializes in event processing and message queue management. It offers strong capabilities for effectively handling events and managing the flow of messages in your application.

With StreamQ, you can effortlessly register events, customize event configurations, and process messages in a controlled manner. Whether you're dealing with high event volumes or aiming for reliable message processing, StreamQ provides the necessary features to streamline your event-driven workflows.

Please note that StreamQ is currently in an experimental phase, undergoing active development and refinement.

## Features

- Efficient event processing and message queuing for improved performance.
- Asynchronous message handling for concurrent processing of messages.
- Convenient event registration and callback functionality for seamless event management.
- Flexible persistence options, currently supporting Redis storage. Note: Future updates will include additional storage options such as in-memory, BSON, JSON, and more. Stay tuned for expanded storage capabilities.

## Recommendation

- Always use the same instance to run the library methods.
- Do not emit in one project and use on in another. This library only works within the same instance in which it was created.

## Installation

`npm install @isacrodriguesdev/streamq`

## Usage

```typescript
import { StreamQ, redisPersist } from "@isacrodriguesdev/streamq";

const streamQ = new StreamQ(
  // injecting the redis in the constructor
  redisPersist({
    host: "localhost",
    port: 6379,
    username: "yourusername",
    password: "yourpassword",
  })
);

// Create an instance of StreamQ with a persistence implementation
const streamq = new StreamQ(persist);
```

#### Register an event with a configuration

`pollingInterval`

This option represents the time interval, in milliseconds, between the operations of processing the message queue. By adjusting the value of pollingInterval, it is possible to control the processing rate of messages, directly affecting the time required to process each message.
default: 0

`retentionTime`

The retentionTime option sets the duration, in minutes, for which message data is retained in the queue before automatic removal. It controls how long the data persists in the queue before being deleted.
default: 10080 (7 days)

`deleteAfterReading`

The deleteAfterReading option, when enabled, automatically removes processed messages from the queue. Once a message has been successfully processed, it is deleted, ensuring a clean and efficient queue.
default: false

```typescript
// Exemplo de configuração do pollingInterval com um intervalo de 1000ms (1 segundo)
streamq.register("event", { pollingInterval: 1000 });
```

#### Define the event callback

```typescript
streamq.on("event", async (message) => {
  // Message response, example: { offset: 0, value: "your message", timestamp: 1689130158271 }
  console.log("Received message:", message);
});
```

#### You can pass any information in the array, numbers, strings or objects the only rule is that it has to be an array even if it is only 1 item

```typescript
await streamq.emit("event", [{ email: "bob@email" }, { email: "alice@email.com" }]);
```

## API

The constructor of the StreamQ class accepts a persist parameter, which should be an implementation of the StreamQPersist interface. This determines the storage and persistence mechanism for messages.

`StreamQ(persist: StreamQPersist)`

Registers an event with the specified event and eventConfig object, which contains the configuration options for the event.

`register(event: string, eventConfig: StreamQMessage): Promise<void>`

Defines a callback function to be executed when an event with the specified event occurs. The callback function receives the message as a parameter.

`on(event: string, callback: (message: StreamQMessage) => Promise<void>): void`

Sends an array of values to the event with the specified event. The values are added to the message queue for further processing.

`emit(event: string, values: any[]): Promise<void>`

Pauses processing of the `event` with the specified event. The event will no longer be processed until it is resumed.

`pause(event: string): void`

Resumes processing of the event with the specified `event`, but only if the event is currently paused using the `pause` method.

`resume(event: string): void`

Sets the read offset for the `event` with the specified event to the provided `startingOffset`. This controls the starting point from which the event's message queue will be processed.

`setReadOffset(event: string, startingOffset: number): void`

`Note`: The `setReadOffset` method is particularly useful in scenarios where you need to reset the processing position or reprocess messages from a specific point in the queue.
