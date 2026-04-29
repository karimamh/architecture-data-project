const router = require('express').Router();
const mongoose = require('mongoose');


router.get('/', async (req,res)=>{
try{

const data = await mongoose.connection
.collection('street_kpis')
.aggregate([
{
$group:{
_id:null,
avg_global_score:{$avg:"$global_score"},
total_streets:{$sum:1},
max_score:{$max:"$global_score"}
}
}
]).toArray();

res.json(data[0]);

}catch(err){
res.status(500).json({
error:err.message
});
}
});


router.get('/top', async(req,res)=>{
try{

const docs=
await mongoose.connection
.collection('street_kpis')
.find({})
.sort({
global_score:-1
})
.limit(10)
.toArray();

res.json(docs);

}catch(err){
res.status(500).json({
error:err.message
});
}
});


module.exports=router;