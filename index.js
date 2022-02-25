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
                    let newUser = new User({
                        chatId,
                        userName,
                        firstName,
                        lastName,
                        // ethAddress: address
                    });
                    console.log(newUser)
                    let newAddress = new Address({ 
                        ethWalletAddress: address, 
                        userId: newUser._id 
                    })
                    newUser.ethAddress.push(newAddress._id)
                    await newUser.save();
                    console.log("reached")

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
    console.log(req.body);
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

    if (message.includes("/addeth")) {
        if(req.body.message.chat.type == "private") {
            // addEthWallet(message, chatId, userName, firstName, lastName)
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
                            let newUser = new User({
                                chatId,
                                userName,
                                firstName,
                                lastName,
                                // ethAddress: address
                            });
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
                            let currentUserAddresses = await Address.find({ userId: user._id})
                            // console.log(currentUserAddresses)
                            let userWalletAddressArray = []
                            for (let i = 0; i < currentUserAddresses.length; i++) {
                                userWalletAddressArray.push(currentUserAddresses[i].ethWalletAddress)
                            }
                            if (userWalletAddressArray.includes(address)) {
                                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                                    chat_id: chatId,
                                    text: `This wallet address already exists`
                                });
                            } else {
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
        } else {
            await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                chat_id: chatId,
                text: `You can only add a wallet from a private chat`
            });
        }
    }

    if (message.includes("/list")) {
        let user = await User.findOne({ chatId });
        if (user) {
            let currentUserAddresses = await Address.find({ userId: user._id})
            let ethAddressString = "";
            for (let i = 0; i < currentUserAddresses.length; i++) {
                ethAddressString += `${i + 1} - ${currentUserAddresses[i].ethWalletAddress} \n`
            }
            if(currentUserAddresses.length > 0) {
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: `Wallets List: \n ${ethAddressString}`
                });
            } else {
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: `You don't have any wallet yet!`
                });
            }
        } else {
            await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                chat_id: chatId,
                text: `You don't have any wallet yet!`
            });
        }
    }

    if (message.includes("/deleteth")) {
        if(req.body.message.chat.type == "private") {
            let user = await User.findOne({ chatId });
            try {
                let address = message.split(" ")[1];
                if (address != null && address != undefined && address != "") {
                    let ethWalletAddress = await Address.findOne({ ethWalletAddress: address });
                    if (ethWalletAddress) {
                        let url = 'https://dashboard.alchemyapi.io/api/update-webhook-addresses'
                        let payload = {
                        "webhook_id":160296,
                        "addresses_to_add": [],
                        "addresses_to_remove":[address],
                        }
                        let headers = {"X-Alchemy-Token": "l6CjHMZFmF3jbts8ekpsGKKBuiyjkItL"}

                        await axios.patch(url, payload, {headers})

                        await Address.deleteOne({ ethWalletAddress: address });

                        // await user.ethAddress.filter(address => address != ethWalletAddress._id)

                        let index = await user.ethAddress.indexOf(ethWalletAddress._id)
                        await user.ethAddress.splice(index, 1);
                        await user.save()

                        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                            chat_id: chatId,
                            text: `Your wallet has been deleted successfully!`
                        });
                    } else {
                        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                            chat_id: chatId,
                            text: `You don't have any wallet yet!`
                        });
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
        } else {
            await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                chat_id: chatId,
                text: `You can only delete a wallet from a private chat`
            });
        }
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

app.post("/alchemy", async (req, res) => {
    if(req.body.webhookType === "ADDRESS_ACTIVITY") {
        let transactions = req.body.activity
        for(let i = 0; i < transactions.length; i++) {
            let userAddress = transactions[i].toAddress
            let senderAddress = transactions[i].fromAddress
            let value = transactions[i].value
            let asset = transactions[i].asset
            let category = transactions[i].category
            let addressFromDatabase = await Address.findOne({ ethWalletAddress: userAddress })
            if (addressFromDatabase) {
                let user = await User.findOne({ id: addressFromDatabase.userId });
                let chatId = user.chatId
                let userName = user.username
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: `Hello ${userName}, Your wallet ${userAddress} has been credited with ${value}${asset} successfully! Sent from ${senderAddress}`
                });
            }
            // } else {
            //     let user = await User.findOne({ id: "6218ac18ba9ed3f855e7a854" });
            //     if(user) {
            //         let chatId = user.chatId
            //         let userName = user.username
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

// app.listen(process.env.PORT || 3002, async () => {
//     console.log("Server running on port ", process.env.PORT || 3002);
//     await init()
// })

// app.get("/address", async (req, res) => {
//     const users = await User.find({}).sort({createdAt: -1}).exec();

//     return res.status(201).json({
//         message:  "Users Fetched Successfully!",
//         data: users,
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
      });
    } catch (err) {
      console.log(err);
      startServer();
    }
  };

  startServer();