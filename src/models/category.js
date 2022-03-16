const mongoose = require('../db/db');

const schema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
        unique:true
    },
    photo:{
        type:String,
    },
    desc:{
        type:String,
        required:true,
    },
});

const Category = new mongoose.model("Category", schema);

module.exports = Category;