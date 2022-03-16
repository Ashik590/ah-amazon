require('dotenv').config();
// Setting express framework
const express = require('express');
const app = express();

// Modules
const otpGenerator = require('otp-generator');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const crypto = require('crypto');

// Variables
const User = require('./models/user');
const Product = require('./models/product');
const Category = require('./models/category');
const Review = require('./models/Review');
const Order = require("./models/order");
const port = process.env.PORT || 5000;

// middlewares
app.use(express.static(path.join(__dirname,"../public")));
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());
app.use(fileUpload());

// functions
const otpSend = (otp,email) =>{
    const transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com",
        secureConnection: false,
        port: 587,
        tls: {
           ciphers:'SSLv3'
        },
        auth:{
            user:process.env.MAIL_USER,
            pass:process.env.MAIL_PASS
        }
    });

    const options = {
        from:'"Amazon" <azizulhakimashik0188@hotmail.com>',
        to:email,
        subject:"OTP sent from Amazon",
        html:`
            <style>
                @import url("//db.onlinewebfonts.com/c/157c6cc36dd65b1b2adc9e7f3329c761?family=Amazon+Ember");
                body{
                    font-family: "Amazon Ember", Arial, sans-serif;
                }
                p{
                    font-size: 14px;
                    line-height: 1.6;
                }
                .div{
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                }
            </style>
            <div style="width:500px;margin:auto">
                <h2 style='text-align:center'>Verify your Amazon account</h2>
                <hr/>
                <h3>${otp}</h3>
                <p>Do not share this OTP with anyone. Amazon takes your account security very seriously. Amazon Customer Service will never ask you to disclose or verify your Amazon password, OTP, credit card, or banking account number. If you receive a suspicious email with a link to update your account information, do not click on the link—instead, report the email to Amazon for investigation.</p>
                <p>Thank you!</p>
            </div>
        `,
    }

    transporter.sendMail(options,(err,info)=>{
        if(err){
            console.log(err);
        }else{
            console.log("Message has been sent",info.response);
        }
    });
}
const jwtLogin = (id,res) =>{
    const token = jwt.sign({id},process.env.SECRET_KEY);
    res.cookie('jwt',token,{
        secure:true,
        expires:new Date(parseInt(process.env.EXPIRE_COOKIE),0,1),
    });
}

// routing

app.post("/admin",(req,res)=>{
    try {
        const id = req.body.input.id;
        const pass = req.body.input.pass;

        if(id === process.env.ADMIN_ID && pass === process.env.ADMIN_PASS){
            res.cookie("yo",process.env.ADMIN_TOKEN);
            res.send('okay');
        }else{
            res.send('error');
        }
    } catch (error) {
        console.log(error);
    }
});
app.get("/get-admin",async(req,res)=>{
    const token = req.cookies.yo;
    if(token){
        if(token === process.env.ADMIN_TOKEN){
            res.send("okay")
        }else{
            res.send({result:"error"})
        }
    }else{
        res.send({result:"error"})
    }  
})
app.get("/get-admin-1",async(req,res)=>{
    const token = req.cookies.yo;
    if(token){
        if(token === process.env.ADMIN_TOKEN){
            const products = await Product.find().select({name:1,category:1});
            res.send({result:"okay",products})
        }else{
            res.send({result:"error"})
        }
    }else{
        res.send({result:"error"})
    }  
})
app.get('/auth',async(req,res)=>{
    try {
        const token = req.cookies.jwt;
        if(token){
            const id = jwt.verify(token,process.env.SECRET_KEY);
            const user = await User.findById(id.id);
            if(user){
                res.send(user);
            }else{
                res.send("");
            }
        }else{
            res.send("");
        }
    } catch (error) {
        res.send("");
    }
})
app.get('/getUserId',async(req,res)=>{
    try {
        const token = req.cookies.userId;
        const obj = jwt.verify(token,process.env.SECRET_KEY);
        const id = obj.id;

        const user = await User.findById(id);
        res.send(user)
    } catch (error) {
        console.log(error);
    }
})

app.post('/resend',async(req,res)=>{
    const otp = otpGenerator.generate(6, { alphabets: false, specialChars: false });
    const id = req.body.id;
    const user = await User.findByIdAndUpdate({_id:id},{$set:{otp:otp}});
    
    otpSend(otp,user.email);
    res.send('Otp sent')
});

