const { Schema, model } = require("mongoose");

const AddressSchema = new Schema (
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        ethWalletAddress: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
)

module.exports = model("Address", AddressSchema);