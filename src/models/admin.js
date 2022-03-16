const mongoose = require('../db/db');
const adminSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    pass:{
        type:String,
        required:true
    },
});

const Admin = new mongoose.model("Admin", adminSchema);

module.exports = Admin;