app.post('/login-otp',async(req,res)=>{
    const otp = otpGenerator.generate(6, { alphabets: false, specialChars: false });
    const email = req.body.email;
    const id = await User.findOne({email}).select({id:1});
    const user = await User.findByIdAndUpdate(id._id,{$set:{otp:otp}});
    const token = jwt.sign({id:user._id},process.env.SECRET_KEY);

    res.cookie('userId',token,{ secure: true})
    otpSend(otp,user.email);
    res.send('Otp sent')
});

app.post('/register',async(req,res)=>{
    try {
        const password = await bcrypt.hash(req.body.pass,10);
        const otp = otpGenerator.generate(6, { alphabets: false, specialChars: false });
        
        const user = new User({
            name:req.body.name,
            email:req.body.email,
            pass: password,
            otp:otp,
        });
        const result = await user.save();
        otpSend(otp,req.body.email);
        console.log(result);

        const token = jwt.sign({id:result._id},process.env.SECRET_KEY);

        res.cookie('userId',token,{
            expires:new Date(parseInt(process.env.EXPIRE_COOKIE),0,1)
        })
        res.send("Good to go");
    } catch (error) {
        res.send(error)
    }    
});

app.post('/check-otp',async(req,res)=>{
    try {
        const id = req.body.id;
        const user = await User.findById(id);

        const otp = req.body.otp;

        if(otp === user.otp){
            if(req.body.changeEmail){
                const newEmail = user.pandingEmail;
                user.email = newEmail;
                user.pandingEmail = '';
                const result = await user.save();
                console.log(result);
                res.send('okay')
            }else if(req.body.forgetPass){
                res.send("okay")
            }else{
                if(!user.tsv){
                    user.isEmailVerified = true;
                    await user.save();
                    if(req.body.loginTime){
                        jwtLogin(user._id,res)
                    }
                    res.send("okay");
                }else{
                    jwtLogin(user._id,res)
                    res.send('okay')
                }
            }
        }else{
            res.send('error');
        }
    } catch (error) {
        console.log(error);
    }
});

app.post('/login',async(req,res)=>{
    try {
        const email = req.body.email;
        const pass = req.body.password;
        const user = await User.findOne({email});

        if(user){
            const isMatch = await bcrypt.compare(pass,user.pass);
            if(isMatch){
                if(user.isEmailVerified){
                    if(user.tsv){
                        const otp = otpGenerator.generate(6, { alphabets: false, specialChars: false });

                        user.otp = otp;
                        await user.save();
                        otpSend(otp,email);
                        res.send({result:"do tsv",id:user._id})
                    }else{
                        jwtLogin(user._id,res);
                        res.send('okay');
                        console.log("logged in successfully");
                    }
                }else{
                    res.send('not verified');
                    console.log('not verify');
                }
            }else{
                res.send('error')
            }
        }else{
            res.send('error')
        }
    } catch (error) {
        console.log(error);
    }
});

app.post('/change-email',async(req,res)=>{
    try{
        const id = req.body.id;
        const newEmail = req.body.newEmail;

        const hasEmail = await User.findOne({email:newEmail});

        if(!hasEmail){
            
            const otp = otpGenerator.generate(6, { alphabets: false, specialChars: false });
            otpSend(otp,newEmail);
            const user = await User.findByIdAndUpdate(id,{$set:{pandingEmail:newEmail,otp:otp}});
            console.log(user);
            res.send('Good to go')

        }else{
            res.send('error')
        }


    }catch(err){
        console.log(err);
    }
});

app.post('/change-name',async(req,res)=>{
    try {
        const id = req.body.id;
        const name = req.body.newName;

        const user = await User.findByIdAndUpdate(id,{$set:{name:name}});
        console.log(user);
        res.send('okay')
    } catch (error) {
        console.log(error);
    }
});

app.post('/change-pass',async(req,res)=>{
    try {
        const id = req.body.id;
        const currentPass = req.body.input.currentPass;
        const newPass = req.body.input.newPass;

        const user = await User.findById(id);

        const isMatchPass = await bcrypt.compare(currentPass,user.pass);

        if(isMatchPass){
            const pass = await bcrypt.hash(newPass,10);
            user.pass = pass;
            await user.save();
            res.send('okay')
        }else{
            res.send('Current password is wrong');
        }

    } catch (error) {
        console.log(error);
    }
});

app.get('/logout',async(req,res)=>{
    try {
        res.clearCookie('jwt')
        res.clearCookie('userId')
        res.send("okay")
    } catch (error) {
        console.log(error);
    }
});

