const mongoose=require('mongoose');
let postSchema=mongoose.Schema({
    content:String,
    likes:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    }],
    date:{
        type:Date,
        default:Date.now
    },
    user:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    }]
});
module.exports=mongoose.model('post',postSchema);