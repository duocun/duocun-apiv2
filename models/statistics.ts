import { DB } from "../db";
import { Model } from "./model";
import { Order, IOrder, OrderStatus, OrderType } from "../models/order";

export class Statistics {
  orderModel: Order;
  constructor(db: DB) {
    this.orderModel = new Order(db);
  }
  //return [{merchantId,merchantName,nOrders,totalPrice,totalCost}]
  async getMerchantInfo(startDate: string, endDate: string) {
    const q = {
      deliverDate: { $gte: startDate, $lte: endDate },
      status: {
        $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
      },
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
      status: {
        $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
      },
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
  
  // return [{productName, quantity}...]
  groupByProduct(orders: any[], type: string = OrderType.GROCERY) {
    const productMap: any = {};
    const rs = orders.filter(order => order.type === type);
    rs.forEach(r => {
      r.items.forEach((it: any) => {
        const productId = it.productId;
        const productName = it.productName;
        productMap[productId] = { productId, productName, quantity: 0 };
      });
    });
    rs.forEach(r => {
      r.items.forEach((it: any) => {
        productMap[it.productId].quantity += it.quantity;
      });
    });

    return Object.keys(productMap).map(pId => productMap[pId]);
  }


  groupByMerchant(orders: any[], type: string = OrderType.GROCERY) {
    const merchantMap: any = {};
    const rs = orders.filter(order => order.type === type);

    rs.forEach(r => {
      const merchantName = r.merchant? r.merchant.name: null;
      const merchantId = r.merchant ? r.merchant._id : null;
      merchantMap[merchantId] = { merchantId, merchantName, orders:[] };
    });

    rs.forEach(r => {
      const merchantId = r.merchant ? r.merchant._id : null;
      merchantMap[merchantId].orders.push(r);
    });

    return Object.keys(merchantMap).map(mId => merchantMap[mId]);
  }


  isPicked(order: IOrder) {
    return order.status === OrderStatus.LOADED || order.status === OrderStatus.DONE;
  }
  
  // return [{productName, quantity}...]
  async getDriverStatistics(deliverDate: string){
    const q = {
      deliverDate,
      status: {
        $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
      },
    };
    const dataSet = await this.orderModel.joinFindV2(q);
    const orders = dataSet.data;
    const driverMap: any = {};
    orders.forEach((order: any) => {
      const driverId = order.driver? order.driver._id : null;
      const driverName = order.driver ? order.driver.username : 'Unassign';
      driverMap[driverId] = {driverId, driverName, orders:[]};
    });

    orders.forEach((order: any) => {
      const driverId = order.driver? order.driver._id : null;
      driverMap[driverId].orders.push(order);
    });


    Object.keys(driverMap).forEach(driverId => {
      driverMap[driverId].merchants = this.groupByMerchant(driverMap[driverId].orders).map(group => ({
        merchantName: group.merchantName,
        items: this.groupByProduct(group.orders)
      }));
      delete driverMap[driverId].orders;
    });
    return driverMap;
  }

  //return {nOrders,nProducts,totalPrice,totalCost}
  async getStatisticsInfo(startDate: string, endDate: string) {
    const q = {
      deliverDate: { $gte: startDate, $lte: endDate },
      status: {
        $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
      },
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
