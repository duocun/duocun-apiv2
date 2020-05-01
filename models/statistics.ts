import { DB } from "../db";
import { Model } from "./model";
import { Order, IOrder } from "../models/order";

export class Statistics {
  orderModel: Order;
  constructor(db: DB) {
    this.orderModel = new Order(db);
  }
  //return [{merchantId,merchantName,nOrders,totalPrice,totalCost}]
  async getMerchantInfo(startDate: string, endDate: string) {
    const q = {
      deliverDate: { $gte: startDate, $lte: endDate },
    };
    const dataSet = await this.orderModel.joinFindV2(q);
    const orders = dataSet.data;
    const merchantMap: any = {};
    orders.forEach((order: any) => {
      const merchant = order.merchant;
      const mId = merchant ? merchant._id : null;
      if (mId !== undefined) {
        if (!merchantMap[mId]) {
          merchantMap[mId] = {
            merchantId: "",
            merchantName: "",
            nOrders: 0,
            totalPrice: 0,
            totalCost: 0,
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
  async getProductInfo(startDate: string, endDate: string) {
    const q = {
      deliverDate: { $gte: startDate, $lte: endDate },
    };
    const dataSet = await this.orderModel.joinFindV2(q);
    const orders = dataSet.data;
    const productMap: any = {};
    orders.forEach((order: any) => {
      const items = order.items;
      items.forEach((item: any) => {
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
      });
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
  async getDriverInfo(startDate: string) {
    const q = {
      deliverDate: startDate,
    };
    const dataSet = await this.orderModel.joinFindV2(q);
    const orders = dataSet.data;
    const driverMap: any = {};
    orders.forEach((order: any) => {
      const items = order.items;
      items.forEach((item:any)=>{
      const driver = order.driver;
      const dId = driver ? driver._id : undefined;
      if (dId !== undefined) {
        if (!driverMap[dId]) {
          driverMap[dId] = {
            driverId: "",
            nOrders: 0,
            totalCost: 0,
            phone:"",
            driverName: "",
            merchantMap: {},
          };
        }
        driverMap[dId].driverId = dId;
        driverMap[dId].nOrders++;
        driverMap[dId].totalCost += order.cost;
        driverMap[dId].phone = driver.phone? driver.phone: "N/A";
        driverMap[dId].driverName = driver ? driver.username : "N/A";
        const merchant = order.merchant;
        const mId = merchant ? merchant._id : null;
        if (!driverMap[dId].merchantMap[mId]) {
          driverMap[dId].merchantMap[mId] = {
            merchantName: "",
            itemMap:{},
          };
        }
        driverMap[dId].merchantMap[mId].merchantName = merchant
          ? merchant.name
          : "N/A";
        const pId = item? item.productId.toString():null;
        if(!driverMap[dId].merchantMap[mId].itemMap[pId]){
          driverMap[dId].merchantMap[mId].itemMap[pId]= {
            productName: "",
            quantity: 0,
          };
        }
        driverMap[dId].merchantMap[mId].itemMap[pId].productName = item.productName;
        driverMap[dId].merchantMap[mId].itemMap[pId].quantity += item.quantity;
        
      }
    });
    });

    const driverArray = [];
    for (let dId in driverMap) {
      driverArray.push({
        driverId: driverMap[dId].driverId, //司机id
        nOrders: driverMap[dId].nOrders, //司机一共接了多少单（已有order中）
        nProducts: driverMap[dId].nProducts, // 司机一共拿了多少商品
        totalCost: parseFloat(driverMap[dId].totalCost.toFixed(2)), //这些商品一共值多少钱
        driverName: driverMap[dId].driverName, //司机名称
        phone: driverMap[dId].phone, //手机
        merchantMap: driverMap[dId].merchantMap, //司机去了哪些商家（商家id，商家名，每个商家拿了多少）
      });
    }

    return driverArray;
  }
  //return {nOrders,nProducts,totalPrice,totalCost}
  async getStatisticsInfo(startDate: string, endDate: string) {
    const q = {
      deliverDate: { $gte: startDate, $lte: endDate },
    };
    const dataSet = await this.orderModel.joinFindV2(q);
    const orders = dataSet.data;
    const stat = {
      nOrders: 0,
      nProducts: 0,
      totalPrice: 0,
      totalCost: 0,
    };
    orders.forEach((order: any) => {
      if (orders) {
        stat.nOrders++;
        stat.nProducts += order.items.length;
        stat.totalPrice += order.price;
        stat.totalCost += order.cost;
      }
    });

    const totalPrice = parseFloat(stat.totalPrice.toFixed(2)); //总收入
    const totalCost = parseFloat(stat.totalCost.toFixed(2)); //总成本
    return { ...stat, totalPrice, totalCost };
  }
}
