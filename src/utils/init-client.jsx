import Client from "wsnet-client";
import { basicHash, decrypt, encrypt, randomBytes } from "./crypto";

import CryptoJS from "crypto-js";
import { getSubscription } from "../notify";

/**
 * @param {Client} client
 */
export default async function initClient(client, data, setData) {
  // Clean up messages: remove "joined" and "exited" types from every chat.
  setData((oldData) =>
    Object.keys(oldData).reduce((acc, chatId) => {
      acc[chatId] = {
        ...oldData[chatId],
        messages: oldData[chatId].messages.filter(
          ({ type }) => !["user-joined", "user-exited"].includes(type)
        ),
      };
      return acc;
    }, {})
  );

  // Process each chat concurrently.
  await Promise.all(
    Object.entries(data).map(async ([chatId, chatInfo]) => {
      // Build a map of existing message IDs.
      const messageIds = chatInfo.messages.reduce((acc, { id }) => {
        acc[id] = true;
        return acc;
      }, {});

      // Attempt to join the chat and fetch new messages.
      let joinRes = await client.get("join", {
        chatId,
        author: encrypt(chatInfo.password, chatInfo.author),
        passwordHash: basicHash(basicHash(chatInfo.password)),
        messageIds,
        subscription: await getSubscription(),
      });

      if (joinRes) {
        setData((old) => {
          let messages = old[chatId].messages;

          if (joinRes[joinRes.length - 1]?.deleted) {
            const toDelete = {};
            for (const id of joinRes[joinRes.length - 1].deletedMessages) {
              toDelete[id] = true;
            }

            messages = messages.filter(({ id }) => !toDelete[id]);

            joinRes.splice(joinRes.length - 1, 1);
          }

          joinRes = joinRes.map(({ id, message }) => {
            try {
              return {
                ...JSON.parse(decrypt(chatInfo.password, message)),
                id,
              };
            } catch (error) {
              return {
                type: "error",
                data: "an error occurred (wrong password) (ignorable error)",
                id,
              };
            }
          });

          messages = [...messages, ...joinRes];

          for (const msg of joinRes) {
            if (msg.type == "update") {
              const [editMsgId, type, value] = msg.data;
              const editMsgIndex = messages.findIndex(
                ({ id }) => id == editMsgId
              );
              if (editMsgIndex == -1) continue;
              if (type == "comment") {
                messages[editMsgIndex]?.comments?.push?.(value);
              }
            }
          }

          return {
            ...old,
            [chatId]: {
              ...old[chatId],
              unread: joinRes.length,
              messages,
            },
          };
        });

        // Fetch and add user data.
        const users = await client.get("users", chatId);

        if (users) {
          setData((old) => {
            return {
              ...old,
              [chatId]: {
                ...old[chatId],
                messages: [
                  ...old[chatId].messages,
                  ...users.map((user) => {
                    const author = decrypt(old[chatId].password, user);
                    return {
                      type: "user-joined",
                      data: "user joined: " + author,
                      author,
                      id: randomBytes(4).toString(CryptoJS.enc.Base64),
                    };
                  }),
                ],
              },
            };
          });
        }
      } else
        return alert(
          "Maybe your password is incorct (remove the group from your chats) => group: " +
          chatId
        );
    })
  );
}