app.post('/delete',async(req,res)=>{
    try {
        const id = req.body.id;
        const user = await User.findByIdAndDelete(id);
        console.log(user);
        res.clearCookie('jwt');
        res.clearCookie('userId');
        res.send("okay");
    } catch (error) {
        console.log(error);
    }
});

app.post('/add-img-product',async(req,res)=>{
    try {
        const images = [];
        for (let i = 0; i < Object.keys(req.files).length; i++) {
            const img = req.files["img"+i];
            const imgName = crypto.randomBytes(16).toString('hex') + path.extname(img.name);
            images.push(imgName);

            img.mv(path.join(__dirname, '../public/images/')+imgName,(err)=>{
                if(err){
                    console.log(err);
                }else{
                    console.log('Image uploaded');
                }
            })
        }
        console.log(images);
        res.send(images)
    } catch (error) {
        console.log(error);
    }
})
app.post('/add-product',async(req,res)=>{
    try {
        const {name, category, price, available, achivement, detail, content} = req.body.info;
        const photos = req.body.imgSrc;

        const product = new Product({
            name, category, price, available, achivement, detail, content,photos
        });

        const result = await product.save();

        console.log(result);
        
        res.send('okay')
    } catch (error) {
        console.log(error);
    }
});

app.post('/add-photo-category',async(req,res)=>{
    try {
        const photo = req.files.photo;
        const id = req.query.id;
        const category = await Category.findById(id);
        const photoName = crypto.randomBytes(16).toString('hex') + path.extname(photo.name);
        photo.mv(path.join(__dirname,"../public/images/")+photoName,(err)=>{
            if(err){
                console.log(err);
                return err;
            }

            console.log("Category photo uploaded");
        })
        category.photo = photoName;
        await category.save();
        res.send("okay")
    } catch (error) {
        console.log(error);
    }
});
app.post('/add-category',async(req,res)=>{
    try {
        const {name,desc} = req.body.info;

        const category = new Category({
            name,desc
        });

        const result = await category.save();
        console.log(result);
        res.send(result._id)
    } catch (error) {
        console.log(error);
        res.send('name error')
    }
});

app.get('/get-category',async(req,res)=>{
    try {
        const categories = await Category.find();
        res.send(categories)
    } catch (error) {
        console.log(error);
    }
})

app.get('/categori/:category',async(req,res)=>{
    // category page 
    try {
        const category = req.params.category;
        const products = await Product.find({category:category}).limit(6);
        const count = await Product.find({category:category}).countDocuments();
        res.send({products,count})
    } catch (error) {
        console.log(error);
    }
});
app.post('/get-product',async(req,res)=>{
    // Pagnating products
    try {
        const {index,last,category} = req.body;     
        const allProducts = await Product.find({category:category});
        // console.log(index,last);

        const products = allProducts.slice(index,last);

        console.log(products.length);
        res.send(products);

    } catch (error) {
        console.log(error);
    }
});

app.get('/item/:productId',async(req,res)=>{
    try {
        const id = req.params.productId;
        const product = await Product.findById(id);
        const categoryProducts = await Product.find({category:product.category,_id:{$ne:id}}).select({detail:0, content:0,allRating:0}).limit(16);

        res.send({product,categoryProducts})
    } catch (error) {
        console.log(error);
        if(error.kind === 'ObjectId'){
            res.send('error')
        }
    }
})
app.get('/product-edit/:productId',async(req,res)=>{
    try {
        const id = req.params.productId;
        const product = await Product.findById(id);

        res.send(product)
    } catch (error) {
        console.log(error);
        if(error.kind === 'ObjectId'){
            res.send('error')
        }
    }
})

app.get('/get-random-products',async(req,res)=>{
    try {
        const allCategory = await Category.find();
        const count = allCategory.length;
        const random1 = Math.round(Math.random() * count);
        const random2 = Math.round(Math.random() * count);

        const category1 = allCategory[0].name;// replace [0] with [random1]
        const category2 = allCategory[0].name;// replace [0] with [random2]

        const products1 = await Product.find({category:category1}).select({detail:0, content:0,allRating:0}).limit(16);
        const products2 = await Product.find({category:category2}).select({photos:1}).limit(16);
        
        res.send({products1,products2})
    } catch (error) {
        console.log(error);
    }
});
app.get('/get-random-products-only',async(req,res)=>{
    try {
        const allCategory = await Category.find();
        const count = allCategory.length;
        const random = Math.round(Math.random() * count);

        const category = allCategory[0].name;// replace [0] with [random]

        const products = await Product.find({category:category}).select({detail:0, content:0,allRating:0}).limit(16);
        
        res.send(products)
    } catch (error) {
        console.log(error);
    }
});

