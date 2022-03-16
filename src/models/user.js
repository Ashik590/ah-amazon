const mongoose = require('../db/db');

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    pass:{
        type:String,
        required:true
    },
    photo:{
        type:String,
        default:"profile.png"
    },
    tsv:{
        type:Boolean,
        default:false
    },
    isEmailVerified:{
        type:Boolean,
        default:false
    },
    pandingEmail:{
        type:String
    },
    otp:String,
    helpful_review:[
        {
            type:String
        }
    ],
    cart:[
        {
            productId:String,
            name:String,
            photo:String,
            price:String,
            quantity:{
                type:Number,
                default:1
            }
        }
    ]
});

const User = new mongoose.model("User",userSchema);

module.exports = User;