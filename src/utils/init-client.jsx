import Client from "wsnet-client";
import { basicHash, decrypt } from "./crypto";

/**
 * @param {Client} client
 */
export default async function initClient(client, data, setData) {
  for (const chatId in data) {
    const messageIds = {};

    for (const { id } of data[chatId].messages) {
      messageIds[id] = true;
    }

    const res = await client.get("join", {
      chatId,
      author: data[chatId].author,
      passwordHash: basicHash(basicHash(data[chatId].password)),
      messageIds,
    });
    if (!res) continue;

    setData((old) => {
      return {
        ...old,
        [chatId]: {
          ...old[chatId],
          unread: res.length,
          messages: [
            ...old[chatId].messages,
            ...res.map(({ id, message }) => {
              try {
                return { ...JSON.parse(decrypt(password, message)), id };
              } catch (error) {
                return {
                  type: "error",
                  data: "an error occurred (wrong password) (ignorable error)",
                };
              }
            }),
          ],
        },
      };
    });
  }
}
