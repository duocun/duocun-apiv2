import { MongoClient, Db } from 'mongodb';

export class DB {

  private db: Db | undefined; // connected db
  private mongoClient: MongoClient | undefined;

  constructor() {

  }

  init(cfg: any): Promise<MongoClient>{
    const connectionStr = (cfg.USERNAME && cfg.PASSWORD)
      ? `mongodb://${cfg.USERNAME}:${cfg.PASSWORD}@localhost:${cfg.PORT}/${cfg.NAME}?authSource=admin`
      : 'mongodb://'+ cfg.HOST + ':' + cfg.PORT + '/' + cfg.NAME;
    console.log(connectionStr);
    const options = {
      poolSize: cfg.POOL_SIZE,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };

    return new Promise((resolve, reject) => {
      MongoClient.connect(connectionStr, options).then((connectClient: MongoClient) => {
        this.mongoClient = connectClient;
        const d: Db = connectClient.db(cfg.NAME);
        this.db = d;
        // console.log('mongodb connected ...');
        resolve(connectClient);
      },(err)=>{
        // console.log('mongodb connection exception ...');
        reject(err);
      });
    });
  }

  getDb(){
    return <Db> this.db;
  }

  getMongoClient() {
    return this.mongoClient;
  }

  close(): void {
    if (this.mongoClient) {
      this.mongoClient.close();
    }
  }

}

// let _db : any;

// module.exports = function(){
// 	return {

//     init: function(cfg: any){
//       // create connection pool
//       const connectionStr = 'mongodb://'+ cfg.HOST + ':' + cfg.PORT + '/' + cfg.NAME;
//       MongoClient.connect(connectionStr, {poolSize: cfg.POOL_SIZE}).then((client: MongoClient) => {
//         // if(err){
//         //   console.log('mongodb connection exception ...');
//         // }else{
//         //   console.log('mongodb connected ...');
//         //   _db = db;
//         // }
//       });
//     },

// 		getDatabase: function(){
// 			return _db;
//     },

// 		getCollection: function(name: string){
// 			return _db.collection(name);
//     },

// 		genObjectId: function(){
// 			return null; // new Mongojs.ObjectId();
//     },

// 		toObjectId: function(id: string){
// 			return null; // new Mongojs.ObjectId(sId);
// 		}
// 	};
// }
