/*
Server Data:
chats[chatId] = {
  clients: [{ client, author }],
  messages: [{ id, message }],
  passwordHashHash: basicHash(passwordHash),
  subscriptions: {
    [endpoint]: Subscription
  }
};
*/

/*
Client Function:
"user-exited"  => { chatId, message: author, messageId: 0 }
"user-joined"  => { chatId, message: author, messageId: 0 }
"message"      => { chatId, message, messageId }
"message-deleted" => { chatId, message, messageId }
"chat-deleted" => { chatId, message: 0, messageId: 0 }
*/

/*
GitHubFS Storage Structure:

For each chat room (identified by chatId):

1. Metadata File:
   - Location: `chats/{encodeURIComponent(chatId)}.json`
   - Contents:
     {
       passwordHashHash: <hashed password>,
       subscriptions: { [endpoint]: Subscription, ... },
       messagesLength: <number of messages>
     }

2. Message Files:
   - Each message is stored in a separate file:
     `chats/{encodeURIComponent(chatId)}-message-{index}.json`
   - Contents of each file:
     {
       id: <messageId>,
       message: <message text>
     }

Note:
Extra message files (beyond messagesLength) are cleaned up if the number of messages decreases.
*/
