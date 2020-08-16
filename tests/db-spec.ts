import { expect } from 'chai';
import { MongoClient, Db } from 'mongodb';

import { DB } from "../db";
import { Config } from "../config";

describe('DB connection', () => {
  const db: any = new DB();
  const cfg: any = new Config();
  let connection: any = null;

  it('should connect to database', (done) => {
    db.init(cfg.DATABASE).then((dbClient: MongoClient) => {
      connection = dbClient;
      const bConn = dbClient.isConnected();
      expect(bConn).to.eq(true);
      connection.close();
      const bConn2 = dbClient.isConnected();
      expect(bConn2).to.eq(false);
      done();
    });
  });
});