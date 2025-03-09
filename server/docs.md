Here is the documentation in Markdown for your code:

md

Code kopieren

# Messenger Server Documentation This project sets up a real-time messenger server with the ability to handle client connections, send notifications, and store chat data on GitHub. The server is implemented using the `wsnet-server` and `web-push` libraries. ## Environment Setup The application requires the following environment variables to be set: - `WEB_PUSH_PRIVATE_KEY`: Private VAPID key for web push notifications. - `EMAIL`: Email address to be used in the `VAPID` details for web push. - `GITHUB_API_TOKEN`: GitHub API token for accessing the repository. - `ENC_PASSWORD`: Encryption password for storing chat data securely. - `DEBUG` (optional): Enables debug logging when set. Ensure the `.env` file is present in the root directory with the necessary keys. ### Example `.env` file: ```ini WEB_PUSH_PRIVATE_KEY=your-private-key EMAIL=your-email@example.com GITHUB_API_TOKEN=your-github-token ENC_PASSWORD=your-encryption-password DEBUG=true

## Key Components

### 1\. **Web Push Notifications (`web-push`)**

The `web-push` library is used for sending push notifications to the clients. The public and private VAPID keys are used for the notifications, and the `sendPushNotification` function is used to send notifications to clients.

### 2\. **Messenger Server (`create-server.js`)**

The server listens on port 8080 and handles various client events related to messaging:

- **Join Chat**: Clients can join a chat by providing a `chatId`, `author`, `passwordHash`, and a list of `messageIds`.
- **Send Message**: Clients can send messages to a chat.
- **Delete Message**: Messages can be deleted from the chat.
- **Exit Chat**: Clients can exit the chat, which removes them from the list of active clients in the chat.
- **Delete Chat**: Chats can be deleted, removing all clients and associated data.
- **Delete All Messages**: All messages in a chat can be deleted.

The server also integrates with GitHub to store chat data securely.

### 3\. **GitHubFS Integration (`index.js`)**

GitHubFS is used to store chat data (messages, password hash, subscriptions) in a GitHub repository. The data is stored in JSON files, with each file representing a chat room. The files are stored under the `chats` directory in the GitHub repository.

#### Storing Data

The `storeAllChatRoomsData` function stores all chat rooms' data in the GitHub repository. The data stored includes:

- Messages
- Password hash
- Subscriptions

#### Fetching Data

The `fetchAllChatRoomsData` function loads all chat room data from the repository. If the `chats` directory is empty or not present, the function creates it and stores the default chat room.

### 4\. **Data Structure**

Chats are stored in memory using the following structure:

js

Code kopieren

`chats[chatId] = {   clients: [{ client, author }],   messages: [{ id, message }],   subscriptions: {},   passwordHashHash: basicHash(passwordHash), };`

### 5\. **Client Events**

The following client events are handled by the server:

#### `join`

- Event sent by the client to join a chat room.
- Requires the `chatId`, `author`, `passwordHash`, and a list of `messageIds`.

#### `users`

- Event to get the list of users in a chat room.
- Requires the `chatId`.

#### `messages`

- Event to get all messages from a chat room.
- Requires the `chatId`.

#### `exit`

- Event to exit a chat room.
- Requires the `chatId`.

#### `delete-chat`

- Event to delete a chat room.
- Requires the `chatId`.

#### `delete-all-messages`

- Event to delete all messages in a chat room.
- Requires the `chatId`.

#### `send`

- Event to send a message to a chat room.
- Requires the `chatId`, `message`, and `id`.

#### `delete-message`

- Event to delete a specific message in a chat room.
- Requires the `chatId` and `id`.

### 6\. **Periodic Data Storage**

The chat data is periodically stored in the GitHub repository at a defined interval (`storeInterval`). The default interval is 60 seconds, but this can be overridden for debugging.

### 7\. **Push Notification**

When a chat room is deleted or a message is deleted, push notifications are sent to all subscribed clients using the `sendPushNotification` function.

### 8\. **Clean-up on Disconnect**

When a client disconnects, the server cleans up by removing the client from all chat rooms they were part of.

## Running the Server

To start the server, run the following command:

bash

Code kopieren

`node index.js`

This will:

1.  Initialize the chat rooms by loading existing data from GitHub.
2.  Start the messenger server on port 8080.
3.  Periodically store chat data in the GitHub repository.

## Functions

### `storeAllChatRoomsData()`

Stores all chat room data in the GitHub repository.

### `fetchAllChatRoomsData()`

Fetches all chat room data from the GitHub repository and initializes chat rooms in memory.

### `sendPushNotification(subscription, data)`

Sends a push notification to a client using the `web-push` library.

## GitHub Repository

All chat data is stored in the GitHub repository specified in the `GITHUB_API_TOKEN` and other GitHubFS configuration options. The data is stored under the `chats` directory.

## License

This project is licensed under the MIT License.

arduino

Code kopieren

`This documentation provides an overview of your project, including the setup, core components, data structure, client events, and how to run the server.`
