import express, { json } from "express";

import pg from "pg";
import 'dotenv/config';
import bcrypt from "bcrypt"
import "cookie-session";
import passport from "passport";
import { Strategy } from 'passport-local';
import GoogleStrategy from "passport-google-oauth2"

var session =cookie-session()
const app = express();
const port = 3010;
const saltRounds = 10


var db = new pg.Client({
host: process.env.PG_HOST,
database: process.env.PG_DATABASE,
user: process.env.PG_USER,
password: process.env.PG_PASSWORD,
port: process.env.PG_PORT
})

db.connect();

app.use(express.static("./public"))

app.use(session({
    secret: process.env.SESSION_SECRET
}))
app.use(express.urlencoded({extended: true}))
app.use(passport.initialize());
app.use(passport.session())

app.get("/",  (req, res) =>{
    if(req.isAuthenticated()){
        res.render("../home.ejs", {user: true})
    }else{
    res.render("../home.ejs")
    }
})

app.get("/signUp", (req, res) =>{
    res.render("signUp.ejs")
})

app.post("/signUp", async (req, res) =>{
    
    if(req.body.password2 !=req.body.password){
        res.send("Passwords dont match")
    }

    bcrypt.hash(req.body.password, saltRounds,  async function (err, hash) {
        if(err){console.log(err)}

        //see if user exist
        try{
            var result  = await db.query("select * from  users  where email = ($1) ", [req.body.email])

            if (result.rows[0]){
                res.send("user already exist")
            }else{
            //insert into table
            await db.query("Insert into users (email, password) VALUES ($1, $2) ", [req.body.email, hash])
            }

        }catch(err){
            console.log(err)
            res.send("error registering user")
        }

       res.redirect("/login")
    });
    
})
app.get("/login", (req, res) =>{ 

   if(req.session.messages){
        res.render("login.ejs", {
            messages: req.session.messages[0]
        })
    }
    else {
        res.render("login.ejs")}
})

app.post("/login", passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
        failureMessage: true
    })
)

app.get("/notepad/", async (req, res)=>{
        var notepadNumber = req.query.number;
        try{ 
            var result = await db.query("SELECT data FROM notepad where user_id = $1 and notepad_number = $2", [ req.user.id , notepadNumber])
        }catch (err){console.log(err)}

        if (result.rows.length == 0){
            res.render("notepad.ejs", { notepadNumber: notepadNumber})
        }else{
            var data = JSON.parse(result.rows[0].data)
            data.lines.forEach((item)=>{
            item.text =  item.text.trim()
        })

        res.render("notepad.ejs", {data : data, notepadNumber: notepadNumber} )
    }
})