app.post("/create-review",async(req,res)=>{
    try {
        const {name,email,heading,rating,comment,productId} = req.body;
        
        const review = new Review({
            reviewer_name:name,
            reviewer_email:email,
            heading,rating,comment,productId
        });

        const product = await Product.findById(productId);

        let allRating = product.allRating + 1;
        
        let ratings = await Review.find({productId}).select({rating:1,_id:0});
        let ratingProduct = 0;
        
        ratings.map((rate)=>{
            ratingProduct = ratingProduct + rate.rating
        });
        ratingProduct = (ratingProduct + rating) / allRating;

        product.allRating = allRating;
        product.rating = ratingProduct;

        await product.save();
        const result = await review.save();
        console.log(result);
        res.send("good")
    } catch (error) {
        console.log(error);
    }
});

app.get("/get-few-review/:productId",async(req,res)=>{
    try {
        const productId = req.params.productId;
        const review = await Review.find({productId}).limit(3).sort({date:-1});
        const rating = await Review.find({productId}).select({rating:1,_id:0});
        console.log(review);

        let ratingStar = {
            star1:0,
            star2:0,
            star3:0,
            star4:0,
            star5:0,
        };

        rating.map((rev)=>{
            if(rev.rating === 1){
                ratingStar.star1 = ratingStar.star1 + 1
            }
            else if(rev.rating === 2){
                ratingStar.star2 = ratingStar.star2 + 1
            }
            else if(rev.rating === 3){
                ratingStar.star3 = ratingStar.star3 + 1
            }
            else if(rev.rating === 4){
                ratingStar.star4 = ratingStar.star4 + 1
            }
            else if(rev.rating === 5){
                ratingStar.star5 = ratingStar.star5 + 1
            }
        })
        console.log(review,ratingStar);
        res.send({review,ratingStar})
    } catch (error) {
        console.log(error);
    }
});

app.get("/get-all-review/:productId",async(req,res)=>{
    try {
        const productId = req.params.productId;
        const review = await Review.find({productId}).sort({date:-1});
        console.log(review.length);
        res.send(review)
    } catch (error) {
        console.log(error);
    }
});
app.get("/get-all-top-review/:productId",async(req,res)=>{
    try {
        const productId = req.params.productId;
        const review = await Review.find({productId}).sort({rating:-1});
        console.log(review.length);
        res.send(review)
    } catch (error) {
        console.log(error);
    }
});

app.post("/helpful",async(req,res)=>{
    try {
        let {id,helpful,userId,userHelpful} = req.body;
        helpful = helpful + 1;

        userHelpful.push(id);
        
        const user = await User.findByIdAndUpdate(userId,{$set:{helpful_review:userHelpful}});
        const review = await Review.findByIdAndUpdate(id,{$set:{helpful}});
        res.send("Okay")
    } catch (error) {
        console.log(error);
    }
});

app.post("/add-cart",async(req,res)=>{
    try {
        const {product,user} = req.body;

        const cartObj = {
            productId:product.id,
            price:product.price,
            photo:product.photo,
            name:product.name
        };

        const cart = user.cart;
        cart.push(cartObj);

        const result = await User.findByIdAndUpdate(user.id,{$set:{cart:cart}});
        console.log(result);
        res.send("okay")

    } catch (error) {   
        console.log(error);
    }
});

app.post("/change-quantity",async(req,res)=>{
    try {
        const {cartId,quantity} = req.body;
        let totalBill = 0;

        const user = await User.findOne({"cart._id":cartId}).select({cart:1});
        user.cart.map((cart)=>{
            if(cart._id == cartId){
                cart.quantity = quantity;
            }
            totalBill += parseFloat((cart.price * cart.quantity).toFixed(2))
        });
        console.log(totalBill);
        await user.save();
        res.send({condition:"okay",totalBill});

    } catch (error) {
        console.log(error);
    }
});

app.post("/place-order",async(req,res)=>{
    try {
        const {name,email,phone,country,city,area,zip,cart} = req.body.orderInfo;

        console.log(req.body.orderInfo);

        let total_price = 0;
        cart.map((obj)=>{
            total_price += parseFloat((parseFloat(obj.price) * obj.quantity).toFixed(2));
        });

        const order = new Order({
            ordered_products:cart,
            customer_name:name,
            customer_email:email,
            customer_phone:phone,
            country:country,
            city:city,
            area:area,
            zip:zip,
            total_price:total_price.toString(),
        });

        const result = await order.save();
        console.log(result);
        res.send({result:"okay",id:result._id})

    } catch (error) {
        console.log(error);
    }
});

