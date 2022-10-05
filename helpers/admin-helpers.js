// const { Db } = require('mongodb');
var db = require('../config/connections');
const collection = require('../config/collections');
// const { order } = require('paypal-rest-sdk');
const objectId = require('mongodb').ObjectId;
const date_ob = new Date();

let yearUse = date_ob.getFullYear();
let month = date_ob.getMonth();
monthUSe = month + 1;

module.exports = {
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let admin = {
        userName: 'xxxxxxxxxxxx@gmail.com',
        password: xxxxxxxxxxxxxxxx,
      };
      let = { Email, Password } = userData;

      if (Email == admin.userName && Password == admin.password) {
        if (admin) {
          response.admin = admin;
          response.admin = true;
          resolve(response);
        } else {
          console.log('failed');
          resolve({ status: false });
        }
      } else {
        console.log('login  failed');
        resolve({ status: false });
      }
    });
  },

  blockedUser: (usrId, usrDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(usrId, usrDetails) },
          {
            $set: {
              action: false,
              status: false,
            },
          }
        );
      resolve();
    });
  },

  unblokUser: (usrId, usrDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(usrId, usrDetails) },
          {
            $set: {
              status: true,
              action: true,
            },
          }
        );
      resolve();
    });
  },
  getUserOrders: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find()
        .toArray();
      resolve(orders);
    });
  },
  getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let ordrtItems = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: objectId(orderId) },
          },
          {
            $unwind: '$products',
          },
          {
            $project: {
              item: '$products.item',
              quantity: '$products.quantity',
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTIONS,
              localField: 'item',
              foreignField: '_id',
              as: 'productItem',
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              productItem: { $arrayElemAt: ['$productItem', 0] },
            },
          },
        ])
        .toArray();
      resolve(ordrtItems);
    });
  },
  cancelOrder: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: { status: 'Order Canceld by dealer', action: false },
          }
        )
        .then(async () => {
          let order = await db
            .get()
            .collection(collection.ORDER_COLLECTION)
            .findOne({ _id: objectId(orderId) });
          if (order.PaymentMethod == 'Razorpay' || 'Paypal' || 'wallet') {
            db.get()
              .collection(collection.WALLET_COLLECTION)
              .updateOne(
                {
                  userId: objectId(order.userId),
                },
                {
                  $inc: { balance: order.totalPayabile },
                }
              );
            resolve();
          }
        });
    });
  },
  changeOrderStatus: (orderId, status) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: { status: status },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
  getPaymentMethodNums: (paymentMethod) => {
    return new Promise(async (resolve, reject) => {
      let response = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              PaymentMethod: paymentMethod,
            },
          },
          {
            $count: 'count',
          },
        ])
        .toArray();
      resolve(response);
    });
  },
  // getRevenue: (unit, count) => {
  //   return new Promise(async (resolve, reject) => {
  //     let response = await db
  //       .get()
  //       .collection(collection.ORDER_COLLECTION)
  //       .aggregate([
  //         {
  //           $match: {
  //             $expr: {
  //               $gt: [
  //                 '$date2',
  //                 {
  //                   $dateSubtract: {
  //                     startDate: '$$NOW',
  //                     unit: unit,
  //                     amount: count,
  //                   },
  //                 },
  //               ],
  //             },
  //           },
  //         },
  //         { $group: { _id: null, sum: { $sum: '$totalPrice' } } },
  //       ])
  //       .toArray();
  //     resolve(response);
  //   });
  // },
  getDailySalesReport: () => {
    return new Promise(async (resolve, reject) => {
      let dailyReport = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              $and: [
                {
                  date2: {
                    $gte: new Date(
                      new Date().getTime() - 1 * 24 * 60 * 60 * 1000
                    ),
                  },
                },
                {
                  action: true,
                },
              ],
            },
          },
          
          {
            $project: {
              userId:1,
              PaymentMethod: 1,
              totalPrice:1,
              discount:1,
              totalPayabile: 1,
              beforeDiscount:1,
              date1: 1,
            },
          },
          {
            $lookup: {
              from: collection.USER_COLLECTION,
              localField: 'userId',
              foreignField: '_id',
              as: 'userData',
            },
          },
          {
            $project: {
              Name: { $arrayElemAt: ['$userData.Name', 0] },
              PaymentMethod: 1,
              totalPrice:1,
              discount:1,
              totalPayabile: 1,
              beforeDiscount:1,
              date1: 1,
            },
          },
          {
            $project: {
              Name: 1,
              PaymentMethod: 1,
              totalPrice:1,
              discount:1,
              totalPayabile: 1,
              beforeDiscount:1,
              date1: 1,
            },
          },
        ])
        .toArray();
      resolve(dailyReport);
    });
  },
  getYearlySalesReport: () => {
    return new Promise(async (resolve, reject) => {
      let yearlyReport = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              action: true,
            },
          },
          {
            $project: {
              products: 1,
              totalPrice: 1,
              date2: 1,
              totalPayabile: 1,
              beforeDiscount: 1,
              year: { $year: '$date2' },
            },
          },
          {
            $match: { year: yearUse },
          },
          {
            $unwind: '$products',
          },
          {
            $project: {
              products: 1,
              totalPrice: 1,
              date2: 1,
              totalPayabile: 1,
              beforeDiscount: 1,
            },
          },
          {
            $group: {
              _id: {
                truncatedOrderDate: {
                  $dateTrunc: {
                    date: '$date2',
                    unit: 'month',
                    binSize: 1,
                  },
                },
              },
              mrp: {
                $sum: '$beforeDiscount',
              },
              payable: {
                $sum: '$totalPayabile',
              },
              qty: {
                $sum: '$products.quantity',
              },
            },
          },
          {
            $project: {
              month: { $month: '$_id.truncatedOrderDate' },
              mrp: 1,
              payable: 1,
              qty: 1,
            },
          },
          { $sort: { month: 1 } },
        ])
        .toArray();
      yearlyReport.map((element) => {
        element.date = element._id.truncatedOrderDate
          .toISOString()
          .replace(/T.*/, '')
          .split('-')
          .reverse()
          .join('-');
      });
      resolve(yearlyReport);
    });
  },
  monthlySalesReport: () => {
    return new Promise(async (resolve, reject) => {
      let monthlyReport = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              $and: [
                {
                  action: true,
                },
              ],
            },
          },
          {
            $project: {
              products: 1,
              totalPrice: 1,
              date2: 1,
              totalPayabile: 1,
              beforeDiscount: 1,
              year: { $year: '$date2' },
              month: { $month: '$date2' },
            },
          },
          {
            $match: {
              $and: [
                {
                  year: yearUse,
                },
                {
                  month: monthUSe,
                },
              ],
            },
          },
          {
            $unwind: '$products',
          },
          {
            $project: {
              products: 1,
              totalPrice: 1,
              date2: 1,
              totalPayabile: 1,
              beforeDiscount: 1,
            },
          },
          {
            $group: {
              _id: {
                truncatedOrderDate: {
                  $dateTrunc: {
                    date: '$date2',
                    unit: 'day',
                    binSize: 1,
                  },
                },
              },
              mrp: {
                $sum: '$beforeDiscount',
              },
              payable: {
                $sum: '$totalPayabile',
              },
              qty: {
                $sum: '$products.quantity',
              },
            },
          },
          {
            $project: {
              day: { $dayOfMonth: '$_id.truncatedOrderDate' },
              mrp: 1,
              payable: 1,
              qty: 1,
            },
          },
          { $sort: { day: 1 } },
        ])
        .toArray();
      monthlyReport.map((element) => {
        element.date = element._id.truncatedOrderDate
          .toISOString()
          .replace(/T.*/, '')
          .split('-')
          .reverse()
          .join('-');
      });
      resolve(monthlyReport);
    });
  },
  totalUSers: () => {
    return new Promise(async (resolve, reject) => {
      let totalUSers = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();
      totalUSers = totalUSers.length;
      resolve(totalUSers);
    });
  },
  totalProducts: () => {
    return new Promise(async (resolve, reject) => {
      let totalProducts = await db
        .get()
        .collection(collection.PRODUCT_COLLECTIONS)
        .find()
        .toArray();
      totalProducts = totalProducts.length;
      resolve(totalProducts);
    });
  },
  monthlyEarning: () => {
    return new Promise(async (resolve, reject) => {
      monthlyEarning = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              $and: [
                {
                  action: true,
                },
              ],
            },
          },
          {
            $project: {
              totalPayabile: 1,
              year: { $year: '$date2' },
              month: { $month: '$date2' },
            },
          },
          {
            $match: {
              $and: [
                {
                  year: yearUse,
                },
                {
                  month: monthUSe,
                },
              ],
            },
          },
          {
            $project: {
              totalPayabile: 1,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalPayabile' },
            },
          },
        ])
        .toArray();
      resolve(monthlyEarning);
    });
  },
  getChartData: async () => {
    let data = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
            $match: {
              action: true
            }
        }, {

            $group: {
                _id: {
                    truncatedOrderDate: {
                        $dateTrunc: {
                            date: "$date2",
                            unit: "month",
                            binSize: 1
                        }
                    }
                },
                sumQuantity: {
                    $sum: "$totalPayabile"
                }
            }
        },
         {
            $project: {
                month: {
                    $month: "$_id.truncatedOrderDate"
                },
                year:{$year:"$_id.truncatedOrderDate"},
                sumQuantity: 1
            }
        },
        {
            $match:{
                year:yearUse
            }
        }, {
            $sort: {
                month: 1
            } 
        }
    ]).toArray()


    if (data.length < 12) {

        for (let i = 1; i <= 12; i++) {
            let datain = true;
            for (let j = 0; j < data.length; j++) {
                if (data[j].month === i) {
                    datain = null;
                }

            }

            if (datain) {
                data.push({sumQuantity: 0, month: i})
            }

        }
    }
    await data.sort(function (a, b) {
        return a.month - b.month
     });
     let linChartData=[];
     data.map((element)=>{
        let a=element.sumQuantity
        linChartData.push(a)

     })
     return linChartData
},
  yearlyEarning: () => {
    return new Promise(async (resolve, reject) => {
      yearlyEarning = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              action: true,
            },
          },
          {
            $project: {
              totalPayabile: 1,
              year: { $year: '$date2' },
            },
          },
          {
            $match: {
              year: yearUse,
            },
          },
          {
            $project: {
              totalPayabile: 1,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalPayabile' },
            },
          },
        ])
        .toArray();
      resolve(yearlyEarning);
    });
  },
};