app.post("/notepad/", async(req, res )=>{
    if(req.isAuthenticated()){
        console.log(req.user)
        var notepadNumber = req.query.number;
        var formData = req.body;
        var textBoxList = [];
        var reorganizedFormData = {};
        reorganizedFormData["lines"] = []
        reorganizedFormData["title"] =  formData.title;

        //function to create an object to push to reorganizedFormData
        function newListItem ( linenumber, text, checkStatus){
            reorganizedFormData.lines.push({"line": linenumber, "text": text, "checkStatus": checkStatus}) 
        }

        //adds all entries that are text to a list
        Object.keys(formData).forEach((item) => {
            if(item.includes("textBox")){
            textBoxList.push(item)
            }})

        //creates variables to send to constructor function FormObject
        textBoxList.forEach((item)=>{

            var isChecked = null;
            var lineNumber = item.substring(item.indexOf("-") + 1)
            var text = formData[`textBox-${lineNumber}`]
            
            Object.keys(formData).forEach((item)=>{
                if (item === `checkbox-${lineNumber}`){
                    isChecked = true;
                }
            })

            if(isChecked != true){
                isChecked = false
            }

            newListItem( lineNumber, text, isChecked)
        })

        // find  percentage complete 
        let percentageComplete ;
            let total = 0;
            let checkedBoxes = 0;

            reorganizedFormData.lines.forEach((item)=>{ 
                if (item.text ){
                    total++
                    if (item.checkStatus === true){
                        checkedBoxes++
                    }
                }
            }) 
        
        percentageComplete = Math.round((checkedBoxes/total ) * 100)+ "%";

        if(percentageComplete === "NaN%"){
            percentageComplete = "0%"
        }

        //push to reorganized list
        reorganizedFormData["percentageComplete"] = percentageComplete 
        console.log(reorganizedFormData )

        //see if data is empty
        var isDataEmpty = await db.query("SELECT data FROM notepad WHERE user_id = $1 AND notepad_number =  $2 ", [ req.user.id, notepadNumber])
        console.log( isDataEmpty)

        //if empty insert
        if(isDataEmpty.rows.length == 0){
            var result = db.query("INSERT INTO notepad (data, user_id, notepad_number) VALUES ($1, $2, $3)", [reorganizedFormData, req.user.id, notepadNumber])
            res.redirect("/mylists") 
        }else{//if not empty update data
            await db.query("UPDATE notepad SET data = $1 where user_id = $2 AND notepad_number = $3 returning *;", [reorganizedFormData, req.user.id, notepadNumber])
            res.status(204).send() 
        }
    }else{
        res.redirect("/login")
    }
    })

    app.get("/myLists",  async (req, res) =>{

        if(req.isAuthenticated()){
            var userNotepads = await db.query("select * from notepad where user_id = $1", [req.user.id])
            userNotepads = userNotepads.rows

            //turn the data porperty to a object
            userNotepads.forEach((item)=>{
                item.data = JSON.parse(item.data)
            })

            res.render("myList.ejs", {userNotepads})
        }else{
            res.redirect("/login")
        }
})

app.get("/googleAuth", passport.authenticate("google", {
    scope:["profile" , "email"]
  }))

app.get("/googleAuthcb", passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
)

app.get("/logout", (req, res) =>{
    req.logOut((err)=>{
        if(err){console.log(err)}
    })
    res.redirect("/")
})

app.listen( port, ()=>{
    console.log("listening on port "+ port)
})

passport.use("local", new Strategy(async function verify(username, password, cb) {
    try{
        var result =  await db.query("select * FROM users WHERE email = ($1);", [username])
    }catch(err){console.log(err)} 
    
    if(result.rows.length == 0 ){
        return cb(null, false, {message: "incorrect username or password"})
    }else{ 
        var user = result.rows[0]
        console.log(user)

        if(user.password == null){
            cb(null, false , {message: "log in with google"})
        }else{
            //compare to hash
            bcrypt.compare(password, user.password,(err, result)=>{
                if(err){
                    return cb(err)
                }else{
                    if(result == true){
                        return cb(null , user)
                    }else{ 
                        return cb(null, false, {message: "incorrect username or password"})
                    }
                }
            })
        }
    } 
 }))

 passport.use("google", new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: "https://willdolist-production.up.railway.app/googleAuthCb"},
     async(accessToken, refreshToken, profile, cb)=>{
        try{
            var result = await db.query("SELECT * FROM users WHERE email = $1", [profile.email])
            if (result.rows.length == 0){
                await db.query("INSERT INTO users (email) VALUES ($1)", [profile.email])
                var user = await db.query("SELECT FROM users WHERE email = $1", [profile.email])
                var user = user.rows[0]
                cb(null, user)
            }else{
                var user = result.rows[0]
                    cb(null, user)
            }
        }catch(err){
            console.log(err)
        }
    }
 ))

 passport.serializeUser((user, done)=>{
        return done(null, user.id)
 })

 passport.deserializeUser( async(id, done)=>{
    try{
        var result= await db.query("SELECT * FROM users WHERE id = $1 ", [id])
        if(result.rows.length > 0 ){
            return done(null, result.rows[0])
        }
    }catch(err){
        console.log(err)
    }
 })
 