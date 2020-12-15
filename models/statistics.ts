import { DB } from "../db";
import { Model } from "./model";
import { Order, IOrder, OrderStatus, OrderType } from "../models/order";
import { Pickup, PickupStatus } from "./pickup";
import { PickupByOrder } from "./pickup-by-order";
import { TransactionAction, Transaction, ITransaction } from "./transaction";
import { Account } from "./account";
import { DateTime } from "./date-time";
import { Assignment } from "./assignment";
import { UNASSIGNED_DRIVER_ID, UNASSIGNED_DRIVER_NAME } from "./driver";
import { Product, ProductStatus } from "./product";

export class Statistics extends Model{
  orderModel: Order;
  pickupModel: Pickup;
  pickupByOrderModel: PickupByOrder;
  transactionModel: Transaction;
  accountModel: Account;
  assignmentModel: Assignment;
  productModel: Product;

  constructor(db: DB) {
    super(db, 'statistics');
    this.orderModel = new Order(db);
    this.pickupModel = new Pickup(db);
    this.pickupByOrderModel = new PickupByOrder(db);
    this.transactionModel = new Transaction(db);
    this.accountModel = new Account(db);
    this.assignmentModel = new Assignment(db);
    this.productModel = new Product(db);
  }
  async getById(id: string){
    return;
  }

