const express=require('express');
const app=express();
const userModel=require('./models/user.js');
const postModel=require('./models/post.js');
const path=require('path');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt');
const multerConfig=require('./config/multerConfig.js');
const cookieParser=require('cookie-parser');

app.use(cookieParser());
app.set('view engine','ejs');
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));

app.get('/',(req,res)=>{
    res.render('app');
})
app.get('/create',(req,res)=>{
    res.render('createPage');
})
app.get('/login',(req,res)=>{
    res.render('loginPage');
})
app.get('/logout',(req,res)=>{
    res.cookie("token","");
    res.redirect("/login");
})
app.get('/uploadPic',isLoggedIn,(req,res)=>{
    res.render('uploadPic');

})
app.get('/profile',isLoggedIn,async (req,res)=>{
    let data=jwt.verify(req.cookies.token,"biwy2e2b3ekduy8w23");
    let user=await userModel.findOne({email:data.email}).populate('posts');
    res.render('profile',{user});
})
app.get('/createPost',isLoggedIn,(req,res)=>{
    res.render("createPost");
})
app.get('/deletePost/:id',isLoggedIn,async (req,res)=>{
    let data=jwt.verify(req.cookies.token,"biwy2e2b3ekduy8w23");
    const postId=req.params.id;
    await postModel.findOneAndDelete({_id:postId});
    await userModel.findOneAndUpdate({email:data.email},{$pull:{posts:postId}});
    res.redirect('/profile');
})
app.get('/editHandler/:id',isLoggedIn,async (req,res)=>{
    let post=await postModel.findOne({_id:req.params.id});
    res.render('editPage',{post});
})
app.get('/likesHandler/:id',isLoggedIn,async (req,res)=>{
    let post=await postModel.findOne({_id:req.params.id}).populate("user");
    if(post.likes.indexOf(req.user.user_id)===-1){
        await postModel.findOneAndUpdate({_id:req.params.id},{$push:{likes:req.user.user_id}});
    }else{
        await postModel.findOneAndUpdate({_id:req.params.id},{$pull:{likes:req.user.user_id}});
    }
    res.redirect('/profile');
})
app.post('/editedPost/:id',async (req,res)=>{
    let content=req.body.editedContent;
    await postModel.findOneAndUpdate({_id:req.params.id},{content:content},{new:true});
    res.redirect('/profile');

})
app.post('/newUser',async (req,res)=>{
    let {name,email,password,age}=req.body;
    const userCheck= await userModel.findOne({email});
    if(userCheck){
      res.send("User already exists!!!");
    }else{
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    let user=await userModel.create({
                name,
                email,
                password:hash,
                age
            });
    let token=jwt.sign({ email:email,user_id:user._id },"biwy2e2b3ekduy8w23");
    res.cookie("token",token);
    console.log(`${user} created`);   //after setting cookie and before redirecting a statement like this is important so that cookie gets set properly otherwise issue can be caused while cookie setting.
    res.redirect('/profile');
        }
})
app.post('/uploaded',multerConfig.single('image'),async (req,res)=>{
   let pic=req.file.filename;
   if(pic){
    let data=jwt.verify(req.cookies.token,"biwy2e2b3ekduy8w23");
    await userModel.findOneAndUpdate({email:data.email},{profilepic:pic},{new:true});
   }
res.redirect('/profile');
})
app.post('/oldUser',async (req,res)=>{
    let {email,password}= req.body;
    let user=await userModel.findOne({email});
    if(user){
    const result=await bcrypt.compare(password,user.password);
    if(result){
            let token = jwt.sign({ email:email,user_id:user._id },"biwy2e2b3ekduy8w23");
            res.cookie("token",token);
            console.log('user logged in');
            res.redirect('/profile');
    }else{
            res.send(`<h3>Either email or password is incorrect!!!<h3>
                      <h4>Try Again!!!</h4>
                      <p>Redirecting to Login Page...</p>
                      <script>
                          setTimeout(()=>{
                            window.location.href="/login";
                            },3000);
                            </script>
                            `)
        }
    }else{
        res.send(`
  <h1>You don't have an Account!!!</h1>
  <h2>Create one first!!!</h2>
  <p>Redirecting to Create Account Page in 3 seconds...</p>
  <script>
    setTimeout(() => {
      window.location.href = "/create";
    }, 3000);
  </script>
`);
    }
})
app.post('/newPost',async (req,res)=>{
    let content=req.body.postContent;
    let data=jwt.verify(req.cookies.token,"biwy2e2b3ekduy8w23");
    let email=data.email;
    let user= await userModel.findOne({email});
    let post =await postModel.create({
        content,
        user:user._id
    })
    await userModel.findOneAndUpdate({email},{ $push: { posts: post._id } },{new:true});
    res.redirect('/profile');

})
function isLoggedIn(req,res,next){
    if(req.cookies.token===""){
        res.redirect("/login");
    }else{
        const data=jwt.verify(req.cookies.token,"biwy2e2b3ekduy8w23");
        req.user=data;
    next();
    }
}
app.listen(3000);