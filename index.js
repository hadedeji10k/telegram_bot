// jslint "esversion":6

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
const axios = require("axios");
const { connect } = require("mongoose");


const User = require("./models/user");
const Address = require("./models/address");
const Transaction = require("./models/transaction");

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
    if (userId != null && message != null && userId != undefined && message != undefined && userId != "" && message != "") {
        // console.log(userId, message)
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: userId,
            text: message
        })
        res.render("successful", {
            success: true,
            userId
        });
    } else {
        res.render("successful", {
            success: false
        });
    }
})

const addEthWallet = async (message, chatId, userName, firstName, lastName) => {
    try {
        let address = message.split(" ")[1];
        if (address != null && address != undefined && address != "") {
            // Checks if the address is already in a a user's account 
            let addressMatched = await Address.findOne({ "ethWalletAddress": address });
            // let addressMatched = await Address.findOne({ "ethWalletAddress": address });
            if (addressMatched) {
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: `This wallet address already exists`
                });
                return 
            } else {
                let user = await User.findOne({ chatId });
                if (!user) {
                    // Create a new user
                    let newUser = new User({
                        chatId,
                        userName,
                        firstName,
                        lastName,
                        // ethAddress: address
                    });
                    // Add new address to the database
                    let newAddress = new Address({ 
                        ethWalletAddress: address, 
                        userId: newUser._id 
                    })
                    newUser.ethAddress.push(newAddress._id)
                    await newUser.save();

                    // Adding the wallet address to Alchemy API 
                    let url = 'https://dashboard.alchemyapi.io/api/update-webhook-addresses'
                    let payload = {
                    "webhook_id":160296,
                    "addresses_to_add": [address],
                    "addresses_to_remove":[],
                    }
                    let headers = {"X-Alchemy-Token": "l6CjHMZFmF3jbts8ekpsGKKBuiyjkItL"}

                    await axios.patch(url, payload, {headers})

                    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                        chat_id: chatId,
                        text: `Your wallet has been added successfully!`
                    });
                } else {
                    let newAddress = new Address({ 
                        ethWalletAddress: address, 
                        userId: newUser._id 
                    })
                    user.ethAddress.push(newAddress._id)
                    await user.save();
                    // user.ethAddress = address
                    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                        chat_id: chatId,
                        text: `Your wallet has been updated successfully!`
                    });
                }
            }            
        } else {
            await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                chat_id: chatId,
                text: `Please enter your wallet address!`
            });
        }
    } catch (error) {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: chatId,
            text: `Error! Please try again.`
        }); 
    }
}

