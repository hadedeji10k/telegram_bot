// jslint "esversion":6

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
const axios = require("axios");


// init app to express module
const app = express();

app.use(cors());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// set Public folders
app.use(express.static(path.join(__dirname, "public")));


// body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const { BOT_TOKEN, SERVER_URL, CUSTOMER_CARE } = process.env;

const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const URI = `/webhook/${BOT_TOKEN}`;
const WEBHOOK_URL = `${SERVER_URL}${URI}`;

const init = async () => {

    const res = await axios.get(`${TELEGRAM_API_URL}/setWebhook?url=${WEBHOOK_URL}`);
    console.log(res.data)
};

app.get("/home", (req, res) => {
    res.send("Hello World! This is Muna Telegram Bot script");
})
app.get("/", (req, res) => {
    res.render("index")
})

app.post("/admin-send", async (req, res) => {
    const { userId, message } = req.body;
    // console.log(userId, message)
    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: userId,
        text: message
    })
    res.render("successful", {
        userId
    });
})

app.post(URI, async (req, res) => {
    let chatId = req.body.message.chat.id;
    let message = req.body.message.text;
    let userName = req.body.message.chat.username;
    let firstName = req.body.message.chat.first_name;
    let lastName = req.body.message.chat.last_name;

    if (message.includes("/start")) {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: chatId,
            text: `Hello ${userName}!, How can Muna help you?`
        });
    }

    if (chatId === CUSTOMER_CARE) {
        let responseToUser = message.split("'/'")
        let userChatId = responseToUser[0];
        let messageToUser = responseToUser[1];

        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: userChatId,
            text: `${messageToUser}`
        })
    } else {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: CUSTOMER_CARE,
            text: `User's chat ID: ${chatId} \n First Name: ${firstName} \n Last Name: ${lastName} \n Username: ${userName} \n Message: ${message}`
        })
    }

    return res.send()
})

app.listen(process.env.PORT || 3002, async () => {
    console.log("Server running on port ", process.env.PORT || 3002);
    await init()
})