# QUATSCHER

![Logo](https://manuelwestermeier.github.io/easy-messenger/img/logo-128.png)

**QUATSCHER** is a basic end-to-end encrypted messenger. All data is encrypted on the client side so that sensitive information never leaves your device. The project is fully open source, providing complete transparency into its inner workings.

## Hosted preview

[https://manuelwestermeier.github.io/easy-messenger/](https://manuelwestermeier.github.io/easy-messenger/)

## Source Code

View and contribute to the project on GitHub:  
[https://github.com/ManuelWestermeier/easy-messenger/](https://github.com/ManuelWestermeier/easy-messenger/)

## Configuration

Before running the project, create a `.env` file in the root directory and fill in the following tokens:

```env
GITHUB_API_TOKEN=your_github_api_token
ENC_PASSWORD=your_encryption_password
```

If you prefer to only store data in memory and log it every 2 seconds, add this line to your .env file:

```env
DEBUG=true
```

Also, make sure to input the server URL in the src/config.jsx file.

```jsx
// in production or on https
const remoteServerURL = "wss://easy-messenger.onrender.com";
// in local debugging or on http
const localHostURL = "ws://localhost:8080";

export const serverURL =
  document.location.protocol == "http:" ? localHostURL : remoteServerURL;
```

### Installation & Running

1. Install Dependencies In the project root, install the necessary Node modules:

```bash
npm install
```

2. Development Mode: To start the project in development mode, run:

```bash
npm run dev
```

3. Production Build: To build the project (the output will be placed in the docs folder && you have to upload these to the http server):

```bash
npm run build
```

4. Start the Server: navigate to the server folder and start the server:

```bash
node ./server/
```

5. On some points in the code you have to change the frontent location

Enjoy using QUATSCHER – the secure and open source encrypted messenger!

###     4,454 lines usercode
### 1,668,110 lines full code
