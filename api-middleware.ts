import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Config } from "./config";
import { Account } from "./models/account";
import { DB } from "./db";
import { dbo } from "./server";
export class ApiMiddleWare {
    constructor() {
    }

    async auth(req: Request, res: Response, next: any) {
      let token = req.get('Authorization') || (`${req.query.token}` || "");
      token = token.replace("Bearer ", "");
      if(
        req.path === "/api/admin/accounts/login"
        || req.path.indexOf("api/admin/accounts/current") !== -1
      ){
      // if(req.path === '/api/Accounts/wxLogin' || req.path === '/api/Accounts/wechatLogin' || req.path === '/api/Accounts/login'
      //   || req.path === '/api/Accounts/signup' || req.path === '/api/Accounts/logout'
      //   || req.path === '/api/Accounts/loginByPhone'
      //   || req.path === '/api/Accounts/verifyCode'
      //   || req.path === '/api/Accounts/sendVerifyMsg'
      //   || req.path === '/api/Accounts/verifyAndLogin'
      //   || (req.method === 'GET' && req.path.indexOf('/api/Accounts') !== -1)
      //   || req.path.indexOf('/api/Locations') !== -1
      //   || req.path.indexOf('/api/Restaurants') !== -1
      //   || req.path.indexOf('/api/Products') !== -1
      //   || req.path === '/api/Restaurants' || req.path === '/api/Restaurants/qFind' || req.path === '/api/Restaurants/load'
      //   || req.path === '/api/Products' || req.path === '/api/Products/qFind' || req.path === '/api/Products/categorize'
      //   || req.path === '/api/Ranges' || req.path === '/api/Ranges/overRange' || req.path === '/api/Ranges/inRange'
      //   || req.path === '/api/ClientPayments/notify'
      //   || req.path.includes('.jpeg') || req.path.includes('.jpg') || req.path.includes('.png')){
        next();
      }else{
        res.setHeader('Content-Type', 'application/json');
        const cfg = new Config();
        if (token) {
          try {
            const accountId = jwt.verify(token, cfg.JWT.SECRET);
            // TODO: compare redis token
            if(accountId){
              const accountModel = new Account(dbo);
              accountModel.findOne({ _id: accountId }).then(account => {
                // TODO: check account role
                if (account) {
                  next();
                } else {
                  return res.status(401).send("Authorization failed");  
                }
              }).catch(e => {
                console.error(e);
                return res.status(401).send("Authorization failed");
              })
            }else{
              // return res.send(JSON.stringify({err: 401, msg:"Authorization: bad token"}, null, 3));
              return res.status(401).send("Authorization: bad token");
            }
          } catch (err) {
            // return res.send(JSON.stringify({err: 401, msg:"Authorization: bad token"}, null, 3));
            return res.status(401).send("Authorization: bad token err=" + err);
          }
            
        } else {
            return res.status(401).send("API Authorization token is required.");
        }
      }
    }
}
