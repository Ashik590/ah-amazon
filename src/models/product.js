const mongoose = require('../db/db');

const schema =  new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    price:{
        type:String,
        required:true,
    },
    available:{
        type:String,
        required:true,
    },
    achivement:{
        type:String,
        required:true,
    },
    photos:[
        {
            type:String,
            required:true,
        }
    ],
    detail:[
        {
            property:String,
            value:String,
        }
    ],
    content:[{
        type:String
    }],
    allRating:{
        type:Number,
        default:0,
    },
    rating:{
        type:Number,
        default:0,
    },
});

const Product = new mongoose.model("Product",schema);

module.exports = Product;