const settings = require('../settings.json')
// Mongo
const { MongoClient } = require('mongodb')
const url = `mongodb://${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}/${settings.mongo_db}`
const dbName = settings.mongo_db
const options = { 
                  useNewUrlParser: true,
                  poolSize: 10,
                  useUnifiedTopology: true
                }

let client, connection

connect = () => new Promise( (resolve, reject) => {

  async function setup() {
    try {
      client = new MongoClient(url, options)
      await client.connect()
      const db = client.db(dbName)
      connection = db
      resolve()
    } catch (err) {
      setTimeout(setup, 5000)
    }
  }
  setTimeout(setup, 5000)
})

 disconnect = () => {
   client.close()
   connection = null
 }

get = () => {
  if ( !connection ) {
    // this.connect()
    throw new Error("Must connect first!")
  }
  return connection
}

module.exports = {
  connect: connect,
  disconnect: disconnect,
  get: get
}