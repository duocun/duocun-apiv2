import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Config } from "./config";
import { Account } from "./models/account";
import { DB } from "./db";
import { dbo } from "./server";

const excepts = [
  "/api/admin/accounts/login",
  "api/admin/accounts/current",
  "api/admin/accounts/forgot-password",
  "api/admin/accounts/login-by-otp",
];
export class ApiMiddleWare {
  constructor() {}

  async auth(req: Request, res: Response, next: any) {
    let token: any = req.get("Authorization") || req.query.token || "";
    token = token.replace("Bearer ", "");
    const path = req.path.toLowerCase();
    for (const allowed of excepts) {
      if (path.indexOf(allowed) !== -1) {
        return next();
      }
    }
    res.setHeader("Content-Type", "application/json");
    const cfg = new Config();
    if (token) {
      try {
        const accountId = jwt.verify(token, cfg.JWT.SECRET);
        // TODO: compare redis token
        if (accountId) {
          const accountModel = new Account(dbo);
          accountModel
            .findOne({ _id: accountId })
            .then((account) => {
              // TODO: check account role
              if (account) {
                res.locals.user = account;
                next();
              } else {
                return res.status(401).send("Authorization failed");
              }
            })
            .catch((e) => {
              console.error(e);
              return res.status(401).send("Authorization failed");
            });
        } else {
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
