const mongoClient= require('mongodb').MongoClient
const state={
    db:null
}

module.exports.connect=function(done){
    const url='mongodb+srv://styleworld:xxxxxxxxxxxxxx@cluster0.eptbmcy.mongodb.net/?retryWrites=true&w=majority'
    const dbname='E-commerce_node_project'

    mongoClient.connect(url,(err,data)=>{
        if (err) return done(err)
        state.db=data.db(dbname)

        done()
    })
}

module.exports.get=function(){
    return state.db
}