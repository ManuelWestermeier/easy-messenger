# Easy Messenger Documentation

This documentation explains the architecture, configuration, and functionality of the Easy Messenger application. This project provides a real-time messaging server that leverages GitHub for persistent data storage and Web Push for notifications.

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Core Modules](#core-modules)

  - [GitHubFS Chat Storage](#githubfs-chat-storage)
  - [Messenger Server](#messenger-server)

- [Server Workflow](#server-workflow)
- [Client API](#client-api)
- [Push Notifications](#push-notifications)
- [Data Persistence](#data-persistence)
- [Running the Server](#running-the-server)
- [Notes and Considerations](#notes-and-considerations)
- [License](#license)

## Overview

Easy Messenger is a WebSocket-based messaging server that:

- Uses GitHub (via the [GitHubFS](https://www.npmjs.com/package/gh-fs) library) as a file-based data store for chat data.
- Supports real-time messaging between clients.
- Provides push notifications for various chat events using [web-push](https://www.npmjs.com/package/web-push).

## Requirements

- **Node.js** (v14 or later recommended)
- A GitHub repository (with an existing branch such as "main") for storing chat data
- Valid GitHub API credentials and tokens
- Environment variables for configuration
- Required npm packages:

  - `dotenv`
  - `gh-fs`
  - `web-push`
  - `wsnet-server`
  - `are-set`
  - `crypto-js`

## Installation

1.  **Clone the Repository:**

    bash

    KopierenBearbeiten

    `git clone https://github.com/yourusername/easy-messenger.git cd easy-messenger`

2.  **Install Dependencies:**

    bash

    KopierenBearbeiten

    `npm install`

## Configuration

Create a `.env` file in the project root with the following required keys:

env

KopierenBearbeiten

`# GitHub API configuration GITHUB_API_TOKEN=your_github_api_token ENC_PASSWORD=your_encryption_key  # Web Push configuration WEB_PUSH_PRIVATE_KEY=your_private_vapid_key EMAIL=your_contact_email # Optionally enable logging and debug mode LOG=true DEBUG=false`

The file `web-push-public-key.js` should export your public VAPID key.

## Core Modules

### GitHubFS Chat Storage

- **Initialization:**  
  The application instantiates a `GitHubFS` object to manage read and write operations on the GitHub repository.

  - **Parameters:**

    - `authToken`: GitHub API token.
    - `owner` and `repo`: Define where the chat data is stored.
    - `branch`: Must exist in the repository (e.g., `"main"`).
    - `defaultCommitter`: Provides commit metadata.
    - `encryptionKey`: For data security.

- **Data Structure:**  
  Chat data is structured as follows:

  - A primary JSON file per chat room in the `chats` directory (e.g., `chats/{encodedChatId}.json`) containing metadata such as:

    - `passwordHashHash`
    - `subscriptions`
    - `messagesLength`

  - Individual message files (e.g., `chats/{encodedChatId}-message-{index}.json`) store each message.

### Messenger Server

- **Initialization:**  
  The server is bootstrapped via a call to `initMessengerServer()`, which:

  - Starts a WebSocket server (using `wsnet-server`).
  - Registers event handlers for various client events (join, exit, send, delete, etc.).
  - Ensures that every client interaction (e.g., message sending, deleting) is appropriately handled and broadcast.

- **Data Storage Routine:**  
  The function `storeAllChatRoomsData()` is responsible for periodically persisting chat room data to GitHub. This includes:

  - Writing/updating the main chat room file.
  - Creating/updating individual message files.
  - Cleaning up outdated or extra message files if messages are removed.

## Server Workflow

1.  **Startup Sequence:**

    - Load environment variables using `dotenv.config()`.
    - Override default `console.log` based on the `LOG` environment variable.
    - Initialize the GitHubFS instance.
    - Fetch all existing chat room data from GitHub. If the `chats` directory or files are missing, a default chat room is created.
    - Start the messenger server.
    - Set up a periodic task to save all chat rooms (default every 40 seconds or 2 seconds in debug mode).

2.  **Client Lifecycle:**

    - **Join Chat:**  
      Clients request to join a chat room by providing their `chatId`, `author`, `passwordHash`, and current `messageIds`. If the credentials match (using a basic hash function) and the chat room exists (or is created if not), the client is added and any unread messages are returned.
    - **Messaging:**

      - **Sending:** A message is sent to the chat room, broadcast to all other connected clients, and stored.
      - **Deleting:** Specific messages can be deleted, and the deletion is propagated to subscribers.

    - **Exit Chat:**  
      Clients may exit the chat room. This event removes the client from the room and broadcasts a "user-exited" event.
    - **User State Change:**  
      Clients can signal a state change (e.g., "typing" or "away") to other clients.

## Client API

Clients interact with the server using several event types and expected payloads:

- **join**

  - **Payload:** `{ chatId: string, author: string, passwordHash: string, messageIds: object, [subscription]: object }`
  - **Description:** Join a chat room; authenticate and get any unread messages.

- **users**

  - **Payload:** `chatId: string`
  - **Description:** Get a list of authors in the chat room.

- **messages**

  - **Payload:** `chatId: string`
  - **Description:** Retrieve the entire message history for a chat room.

- **exit**

  - **Payload:** `{ chatId: string, [subscription]: object }`
  - **Description:** Exit a chat room and optionally remove a push notification subscription.

- **delete-chat**

  - **Payload:** `chatId: string`
  - **Description:** Delete an entire chat room and notify all clients and push subscribers.

- **delete-all-messages**

  - **Payload:** `chatId: string`
  - **Description:** Remove all messages from the specified chat room.

- **user-state-change**

  - **Payload:** `{ chatId: string, message: string }`
  - **Description:** Broadcast a user state change to other clients in the chat room.

- **send**

  - **Payload:** `{ chatId: string, message: string, id: string }`
  - **Description:** Send a new message. The server broadcasts the message, notifies push subscribers, and appends it to the chat history.

- **delete-message**

  - **Payload:** `{ chatId: string, id: string }`
  - **Description:** Delete a specific message by ID, update clients, and clean up the storage.

## Push Notifications

- **Setup:**  
  The `webpush` package is used to handle push notifications.

  - VAPID keys are set up using:

    js

    KopierenBearbeiten

    ``webpush.setVapidDetails(`mailto:${email}`, publicVapidKey, privateVapidKey);``

- **Usage:**

  - Push notifications are sent for events like new messages, message deletion, and chat deletion.
  - If a push notification fails (e.g., due to an invalid subscription), the subscription is removed.

## Data Persistence

- **Storage Process:**  
  The application periodically invokes `storeAllChatRoomsData()`:

  - **Writes Metadata:** Saves the chat room's metadata (excluding active client details) to GitHub.
  - **Writes Messages:** Each message is stored as an individual JSON file.
  - **Cleanup:** Removes files corresponding to messages that have been deleted.

- **On Process Exit:**  
  The server ensures a final data save when the process exits by binding to the `process.on("exit")` event.

## Running the Server

Ensure your `.env` file is properly configured, then start the application with:

bash

KopierenBearbeiten

`node index.js`

The server will:

- Initialize chat data (fetch from GitHub or create default).
- Start listening for WebSocket connections on the specified port (default is 8080).
- Periodically persist chat data to GitHub.

## Notes and Considerations

- **Debug Mode:**  
  When `DEBUG` is enabled, data is stored more frequently (every 2 seconds) and additional logging is enabled.
- **Security:**

  - Use strong tokens and encryption keys.
  - Sensitive client connection details are not stored on GitHub.

- **Error Handling:**  
  The server logs errors encountered during data storage and client interaction without interrupting overall service.

## License

_Include your project's license details here._

---

This documentation covers the primary aspects of your codebase. Adjust and expand sections as needed for additional details or future features.
