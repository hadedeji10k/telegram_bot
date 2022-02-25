const { Schema, model } = require("mongoose");

const UserSchema = new Schema (
    {
        firstName: {
            type: String,
        },
        lastName: {
            type: String,
        },
        userName: {
            type: String,
        },
        chatId: {
            type: String,
            required: true,
        },
        ethAddress1: {
            type: String,
        },
        ethAddress: [{
            type: Schema.Types.ObjectId,
            ref: "Address",
        }]
    },
    { timestamps: true }
)

module.exports = model("User", UserSchema);