app.post(URI, async (req, res) => {
    let chatId = req.body.message.chat.id;
    let message = req.body.message.text;
    let userName = req.body.message.chat.username;
    let firstName = req.body.message.chat.first_name;
    let lastName = req.body.message.chat.last_name;

    // if (message.includes("/start")) {
    //     await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
    //         chat_id: chatId,
    //         text: `Hello ${userName}!, How can Muna help you?`
    //     });
    // }

    if(!(message.includes("/start") || message.includes("/help") || message.includes("/addeth") || message.includes("/deleteth") || message.includes("/list"))) {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: chatId,
            text: `Hello ${userName}!, Input a correct command
            COMMANDS: \n
            /addeth - Add Ethereum Wallet \n
            /list - Get Wallets List \n
            /deleteth - Delete Ethereum Wallet \n
            /help - Get Help \n
            `

        });
    }

    // Action for Command /start
    if (message.includes("/start")) {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: chatId,
            text: `Hello ${userName}!, Welcome to OgaNotifyBot — this bot will inform you when any transfer happens to your crypto address.
            
            \n COMMANDS:
            /addeth - Add Ethereum Wallet \n
            /deleteth - Delete Ethereum Wallet \n
            /list - Get Wallets List \n
            /help - Get Help \n
            The address should be in the format: 0x1234567890123456789012345678901234567890 \n
            Note: Use /addeth 'ETH address' to add a wallet \n
            Note: You can add multiple wallets. \n
            Don't forget to Join @OgaNotifyBot to follow the latest news! \n Why don't you start by adding a wallet?`
        });
    }

    // Action for Command /help
    if (message.includes("/help")) {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: chatId,
            text: `COMMANDS: \n
            /addeth - Add Ethereum Wallet \n
            /list - Get Wallets List \n
            /deleteth - Delete Ethereum Wallet \n
            Don't forget to Join @OgaNotifyBot to follow the latest news! \n Why don't you start by adding a wallet?`
        });
    }

    // Action for Command /addeth
    if (message.includes("/addeth")) {
        // Checks if the message was from a private chat
        if(req.body.message.chat.type == "private") {
            // addEthWallet(message, chatId, userName, firstName, lastName)
            try {
                // Get address from message sent (spliiting using spaces)
                let address = message.split(" ")[1];
                // Checks if the address is not empty or null or undefined
                if (address != null && address != undefined && address != "") {
                    // Checks if the address is already in a a user's account 
                    let addressMatched = await Address.findOne({ "ethWalletAddress": address });
                    // let addressMatched = await Address.findOne({ "ethWalletAddress": address });
                    if (addressMatched) {
                        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                            chat_id: chatId,
                            text: `This wallet address already exists`
                        });
                        return 
                    } else {
                        // find user account using the chatId
                        let user = await User.findOne({ chatId });
                        // if user account is not found, create a new one
                        if (!user) {
                            let newUser = new User({
                                chatId,
                                userName,
                                firstName,
                                lastName,
                                // ethAddress: address
                            });
                            // also create a new address for the user
                            let newAddress = new Address({ 
                                ethWalletAddress: address, 
                                userId: newUser._id 
                            })
                            newUser.ethAddress.push(newAddress._id)
                            await newUser.save();
                            await newAddress.save();
        
                            // Adding the wallet address to Alchemy API 
                            let url = 'https://dashboard.alchemyapi.io/api/update-webhook-addresses'
                            let payload = {
                                "webhook_id":160296,
                                "addresses_to_add": [address],
                                "addresses_to_remove":[],
                            }
                            let headers = {"X-Alchemy-Token": "l6CjHMZFmF3jbts8ekpsGKKBuiyjkItL"}
        
                            await axios.patch(url, payload, {headers})
        
                            await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                                chat_id: chatId,
                                text: `Your wallet has been added successfully!`
                            });
                        } else {
                            // checks if the wallet address is in database
                            let currentUserAddresses = await Address.find({ userId: user._id})
                            // console.log(currentUserAddresses)
                            let userWalletAddressArray = []
                            for (let i = 0; i < currentUserAddresses.length; i++) {
                                userWalletAddressArray.push(currentUserAddresses[i].ethWalletAddress)
                            }
                            // checks if the address to be added is already in the database
                            if (userWalletAddressArray.includes(address)) {
                                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                                    chat_id: chatId,
                                    text: `This wallet address already exists`
                                });
                            } else {
                                // create a new address for the user and add it to the alchemy api
                                let newAddress = new Address({
                                    ethWalletAddress: address,
                                    userId: user._id
                                })
                                user.ethAddress.push(newAddress._id)
                                await user.save();
                                await newAddress.save();
                                // user.ethAddress = address

                                // Adding the wallet address to Alchemy API 
                                let url = 'https://dashboard.alchemyapi.io/api/update-webhook-addresses'
                                let payload = {
                                    "webhook_id":160296,
                                    "addresses_to_add": [address],
                                    "addresses_to_remove":[],
                                }
                                let headers = {"X-Alchemy-Token": "l6CjHMZFmF3jbts8ekpsGKKBuiyjkItL"}
            
                                await axios.patch(url, payload, {headers})

                                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                                    chat_id: chatId,
                                    text: `Your wallet has been added successfully!`
                                });
                            }
                        }
                            // let newAddress = new Address({ 
                            //     ethWalletAddress: address, 
                            //     userId: user._id 
                            // })
                            // user.ethAddress.push(newAddress._id)
                            // await user.save();
                            // // user.ethAddress = address
                            // await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                            //     chat_id: chatId,
                            //     text: `Your wallet has been updated successfully!`
                            // });
                    
                        
                    }            
                } else {
                    // if the address is empty or null or undefined
                    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                        chat_id: chatId,
                        text: `Please enter your wallet address!`
                    });
                }
            } catch (error) {
                // if the address is not in the correct format or is not a valid address or there is an error in adding it to alchemy api
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: `Error! Please try again.`
                }); 
            }
        } else {
            // if the message was not from a private chat
            await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                chat_id: chatId,
                text: `You can only add a wallet from a private chat`
            });
        }
    }

    // Action for Command /deleteth
    if (message.includes("/deleteth")) {
        // checks if message was from a private chat
        if(req.body.message.chat.type == "private") {
            // gets user using the chatId
            let user = await User.findOne({ chatId });
            try {
                // Get address from message sent (spliiting using spaces)
                let address = message.split(" ")[1];
                // Checks if the address is not empty or null or undefined
                if (address != null && address != undefined && address != "") {
                    // Checks if the address is already in database
                    let ethWalletAddress = await Address.findOne({ ethWalletAddress: address });
                    // if wallet address is found, delete it from alchemy api
                    if (ethWalletAddress) {
                        let url = 'https://dashboard.alchemyapi.io/api/update-webhook-addresses'
                        let payload = {
                        "webhook_id":160296,
                        "addresses_to_add": [],
                        "addresses_to_remove":[address],
                        }
                        let headers = {"X-Alchemy-Token": "l6CjHMZFmF3jbts8ekpsGKKBuiyjkItL"}

                        await axios.patch(url, payload, {headers})

                        // delete the address from the database
                        await Address.deleteOne({ ethWalletAddress: address });

                        // await user.ethAddress.filter(address => address != ethWalletAddress._id)
                        // also remove from user's account
                        let index = await user.ethAddress.indexOf(ethWalletAddress._id)
                        await user.ethAddress.splice(index, 1);
                        await user.save()

                        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                            chat_id: chatId,
                            text: `Your wallet has been deleted successfully!`
                        });
                    } else {
                        // if the address is not in the database
                        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                            chat_id: chatId,
                            text: `You don't have any wallet yet!`
                        });
                    }
                } else {
                    // if the address is empty or null or undefined
                    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                        chat_id: chatId,
                        text: `Please enter your wallet address!`
                    });
                }
            } catch (error) {
                // if the address is not in the correct format or is not a valid address or there is an error in deleting it to alchemy api
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: `Error! Please try again.`
                });
            }
        } else {
            // if the message was not from a private chat
            await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                chat_id: chatId,
                text: `You can only delete a wallet from a private chat`
            });
        }
    }

    // Action for Command /list
    if (message.includes("/list")) {
        // finds user in database using the chatId
        let user = await User.findOne({ chatId });
        if (user) {
            // get all wallet addresses from user account
            let currentUserAddresses = await Address.find({ userId: user._id})
            let ethAddressString = "";
            for (let i = 0; i < currentUserAddresses.length; i++) {
                ethAddressString += `${i + 1} - ${currentUserAddresses[i].ethWalletAddress} \n`
            }
            if(currentUserAddresses.length > 0) {
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: `Wallet(s) List: \n ${ethAddressString}`
                });
            } else {
                // if the user has no wallet
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: `You don't have any wallet yet!`
                });
            }
        } else {
            // if the user is not in the database
            await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                chat_id: chatId,
                text: `You don't have any wallet yet!`
            });
        }
    }

    // Action for Command /transactions
    if (message.includes("/transactions")) {
        // finds user in database using the chatId
        let user = await User.findOne({ chatId });
        if (user) {
            // get all wallet addresses from user account
            let userTransactions = await Transaction.find({ userId: user._id})
            let transactionsString = "";
            for (let i = 0; i < userTransactions.length; i++) {
                transactionsString += `${i + 1} - ${userTransactions[i].value}${userTransactions[i].asset} \n`
            }
            if(userTransactions.length > 0) {
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: `Transaction(s) List: \n ${transactionsString}`
                });
            } else {
                // if the user has no wallet
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: `You don't have any transaction yet!`
                });
            }
        } else {
            // if the user is not in the database
            await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                chat_id: chatId,
                text: `You don't have any transaction yet!`
            });
        }
    }

    // // If the message was from a customer care
    // if (chatId === CUSTOMER_CARE) {
    //     let responseToUser = message.split("'/'")
    //     let userChatId = responseToUser[0];
    //     let messageToUser = responseToUser[1];

    //     await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
    //         chat_id: userChatId,
    //         text: `${messageToUser}`
    //     })
    // } else {
    //     // if the message was not from a customer care, then send it to the customer care
    //     await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
    //         chat_id: CUSTOMER_CARE,
    //         text: `User's chat ID: ${chatId} \n First Name: ${firstName} \n Last Name: ${lastName} \n Username: ${userName} \n Message: ${message}`
    //     })
    // }

    return res.send()
})

