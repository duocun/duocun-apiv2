import express from "express";
import { DB } from "../db";
import { Order, IOrder } from "../models/order";
import { Request, Response } from "express";
import { Controller, Code } from "./controller";

export class StatisticsController extends Controller {

  orderModel: Order;

  constructor(model: Order, db: DB) {
    super(model, db);
    this.orderModel = new Order(db);
  }


  
getStatistics(req: Request, res: Response) {
    const startDate:any = req.query.startDate;
    const endDate:any = req.query.endDate;  
    res.setHeader("Content-Type", "application/json");
    this.getStatisticsInfo(startDate,endDate).then((stat:any)=>{
        if(stat){
            res.send(
                JSON.stringify({
                    code: Code.SUCCESS,
                    data: stat,
                })
            );
        }else{
            res.send(
                JSON.stringify({
                    code: Code.FAIL,
                    data: [],
                })
            );
        }
    })
}   

getMerchantStatistics(req: Request, res: Response) {
    const startDate:any = req.query.startDate;
    const endDate:any = req.query.endDate;  
    res.setHeader("Content-Type", "application/json");
    this.getMerchantInfo(startDate,endDate).then((stat:any)=>{
        if(stat){
            res.send(
                JSON.stringify({
                    code: Code.SUCCESS,
                    data: stat,
                })
            );
        }else{
            res.send(
                JSON.stringify({
                    code: Code.FAIL,
                    data: [],
                })
            );
        }
    })
}
getDriverStatistics(req: Request, res: Response) {
    const startDate:any = req.query.startDate;
    res.setHeader("Content-Type", "application/json");
    this.getDriverInfo(startDate).then((stat:any)=>{
        if(stat){
            res.send(
                JSON.stringify({
                    code: Code.SUCCESS,
                    data: stat,
                })
            );
        }else{
            res.send(
                JSON.stringify({
                    code: Code.FAIL,
                    data: [],
                })
            );
        }
    })
}
getProductStatistics(req: Request, res: Response) {
    const startDate:any = req.query.startDate;
    const endDate:any = req.query.endDate;  
    res.setHeader("Content-Type", "application/json");
    this.getProductInfo(startDate,endDate).then((stat:any)=>{
        if(stat){
            res.send(
                JSON.stringify({
                    code: Code.SUCCESS,
                    data: stat,
                })
            );
        }else{
            res.send(
                JSON.stringify({
                    code: Code.FAIL,
                    data: [],
                })
            );
        }
    })
}
//return [{merchantId,merchantName,nOrders,totalPrice,totalCost}]
async getMerchantInfo(startDate:string,endDate:string) {
    const q = {
        deliverDate: {$gte: startDate, $lte:endDate}
    };
    const orders = await this.orderModel.joinFindV2(q);
    const merchantMap:any = {};
    orders.forEach(order=>{
        const merchant = order.merchant;
        const mId = merchant ? merchant._id : null;
        if (mId !== undefined) {
            if (!merchantMap[mId]) {
              merchantMap[mId] = {
                merchantId:"",
                merchantName:"",
                nOrders:0,
                totalPrice:0,
                totalCost:0,
              };
            }
            merchantMap[mId].merchantId = mId;
            merchantMap[mId].merchantName = order.merchant.name;
            merchantMap[mId].nOrders++;
            merchantMap[mId].totalPrice += order.price;
            merchantMap[mId].totalCost += order.cost;
        }
    });

    const merchantArray = [];
    for (let mId in merchantMap) {
        merchantArray.push({
          merchantId: mId, //商家id
          merchantName: merchantMap[mId].merchantName, //商家名
          nOrders: merchantMap[mId].nOrders, //商家有多少单
          totalPrice: parseFloat(merchantMap[mId].totalPrice.toFixed(2)), //总共销售额
          totalCost: parseFloat(merchantMap[mId].totalCost.toFixed(2)), //总共成本
        });
    }
    return merchantArray;    
}
//return [{productId,merchantName,price,cost,quantity,totalPrice,totalCost}]
async getProductInfo(startDate:string,endDate:string) {
    const q = {
        deliverDate: {$gte: startDate, $lte:endDate}
    };
    const orders = await this.orderModel.joinFindV2(q);
    const productMap:any = {};
    orders.forEach(order=>{
        const items = order.items;
        items.forEach((item: any)=>{
            const pId = item.productId;
            if (pId !== undefined) {
                if (!productMap[pId]) {
                  productMap[pId] = {
                    prdouctName: "",
                    merchantName: "",
                    price: 0,
                    cost: 0,
                    quantity: 0,
                    totalPrice: 0,
                    totalCost: 0,
                  };
                }
                productMap[pId].merchantName = order.merchant.name;
                productMap[pId].price = item.price;
                productMap[pId].cost = item.cost;
                productMap[pId].quantity += item.quantity;
                productMap[pId].totalPrice += item.price * item.quantity;
                productMap[pId].totalCost += item.cost * item.quantity;
              }
        })
    });

    const productArray = [];
    for (let pId in productMap) {
      productArray.push({
        productId: pId, //商品id
        merchantName: productMap[pId].merchantName, //商品是谁卖的
        price: productMap[pId].price, //商品单价
        cost: productMap[pId].cost, //商品成本
        quantity: productMap[pId].quantity, //一共卖了多少份
        totalPrice: parseFloat(productMap[pId].totalPrice.toFixed(2)), //总共销售额
        totalCost: parseFloat(productMap[pId].totalCost.toFixed(2)), //总共成本
      });
    }
    return productArray;
}
async getDriverInfo(startDate:string) {
    const q = {
        deliverDate: startDate
    };
    const orders = await this.orderModel.joinFindV2(q);
    const driverMap:any = {};
    orders.forEach(order=>{
        const driver = order.driver;
        const dId = driver ? driver._id : undefined;
        if (dId !== undefined) {
            if (!driverMap[dId]) {
              driverMap[dId] = {
                driverId: "",
                nOrders: 0,
                nProducts: 0,
                totalCost: 0,
                driverName: "",
                pickUpList: {},
              };
            }
            driverMap[dId].driverId = dId;
            driverMap[dId].nOrders++;
            driverMap[dId].nProducts += order.items.length;
            driverMap[dId].totalCost += order.cost;
            driverMap[dId].driverName = driver ? driver.username : "N/A";
            const merchant = order.merchant;
            const mId = merchant ? merchant._id : null;
            if (!driverMap[dId].pickUpList[mId]) {
                driverMap[dId].pickUpList[mId] = {
                    merchantId: "",
                    merchantName: "",
                    nProducts: 0,
                };
            }
            driverMap[dId].pickUpList[mId].merchantId = mId;
            driverMap[dId].pickUpList[mId].merchantName = merchant
              ? merchant.name
              : "N/A";
            driverMap[dId].pickUpList[mId].nProducts +=
              order.items.length;
        }

    })
    
    const driverArray = [];
    for (let dId in driverMap) {
      driverArray.push({
        driverId: driverMap[dId].driverId, //司机id
        nOrders: driverMap[dId].nOrders, //司机一共接了多少单（已有order中）
        nProducts: driverMap[dId].nProducts, // 司机一共拿了多少商品
        totalCost: parseFloat(driverMap[dId].totalCost.toFixed(2)), //这些商品一共值多少钱
        driverName: driverMap[dId].driverName, //司机名称
        pickUpList: driverMap[dId].pickUpList, //司机去了哪些商家（商家id，商家名，每个商家拿了多少）
      });
    }

    return driverArray;
}
//return {nOrders,nProducts,totalPrice,totalCost}
async getStatisticsInfo(startDate:string,endDate:string) {

    const q = {
        deliverDate: {$gte: startDate, $lte:endDate}
    };
    const orders = await this.orderModel.joinFindV2(q);
    const stat = {
      nOrders: 0,
      nProducts: 0,
      totalPrice: 0,
      totalCost: 0,
    };
    orders.forEach(order=>{
      if (orders) {
        stat.nOrders++;
        stat.nProducts += order.items.length;
        stat.totalPrice += order.price;
        stat.totalCost += order.cost;
      }
    });
    
    const totalPrice =  parseFloat(stat.totalPrice.toFixed(2)); //总收入
    const totalCost = parseFloat(stat.totalCost.toFixed(2));//总成本
    return {...stat,totalPrice,totalCost};
}


}
