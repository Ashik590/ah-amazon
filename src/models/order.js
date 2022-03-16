const mongoose = require("../db/db");

const schema = new mongoose.Schema({
    ordered_products:{
        type:Array,
        required:true
    },
    customer_name:{
        type:String,
        required:true
    },
    customer_email:{
        type:String,
        required:true
    },
    customer_phone:{
        type:String,
        required:true
    },
    country:{
        type:String,
        required:true
    },
    city:{
        type:String,
        required:true
    },
    area:{
        type:String,
        required:true
    },
    zip:{
        type:Number,
        required:true
    },
    payment:{
        type:Boolean,
        default:false
    },
    total_price:{
        type:String,
        required:true
    },
    delivered:{
        type:Boolean,
        default:false
    },
    Date:{
        type:Date,
        default:Date.now
    }
});

const Order = new mongoose.model("Order",schema);

module.exports = Order;