// listening webhook message from telegram APP of alchemy
app.post("/alchemy", async (req, res) => {
    // checks if the message from webhook (alchemy api) is ADDRESS_ACTIVITY
    if(req.body.webhookType === "ADDRESS_ACTIVITY") {
        // get the transactions from the webhook
        let transactions = req.body.activity
        for(let i = 0; i < transactions.length; i++) {
            // get all details of the transaction
            let userAddress = transactions[i].toAddress
            let senderAddress = transactions[i].fromAddress
            let value = transactions[i].value
            let asset = transactions[i].asset
            let category = transactions[i].category
            // checks if the address money sent to is in database
            let addressFromDatabase = await Address.findOne({ ethWalletAddress: userAddress })
            if (addressFromDatabase) {
                // if the address is in database, get user with the address
                let user = await User.findOne({ id: addressFromDatabase.userId });

                // if the user is found, add the transaction in to the database
                if (user) {
                    let transaction = new Transaction({
                        userId: user._id,
                        ethWalletAddress: addressFromDatabase._id,
                        receiverAddress: userAddress,
                        senderAddress: senderAddress,
                        value: value,
                        asset: asset
                    })
                    await transaction.save()

                    let chatId = user.chatId
                    let userName = user.userName
                    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                        chat_id: chatId,
                        text: `Hello ${userName}, Your wallet ${userAddress} has been credited with ${value}${asset} successfully! Sent from ${senderAddress}`
                    });
                }
            }
            // } else {
            //     let user = await User.findOne({ id: "6218ac18ba9ed3f855e7a854" });
            //     if(user) {
            //         let chatId = user.chatId
            //         let userName = user.userName
            //         let firstName = user.firstName
            //         await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            //             chat_id: chatId,
            //             text: `Hello ${firstName}, Your wallet ${userAddress} has been credited with ${value}${asset} successfully! Sent from ${senderAddress}`
            //         });
            //     }
            // }
        }
    }
})

// app.get("/address", async (req, res) => {
//     // const users = await User.find({}).sort({createdAt: -1}).exec();
//     let user = await User.findOne({ id: "6218ac18ba9ed3f855e7a854" });

//     return res.status(201).json({
//         message:  "Users Fetched Successfully!",
//         data: user,
//         success: true
//     })
// })


const startServer = async () => {
    try {
      await connect(process.env.MONGO_DB)
        .then(() => {
          console.log(`Database connected`);
        })
        .catch(() => {
          console.log(`Database not connected`);
        });
      app.listen(process.env.PORT || 3001, async () => {
        console.log("Server running on port ", process.env.PORT || 3001);
        await init()
        setInterval(async () => {
            await axios.get('https://www.google.com').then((res) => {
                console.log(res.status)
            });
        }
        , 900000)
      });
    } catch (err) {
      console.log(err);
      startServer();
    }
  };

  startServer();