app.get("/get-amount/:orderId",async(req,res)=>{
    try {
        const id = req.params.orderId;
        const info = await Order.findById(id).select({total_price:1,customer_name:1,customer_email:1});

        console.log(info);
        res.send(info)
    } catch (error) {
        console.log(error);
    }
});

app.post("/success-payment",async(req,res)=>{
    try {
        const {id,email} = req.body;

        const user = await User.findOne({email});
        user.cart = [];
        await user.save();
        
        console.log("Payment done");
        const order = await Order.findByIdAndUpdate(id,{$set:{payment:true}});

        res.send("okay");

    } catch (error) {
        console.log(error);
    }
});

app.post("/delete-product",async(req,res)=>{
    try {
        const {id} = req.body;

        const product = await Product.findByIdAndDelete(id);
        console.log(product);
        res.send("okay");

    } catch (error) {
        console.log(error);
    }
});

app.post("/your-order",async(req,res)=>{
    try {
        const {email} = req.body;

        const orders = await Order.find({customer_email:email}).sort({Date:-1});
        res.send(orders)

    } catch (error) {
        console.log(error);
    }
});

app.get("/get-all-orders",async(req,res)=>{
    try {
        const orders = await Order.find().sort({date:-1});
        
        const newOrders = orders.filter((order)=>{
            return order.delivered === false
        });
        const prevOrders = orders.filter((order)=>{
            return order.delivered === true
        });

        res.send({newOrders,prevOrders})

    } catch (error) {
        console.log(error);
    }
});

app.post("/change-deliver",async(req,res)=>{
    try {
        const {orderId,value} = req.body;
        console.log(orderId,value);

        const order = await Order.findByIdAndUpdate(orderId,{$set:{delivered:value}})
        res.send("okay")
    } catch (error) {
        console.log(error);
    }
});

app.get("/get-email/:id",async(req,res)=>{
    try {
        const id = req.params.id;

        const user = await User.findById(id).select({email:1});
        if(user){
            res.send(user.email);
        }else{
            res.send("")
        }
    } catch (error) {
        console.log(error);
        res.send('')
    }
});

app.post("/change-tsv",async(req,res)=>{
    try {
        const {mode,id} = req.body;
        
        const user = await User.findByIdAndUpdate(id,{$set:{tsv:!mode}});
        console.log(user.tsv);
        if(mode){
            res.send("off");
        }else{
            res.send("on")
        }
    } catch (error) {
        console.log(error);
    }
});

app.post("/search-product",async(req,res)=>{
    try {
        const {keyword,category} = req.body;
        const regex = new RegExp(`${keyword}`, 'i');

        console.log(category,keyword);
        let products;
        if(category === 'all'){
            products = await Product.find({name: regex });
        }else{
            products = await Product.find({name:regex,category});
        }

        res.send(products);

    } catch (error) {
        console.log(error);
    }
});

app.post("/delete-cart",async(req,res)=>{
    try {
        const {userId,orderId} = req.body;

        const user = await User.findById(userId);

        user.cart = user.cart.filter((cart)=>{
            return cart._id != orderId
        });

        await user.save();

        let totalBill = 0;
        user.cart.map((product)=>{
            totalBill += (parseFloat(product.price) * product.quantity)
        });
        console.log(totalBill);

        res.send({result:"okay",totalBill})

    } catch (error) {
        console.log(error);
    }
});

app.post("/check-user",async(req,res)=>{
    try {
        const {email} = req.body;

        const user = await User.findOne({email});
        console.log(user);
        if(user){
            const otp = otpGenerator.generate(6, { alphabets: false, specialChars: false });
            otpSend(otp,email);
            user.otp = otp;
            await user.save();

            res.send({
                result: "okay",
                id:user._id
            })
        }else{
            res.send({result:"error"})
        }
    } catch (error) {
        console.log(error);
    }
});

app.post("/reset-password-forget",async(req,res)=>{
    try {
        const {id,pass} = req.body;

        const password = await bcrypt.hash(pass,10);
        const user = await User.findByIdAndUpdate(id,{$set:{pass:password}});
        console.log(user);
        res.send("okay")
    } catch (error) {
        console.log(error);
    }
});

app.use(express.static(path.join(__dirname,"../build")));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname,"../build/index.html"));
})

// Initial stuff
app.listen(port,()=>{
    console.log("Server running port at",port);
})