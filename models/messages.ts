import { DB } from "../db";
import { Model } from "./model";
import { ObjectID, Collection } from "mongodb";
import { Request, Response } from "express";


export interface MessageItem{
  _id: string;
  sender: string;
  receiver: string;
  senderImg: string;
  receiverImg: string;
  createdAt: number;
  readAt?: number;
  message: string;
  image?: string;
  read: boolean;
}

export class ChatMessage extends Model{
  constructor(db: DB){
    super(db, "messages");
  }

  async getUsers(req: Request, res: Response){
    let realQuery: any = req.query.options;
    console.log(realQuery);
    let c:Collection = await this.getCollection();
    c.aggregate([
        {
          $match: {
            receiver: 'manager'
          } 
        },
        {
          $sort: {
            "createdAt": -1
          }
        },
        {
          $project: {
            sender: 1,
            senderName: 1,
            senderImg: 1,
            createdAt: 1,
            message: 1,
            userNo: 1,
            isRead: {
              $cond: [ { $eq: [ "$read", false ] }, 1, 0 ]
            }

          }
        },
        {
          $group: {
            "_id": "$sender",
            "senderName": { $first: "$senderName"},
            "senderImg": { $first: "$senderImg"},
            "createdAt": { $first: "$createdAt"}, 
            "userNo": { $first: "$userNo"},
            "message": { $first: "$message"},
            unread: {
              $sum: "$isRead"
            }
          }
        },
        {
          $sort: {
            "createdAt": -1
          }
        },
        {
          $skip: realQuery.skip
        },
        {
          $limit: realQuery.limit
        }
    ], (err, ret) => {
      ret.toArray().then(arrayData => {
        res.send(
          JSON.stringify({
            code: "success",
            data: arrayData
          })
        )
      });
    });
  }

  async getChatMessages(req: Request, res: Response){
    let managerId = req.params.managerId;
    let userId = req.params.userId;
    let realQuery: any = req.query.options;
    let c:Collection = await this.getCollection();

    await c.updateMany({sender: userId}, {$set: { read: true, readAt: Date.now() }});

    let chatMessages = await c.find({ $or: [{ sender: userId }, { sender : managerId, receiver: userId }]}).sort('createdAt', -1).skip(realQuery.skip).limit(realQuery.limit).toArray();
    res.send(
      JSON.stringify({
        code: "success",
        data: chatMessages
      })
    )
  }

  resetMessage(req: Request, res: Response){
    let messageId = req.params.messageId;
    this.getCollection().then((c: Collection) => {
      c.updateOne({_id: new ObjectID(messageId)}, { $set: {read : true, readAt: Date.now()}}, (err, r:any) => {
        if(err){
          console.log(err);
        }else{
          res.send(
            JSON.stringify({
              code: 'success',
              data: r.result
            })
          )
        }
      })
    })
  }
}