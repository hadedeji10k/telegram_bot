const { Schema, model } = require("mongoose");

const TransactionSchema = new Schema (
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        ethWalletAddress: {
            type: Schema.Types.ObjectId,
            ref: "Address",
        },
        receiverAddress: {
            type: String,
            required: true
        },
        senderAddress: {
            type: String,
            required: true,
        },
        value: {
            type: Number,
            required: true,
        },
        asset: {
            type: String,
            required: true,
        }
    },
    { timestamps: true }
)

module.exports = model("Transaction", TransactionSchema);