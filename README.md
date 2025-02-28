

## Stork-bot Verification Bot

## This is a bot used to verify Stork Oracle's signed price data. It periodically fetches signed price data from the API and verifies its validity.

### Installation:

1️⃣  Clone this repository to your local machine:
```
git clone https://github.com/SKaaalper/Stork-bot.git && cd Stork-bot
```

2️⃣ Install dependencies:
```
npm install
npm install inquirer
```
3️⃣  Create and fill in the `tokens.json` file:
- If the `tokens.json` file does not exist, the program will automatically create a template file. You need to copy the tokens from the Stork Verify application's localStorage and paste them into `tokens.json`.
```
nano tokens.json
```
 ➕ Add Access Token Start with: eyjjug
 
 ➕ Add idToken Start with: eyfadf
 
 ➕ Add refresh token start with: eyfafad
 
 ➕ To obtain **Access Token**,**idtoken**,**refresh token** ▶️ Click Mouse 2 Stork Extension node ▶️ Click Inspect ▶️ Click Application ▶️ Click Extension Storage ▶️ Click Local And Copy!
 
 ➕ Save the file **(CTRL + X,then Y, then Enter)**

![image](https://github.com/user-attachments/assets/0351ab1a-9f1d-472b-ad76-6354b21bd85a)

4️⃣ Running via Screen:
```
screen -S stork-bot
```

5️⃣ Run the bot:
```
node index.js
```
➕ to detach screen **Ctrl + A, Then Click D**
➕ to Attach `screen -r stork-bot`

⚠️ Note:
This bot is for educational purposes only. Use at your own risk and ensure compliance with Stork's terms of service.