  /**
   * get sales, cost, nOrders and nProducts
   * date: 'YYYY-MM-DD'
   * dateType: 'Delivery Date', 'Order Date'
   */
  async getSalesMap(date: string, dateType: string){
    const dt = new DateTime();
    const created = dt.getMomentFromLocal(`${date}T00:00:00`).toISOString();
    const query = dateType === 'Order Date' ? {
      status: {
        $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
      },
      created: {$gte: created}
    } : {
      status: {
        $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
      },
      deliverDate: {$gte: date}
    };

    const orders = await this.orderModel.find(query);
    return this.orderModel.getSalesMap(orders, dateType === 'Order Date' ? "created": "delivered");
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
      const mId = order.merchantId;
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
        merchantMap[mId].merchantName = order.merchantName;
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
  async getProductInfo(deliverDate: string) {
    const q = {
      deliverDate,
      status: {
        $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
      },
    };
    const dataSet = await this.orderModel.joinFindV2(q);
    const orders = dataSet.data;
    const productMap: any = {};
    orders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        const pId = item.productId.toString();
        productMap[pId] = {
          productName: item.productName,
          merchantName: order.merchantName,
          price: item.price,
          cost: item.cost,
          quantity: 0,
          totalPrice: 0,
          totalCost: 0,
        };
      });
    });

    orders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        const pId = item.productId.toString();
        productMap[pId].quantity += item.quantity;
        productMap[pId].totalPrice += item.price * item.quantity;
        productMap[pId].totalCost += item.cost * item.quantity;
      });
    });

    const productArray = [];
    for (let pId in productMap) {
      productArray.push({
        productId: pId, //商品id
        productName: productMap[pId].productName,
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
  
  // return [{productId, productName, quantity, pickupId, status}, ...]
  groupByProduct(driverId: string, orders: any[], pickups: any[], type: string = OrderType.GROCERY) {
    const productMap: any = {};
    const rs = orders.filter(order => order.type === type);
    rs.forEach(r => {
      r.items.forEach((it: any) => {
        const productId = it.productId.toString();
        const productName = it.productName;
        productMap[productId] = { productId, productName, quantity: 0, status: PickupStatus.UNPICK_UP  };
      });
    });

    rs.forEach(r => {
      r.items.forEach((it: any) => {
        const productId = it.productId.toString();
        productMap[productId].quantity += it.quantity;
      });
    });

    Object.keys(productMap).forEach(productId => {
      const pickup = pickups.find(p => p.driverId.toString() === driverId && p.productId.toString() === productId);
      if(pickup){
        if (productMap.hasOwnProperty(productId)) {
          productMap[productId].pickupId = pickup._id;
          productMap[productId].status = pickup.status;
        }
      }
    })
    // if (pickups && pickups.length > 0) {
    //   pickups.forEach((pickup: any) => {
    //     const productId = pickup.productId.toString();
    //     if (productMap.hasOwnProperty(productId)) {
    //       productMap[productId]._id = pickup._id;
    //       productMap[productId].status = pickup.status;
    //     }
    //   });
    // }

    return Object.keys(productMap).map(pId => productMap[pId]);
  }


  groupByMerchant(orders: any[], type: string = OrderType.GROCERY) {
    const merchantMap: any = {};
    const rs = orders.filter(order => order.type === type);

    rs.forEach(r => {
      const merchantName = r.merchantName;
      const merchantId = r.merchantId.toString();
      merchantMap[merchantId] = { merchantId, merchantName, orders:[] };
    });

    rs.forEach(r => {
      const merchantId = r.merchantId.toString();
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
    const delivered = deliverDate + 'T15:00:00.000Z';
    const pickups = await this.pickupModel.find({delivered});

    const driverMap: any = {'all': {driverId: 'all', driverName:'All', orders: []}};

    // when checking a future date, the pickups is posible to be empty
    pickups.forEach(p => {
      const driverId = p.driverId.toString();
      driverMap[driverId] = {driverId, driverName: p.driverName, orders: []}
    });

    orders.forEach((order: IOrder) => {
      const driverId = order.driverId? order.driverId.toString() : UNASSIGNED_DRIVER_ID;
      const driverName = order.driverId? order.driverName : UNASSIGNED_DRIVER_NAME;
      driverMap[driverId] = {driverId, driverName, orders: []};
    });

    orders.forEach((order: IOrder) => {
      const driverId = order.driverId? order.driverId.toString() : UNASSIGNED_DRIVER_ID;
      driverMap[driverId].orders.push(order);
      driverMap['all'].orders.push(order);
    });

    Object.keys(driverMap).forEach(driverId => {
      driverMap[driverId].merchants = this.groupByMerchant(driverMap[driverId].orders).map(group => ({
        merchantName: group.merchantName,
        items: this.groupByProduct(driverId, group.orders, pickups)
      }));
      delete driverMap[driverId].orders;
    });

    return driverMap;
  }

  async getDriverStatisticsByOrder(deliverDate: string){
    const delivered = deliverDate + 'T15:00:00.000Z';
    const pickups = await this.pickupByOrderModel.find({delivered});

    const driverMap: any = {};

    // when checking a future date, the pickups is posible to be empty
    pickups.forEach(p => {
      const driverId = p.driverId.toString();
      driverMap[driverId] = {driverId, driverName: p.driverName, pickups: []};
    });

    pickups.forEach(p => {
      const driverId = p.driverId.toString();
      driverMap[driverId].pickups = driverMap[driverId].pickups.concat(p);
    });

    return driverMap;
  }

  // return [{productName, quantity}...]
  async getSalaryStatistics(){
    const ts = await this.transactionModel.find({actionCode: 'PS'});
    const driverMap = this.getSalaryDriverMap(ts);
    Object.keys(driverMap).forEach(driverId => {
      const monthMap = this.getSalaryMonthMap(driverMap[driverId].transactions);
      driverMap[driverId].monthMap = monthMap;
    });
    return driverMap;
    // const monthMap: any = {}
    // ts.forEach((t: ITransaction) => {
    //   const date: any = t.created;
    //   const [y, m, d] = date.split('T')[0].split('-');
    //   const key = `${y}-${m}`;
    //   monthMap[key] = {transactions: [], amount: 0};
    // });

    // ts.forEach((t: ITransaction) => {
    //   const date: any = t.created;
    //   const [y, m, d] = date.split('T')[0].split('-');
    //   const key = `${y}-${m}`;
    //   monthMap[key].transactions.push({staffId: t.staffId, staffName: t.staffName, amount: t.amount, created: t.created});
    //   monthMap[key].amount = Math.round((monthMap[key].amount + t.amount) * 100) / 100;
    // });

    // Object.keys(monthMap).forEach(m => {
    //   const driverMap = this.calcMonthlySalary(monthMap[m].transactions);
    //   monthMap[m].driverMap = driverMap;
    // });

    // return monthMap;
  }

  getSalaryMonthMap(transactions: ITransaction[]){
    const monthMap: any = {}
    transactions.forEach((t: ITransaction) => {
      const date: any = t.created;
      const [y, m, d] = date.split('T')[0].split('-');
      const ym = `${y}-${m}`;
      monthMap[ym] = {amount: 0, ym};
    });

    transactions.forEach((t: ITransaction) => {
      const date: any = t.created;
      const [y, m, d] = date.split('T')[0].split('-');
      const ym = `${y}-${m}`;
      monthMap[ym].amount = Math.round((monthMap[ym].amount + t.amount) * 100) / 100;
    });
    return monthMap;
  }

  getSalaryDriverMap(transactions: ITransaction[]){
    const driverMap: any = {};
    transactions.forEach((t: any) => {
      driverMap[t.staffId] = {staffId: t.staffId, staffName: t.staffName, amount: 0, transactions:[]};
    });
    transactions.forEach((t: any) => {
      driverMap[t.staffId].transactions.push(t);
      driverMap[t.staffId].amount = Math.round((driverMap[t.staffId].amount + t.amount) * 100) / 100;;
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


  async getOrderAnalytics(startDate: string, endDate: string) {
    const q = {
      deliverDate: { $gte: startDate, $lte: endDate },
      status: {
        $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
      },
    };
    const dataSet = await this.orderModel.joinFindV2(q);
    const orders = dataSet.data;

    const priceMap: any = {};

    orders.forEach((order: any) => {
      priceMap[order.total] = 0; 
    });

    orders.forEach((order: any) => {
      priceMap[order.total]++; 
    });

    return priceMap;
  }

  async getProductAnalytics(startDate: string, endDate: string) {
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
      order.items.forEach((it: any) => {
        productMap[it.productId.toString()] = {name: it.productName, count: 0, price: it.price, cost: it.cost}; 
      });
    });

    orders.forEach((order: any) => {
      order.items.forEach((it: any) => {
        productMap[it.productId.toString()].count++; 
      });
    });

    return productMap;
  }

  async getDeliverCostAnalytics(startDate: string, endDate: string) {
    const q = {
      deliverDate: { $gte: startDate, $lte: endDate },
      status: {
        $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
      },
    };
    
    const orders = await this.orderModel.find(q);

    const driverMap: any = {};

    orders.forEach((order: any) => {
      if(order.driverId){
        driverMap[order.driverId.toString()] = {driverName: order.driverName, nOrders:0, salary:0};
      }
    });

    orders.forEach((order: any) => {
      if(order.driverId){
        driverMap[order.driverId.toString()].nOrders++;
      }
    });

    const qTr = {
      created: { 
        $gte: startDate+'T04:00:00.000Z',
        $lte: endDate+'T04:00:00.000Z' },
      actionCode: TransactionAction.PAY_SALARY.code
    }
    const trs = await this.transactionModel.find(qTr);
    Object.keys(driverMap).forEach(driverId => {
      const ts = trs.filter(t => t.staffId.toString() === driverId);
      let cost = 0;
      ts.forEach(t => {
        cost += t.amount;
      });
      driverMap[driverId].salary = Math.round(cost * 100)/100;
      const nOrders = driverMap[driverId].nOrders;
      driverMap[driverId].costPerOrder = Math.round(cost / nOrders * 100)/100;
    });

    return driverMap;
  }
}
