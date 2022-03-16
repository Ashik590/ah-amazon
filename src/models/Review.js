const mongoose = require('../db/db');

const schema = new mongoose.Schema({
    reviewer_name:{
        type:String,
        required:true,
    },
    reviewer_email:{
        type:String,
        required:true,
    },
    rating:{
        type:Number,
        required:true,
        min:0,
        max:5,
    },
    heading:{
        type:String,
        required:true,
    },
    comment:{
        type:String,
        required:true,
    },
    helpful:{
        type:Number,
        default:0
    },
    productId:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        default:Date.now,
    }
});

const Review = new mongoose.model("Review",schema);

module.exports =  Review;