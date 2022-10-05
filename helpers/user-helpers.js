var bcrypt = require('bcrypt');
const collection = require('../config/collections');
var db = require('../config/connections');
var Handlebars = require('handlebars');
const { response } = require('express');
const collections = require('../config/collections');
// const Lookups = require('twilio/lib/rest/Lookups');
const objectId = require('mongodb').ObjectId;
const Razorpay = require('razorpay');
const paypal = require('paypal-rest-sdk');
// const { resolve } = require('node:path');
// const { exit } = require('node:process');
const CC = require('currency-converter-lt');
var dateTime = require('node-datetime');
// const { USER_COLLECTION } = require('../config/collections');
// const { Result } = require('express-validator');
const niceInvoice = require('nice-invoice');
var dt = dateTime.create();
var formatted = dt.format('Y-m-d H:M:S');
require('dotenv').config();
var instance = new Razorpay({
  key_id: 'xxxxxxxxxxxxxxxxxxxxx',
  key_secret: process.env.KEY_SECRET,
});
paypal.configure({
  mode: 'sandbox', //sandbox or live
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
});

var businessDays = 7,
  counter = 0; // set to 1 to count from next business day
while (businessDays > 0) {
  var tmp = new Date();
  var startDate = new Date();
  tmp.setDate(startDate.getDate() + counter++);
  switch (tmp.getDay()) {
    case 0:
    case 6:
      break; // sunday & saturday
    default:
      businessDays--;
  }
}
var shipDate = tmp.toUTCString().slice(0, 16);

Handlebars.registerHelper('inc', function (value, options) {
  return parseInt(value) + 1;
});

async function debitAmountwallet(userId, amount, description, order) {
  let history = {};
  history = {
    description: description,
    ordeId: order,
    amount: amount,
    timeStamp: new Date(),
    date: new Date()
      .toISOString()
      .replace(/T.*/, '')
      .split('-')
      .reverse()
      .join('-'),
    debit: true,
    credit: false,
  };
  await db
    .get()
    .collection(collection.WALLET_COLLECTION)
    .updateOne(
      { userId: objectId(userId) },
      { $push: { history: history } },
      { $upsert: true }
    );
}

async function creditAmountwallet(userId, amount, description, order) {
  let history = {};
  history = {
    description: description,
    ordeId: order,
    amount: amount,
    timeStamp: new Date(),
    date: new Date()
      .toISOString()
      .replace(/T.*/, '')
      .split('-')
      .reverse()
      .join('-'),
    debit: false,
    credit: true,
  };
  await db
    .get()
    .collection(collection.WALLET_COLLECTION)
    .updateOne(
      { userId: objectId(userId) },
      { $push: { history: history } },
      { $upsert: true }
    );
}

module.exports = {
  doSignup: (userData, refferalCode) => {
    userData.yourRefferalCode = refferalCode;
    console.log(userData);
    return new Promise(async (resolve, reject) => {
      let response = {};
      let email = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Email: userData.Email });
      if (email) {
        console.log('same email');
        response.status = true;
        resolve(response);
      } else {
        userData.Password = await bcrypt.hash(userData.Password, 10);
        userData.action = true;
        userData.status = true;
        db.get()
          .collection(collection.USER_COLLECTION)
          .insertOne(userData)
          .then((data) => {
            resolve(data.insertedId);
            console.log(' no same email');
          });
      }
    });
  },
  createWallet: (userEmail) => {
    console.log('userEmail', userEmail);
    return new Promise(async (resolve, reject) => {
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({
        Email: userEmail,
      });
      if (user) {
        db.get().collection(collection.WALLET_COLLECTION).insertOne({
          userName: user.Email,
          userId: user._id,
          balance: 0,
        });
      }
    });
  },
  wallethistory: (userId) => {
    return new Promise(async (resolve, reject) => {
      let wallet = await db
        .get()
        .collection(collection.WALLET_COLLECTION)
        .find({ userId: objectId(userId) })
        .toArray();
      resolve(wallet);
    });
  },
  refferal: (refferalCode) => {
    return new Promise(async (resolve, reject) => {
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({
        yourRefferalCode: refferalCode,
      });
      console.log(user);
      if (user) {
        let userWallet = await db
          .get()
          .collection(collection.WALLET_COLLECTION)
          .findOne({
            userId: objectId(user._id),
          });
        if (userWallet) {
          db.get()
            .collection(collection.WALLET_COLLECTION)
            .updateOne(
              {
                userId: objectId(user._id),
              },
              {
                $inc: { balance: 2000 },
              }
            );
          let amount = 2000;
          let description = 'Referral Amount';
          let orderid = 'Referral ';
          creditAmountwallet(user._id, amount, description,orderid);
          let refferalError = false;
          resolve(refferalError);
        } else {
          db.get()
            .collection(collection.WALLET_COLLECTION)
            .insertOne({
              userId: objectId(user._id),
              balance: 2000,
            });
          let amount = 2000;
          let description = 'Referral Amount';
          let orderid='Referral'
          creditAmountwallet(user._id, amount, description,orderid);
          let refferalError = false;
          resolve(refferalError);
          resolve();
        }
      } else {
        let refferalError = true;
        resolve(refferalError);
      }
    });
  },

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Email: userData.Email });
      if (user) {
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            if (!user.action) {
              resolve({ action: false, status: true });
            } else {
              console.log('success');
              response.user = user;
              response.status = true;
              resolve(response);
            }
          } else {
            console.log('failed');
            resolve({ status: false });
          }
        });
      } else {
        console.log('login  failed');
        resolve({ status: false });
      }
    });
  },
  getAllUsers: (userData) => {
    return new Promise(async (resolve, reject) => {
      let userDet = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();
      resolve(userDet);
    });
  },

  addToWishlist: (proId, userId, data) => {
    proObj = {
      item: objectId(proId),
    };
    return new Promise(async (resolve, reject) => {
      let wishlist = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({
          userId: objectId(userId),
        });
      if (wishlist) {
        let itemExist = wishlist.product.findIndex(
          (product) => product.item == proId
        );
        if (itemExist != -1) {
          db.get()
            .collection(collection.WISHLIST_COLLECTION)
            .updateOne(
              {
                _id: objectId(data[0]._id),
              },
              {
                $pull: { product: { item: objectId(proId) } },
              }
            );
          resolve({ itemRemove: true });
        } else {
          db.get()
            .collection(collection.WISHLIST_COLLECTION)
            .updateOne(
              {
                userId: objectId(userId),
              },
              {
                $push: {
                  product: proObj,
                },
              }
            );
          console.log('itemAdded');
          resolve({ itemAdded: true });
        }
      } else {
        let wishlistObj = {
          userId: objectId(userId),
          product: [proObj],
        };
        console.log('ccccccccccccccccccccccccccc');
        db.get()
          .collection(collection.WISHLIST_COLLECTION)
          .insertOne(wishlistObj);
        resolve({ itemAdded: true });
      }
    });
  },

  getWishlistProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let wishlist = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .aggregate([
          {
            $match: { userId: objectId(userId) },
          },
          {
            $unwind: '$product',
          },
          {
            $project: {
              item: '$product.item',
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTIONS,
              localField: 'item',
              foreignField: '_id',
              as: 'product',
            },
          },
          {
            $project: {
              item: 1,
              productItem: { $arrayElemAt: ['$product', 0] },
            },
          },
        ])
        .toArray();
      resolve(wishlist);
    });
  },

  removeWishlistProduct: (data) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.WISHLIST_COLLECTION)
        .updateOne(
          {
            _id: objectId(data.cart),
          },
          {
            $pull: { product: { item: objectId(data.product) } },
          }
        )
        .then((response) => {
          resolve({ removeProduct: true });
        });
    });
  },

  addToCart: (proId, userId) => {
    let proObj = {
      item: objectId(proId),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (userCart) {
        let proExist = userCart.product.findIndex(
          (product) => product.item == proId
        );
        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId), 'product.item': objectId(proId) },
              {
                $inc: { 'product.$.quantity': 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              { $push: { product: proObj } }
            )
            .then((response) => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: objectId(userId),
          product: [proObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            resolve();
          });
      }
    });
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: '$product',
          },
          {
            $project: {
              item: '$product.item',
              quantity: '$product.quantity',
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
      resolve(cartItems);
    });
  },

  numberLogin: (userNum) => {
    console.log(userNum);
    return new Promise(async (resolve, reject) => {
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ MobileNumber: userNum.MobileNumber });
      if (user) {
        console.log('valid');

        response.user = user;
        console.log(response.user);
        resolve(response);
      } else {
        console.log('number not valid');
        response.status = false;
        resolve(response);
      }
    });
  },
  reSendOtp: (userNum) => {
    console.log(userNum);
    return new Promise(async (resolve, reject) => {
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ MobileNumber: userNum });
      if (user) {
        console.log('valid');

        response.user = user;
        console.log(response.user);
        resolve(response);
      } else {
        console.log('number not valid');
        response.status = false;
        resolve(response);
      }
    });
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (cart) {
        count = cart.product.length;
      }
      resolve(count);
    });
  },

  getWishlist: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let wishlist = await db
        .get()
        .collection(collections.WISHLIST_COLLECTION)
        .findOne({ userId: objectId(userId) });
      if (wishlist) {
        count = wishlist.product.length;
      }
      resolve(count);
    });
  },

  changeProductQty: (data, quantity, proId) => {
    data.quantity = parseInt(data.quantity);
    data.count = parseInt(data.count);
    return new Promise(async (resolve, reject) => {
      if (data.count == 1) {
        product = await db
          .get()
          .collection(collections.PRODUCT_COLLECTIONS)
          .findOne({
            _id: objectId(proId),
          });
        console.log(product.Stock, quantity);
        if (quantity >= product.Stock) {
          console.log('outOfstock');
          resolve({ outOfstock: true });
        } else {
          console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
          if (data.count == -1 && data.quantity == 1) {
            db.get()
              .collection(collection.CART_COLLECTION)
              .updateOne(
                { _id: objectId(data.cart) },
                {
                  $pull: { product: { item: objectId(data.product) } },
                }
              )
              .then((response) => {
                resolve({ removeProduct: true });
              });
          } else {
            db.get()
              .collection(collection.CART_COLLECTION)
              .updateOne(
                {
                  _id: objectId(data.cart),
                  'product.item': objectId(data.product),
                },
                {
                  $inc: { 'product.$.quantity': data.count },
                }
              )
              .then((response) => {
                resolve({ statuse: true });
              });
          }
        }
      } else {
        if (data.count == -1 && data.quantity == 1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { _id: objectId(data.cart) },
              {
                $pull: { product: { item: objectId(data.product) } },
              }
            )
            .then((response) => {
              resolve({ removeProduct: true });
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              {
                _id: objectId(data.cart),
                'product.item': objectId(data.product),
              },
              {
                $inc: { 'product.$.quantity': data.count },
              }
            )
            .then((response) => {
              resolve({ statuse: true });
            });
        }
      }
    });
  },
  getProCount: (data) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let proCount = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({
          _id: objectId(data.cart),
          'product.item': objectId(data.product),
        });
      if (proCount) {
        count = proCount.product.quantity;
      }
      resolve(count);
    });
  },
  removeCartProduct: (data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          {
            _id: objectId(data.cart),
          },
          {
            $pull: { product: { item: objectId(data.product) } },
          }
        )
        .then((response) => {
          resolve({ removeProduct: true });
        });
    });
  },
  sumOfCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: '$product',
          },
          {
            $project: {
              item: '$product.item',
              quantity: '$product.quantity',
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
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: [
                    { $toInt: '$quantity' },
                    { $toInt: '$productItem.OfferPrice' },
                  ],
                },
              },
            },
          },
        ])
        .toArray();
      if (total != 0) {
        resolve(total[0].total);
      } else {
        resolve();
      }
    });
  },
  placeOrder: (
    order,
    PaymentMethod,
    products,
    total,
    coupenDis,
    couponCode,
    userId
  ) => {
    console.log('PaymentMethod', PaymentMethod);
    if (coupenDis == undefined) {
      coupenDis = {
        DiscAmount: 0,
        totalDiscount: total,
        total: total,
      };
    }
    return new Promise((resolve, reject) => {
      let status =
        PaymentMethod['payment-method'] === 'COD' ? 'placed' : 'pending';
      let orderObj = {
        deliveryDetails: {
          FirstName: order[0].FirstName,
          LastName: order[0].LastName,
          Address: order[0].Address,
          Number: order[0].Number,
          Email: order[0].Email,
          City: order[0].City,
          Pincode: order[0].Pincode,
        },
        userId: objectId(userId),
        PaymentMethod: 'COD',
        products: products,
        totalPrice: total,
        deliveryDate: shipDate,
        date1: formatted,
        date2: new Date(),
        status: 'placed',
        action: true,
        discount: coupenDis.DiscAmount,
        totalPayabile: coupenDis.totalDiscount,
        beforeDiscount: coupenDis.total,
      };
      if (status == 'placed') {
        db.get()
          .collection(collection.ORDER_COLLECTION)
          .insertOne(orderObj)
          .then((response) => {
            db.get()
              .collection(collection.CART_COLLECTION)
              .drop({ user: objectId(order.userId) });
            console.log(response.insertedId);
          });

        db.get()
          .collection(collection.COUPEN_COLLECTION)
          .updateOne(
            {
              coupenName: couponCode,
            },
            {
              $push: {
                user: userId,
              },
            }
          );
        resolve(response.insertedId);
      } else {
        console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', userId);
        resolve(userId);
      }
    });
  },

  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      resolve(cart.product);
    });
  },
  getDeliveryAddress: (ordeId, userId) => {
    console.log('ordeId', ordeId);
    return new Promise(async (resolve, reject) => {
      let address = await db
        .get()
        .collection(collection.ADDRESS_COLLECTION)
        .aggregate([
          {
            $match: { userId: objectId(userId) },
          },
          { $unwind: '$deliveryAddrees' },
          {
            $project: {
              addressId: '$deliveryAddrees.addressId',
              FirstName: '$deliveryAddrees.FirstName',
              LastName: '$deliveryAddrees.LastName',
              Address: '$deliveryAddrees.Address',
              Number: '$deliveryAddrees.Number',
              Email: '$deliveryAddrees.Email',
              City: '$deliveryAddrees.City',
              Pincode: '$deliveryAddrees.Pincode',
            },
          },
          {
            $match: { addressId: ordeId },
          },
        ])
        .toArray();
      resolve(address);
    });
  },
  getUserOrders: (userId, pageno = 1, limit = 5) => {
    pageno = parseInt(pageno);
    limit = parseInt(limit);
    let skip = limit * (pageno - 1);
    if (skip <= 0) skip = 0;
    console.log('skip,limit', skip, limit);

    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(userId) })
        .sort({ date2: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      orders.pageno = pageno;

      orders.count = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(userId) })
        .count();

      // orders.count=Math.floor(orders.count/limit)
      orders.count = Math.ceil(orders.count / limit);
      orders.pageNos = [];
      if (orders.count < 1) {
        orders.pageNos = [{ pageno: 1, currentPage: true }];
      } else {
        for (i = 1; i <= orders.count; i++) {
          if (pageno == i) {
            orders.pageNos.push({
              pageno: i,
              currentPage: true,
            });
          } else {
            orders.pageNos.push({
              pageno: i,
              currentPage: false,
            });
          }
        }
      }
      resolve(orders);
    });
  },
  getUserOrdersView: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ _id: objectId(orderId) })
        .toArray();
      resolve(orders);
    });
  },
  orderTrack: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderTrack = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: objectId(orderId) });
      resolve(orderTrack.status);
    });
  },

  getOrderProducts: (orderId) => {
    console.log(orderId);
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
  generateRazorpay: (orderId, totalPrice) => {
    console.log('bbbbbbbbbbbbbbbbbbbbbbbbbb', orderId);
    amount = parseInt(totalPrice);
    return new Promise(async (resolve, reject) => {
      var options = {
        amount: amount * 100,
        currency: 'INR',
        receipt: '' + orderId,
      };
      instance.orders.create(options, function (err, order) {
        resolve(order);
      });
    });
  },

  varifyPaymentRazorepay: (
    details,
    order,
    products,
    totalPrice,
    coupenDis,
    userId,
    couponCode
  ) => {
    console.log('++++++++++++++++++++', order);
    total = parseInt(totalPrice);
    if (coupenDis == undefined) {
      coupenDis = {
        DiscAmount: 0,
        totalDiscount: total,
        total: total,
      };
    }
    return new Promise(async (resolve, reject) => {
      let { createHmac } = await import('node:crypto');
      let hmac = createHmac('sha256', 'jkO40bFs59Sk5hqK7Y27nKfS');
      hmac.update(
        details['payment[razorpay_order_id]'] +
          '|' +
          details['payment[razorpay_payment_id]']
      );
      hmac = hmac.digest('hex');
      if (hmac == details['payment[razorpay_signature]']) {
        let orderObj = {
          deliveryDetails: {
            FirstName: order[0].FirstName,
            LastName: order[0].LastName,
            Address: order[0].Address,
            Number: order[0].Number,
            Email: order[0].Email,
            City: order[0].City,
            Pincode: order[0].Pincode,
          },
          userId: objectId(userId),
          PaymentMethod: 'Razorpay',
          products: products,
          totalPrice: totalPrice,
          date1: formatted,
          deliveryDate: shipDate,
          date2: new Date(),
          status: 'placed',
          action: true,
          discount: coupenDis.DiscAmount,
          totalPayabile: coupenDis.totalDiscount,
          beforeDiscount: coupenDis.total,
        };

        console.log('razorePay', orderObj);
        db.get()
          .collection(collection.ORDER_COLLECTION)
          .insertOne(orderObj)
          .then((response) => {
            db.get()
              .collection(collection.CART_COLLECTION)
              .drop({ user: objectId(details.userId) });
            console.log(response.insertedId);
          });
        db.get()
          .collection(collection.COUPEN_COLLECTION)
          .updateOne(
            {
              coupenName: couponCode,
            },
            {
              $push: {
                user: userId,
              },
            }
          );
        resolve();
      } else {
        reject();
      }
    });
  },
  generatePaypal: (orderId, totalPrice) => {
    console.log(orderId);
    console.log(totalPrice);
    return new Promise(async (resolve, reject) => {
      let create_payment_json = {
        intent: 'sale',
        payer: {
          payment_method: 'paypal',
        },
        redirect_urls: {
          return_url: 'http://styleworld.tk/success',
          cancel_url: 'http://styleworld.tk/cancel',
        },
        transactions: [
          {
            amount: {
              currency: 'USD',
              total: totalPrice,
            },
            description: 'Thanku For Buying From Us',
          },
        ],
      };
      paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
          console.log(error);
          throw error;
        } else {
          resolve(payment);
        }
      });
    });
  },
  varifyPaymentPaypal: (
    order,
    products,
    totalPrice,
    coupenDis,
    userId,
    couponCode
  ) => {
    userId = userId.toString();
    if (coupenDis == undefined) {
      coupenDis = {
        DiscAmount: 0,
        totalDiscount: totalPrice,
        total: totalPrice,
      };
    }
    return new Promise(async (resolve, reject) => {
      let orderObj = {
        deliveryDetails: {
          FirstName: order[0].FirstName,
          LastName: order[0].LastName,
          Address: order[0].Address,
          Number: order[0].Number,
          Email: order[0].Email,
          City: order[0].City,
          Pincode: order[0].Pincode,
        },
        userId: objectId(userId),
        PaymentMethod: 'Paypal',
        products: products,
        totalPrice: totalPrice,
        date1: formatted,
        date2: new Date(),
        status: 'placed',
        action: true,
        discount: coupenDis.DiscAmount,
        totalPayabile: coupenDis.totalDiscount,
        beforeDiscount: coupenDis.total,
      };

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .drop({ user: objectId(userId) });
          console.log(response.insertedId);
        });
      db.get()
        .collection(collection.COUPEN_COLLECTION)
        .updateOne(
          {
            coupenName: couponCode,
          },
          {
            $push: {
              user: userId,
            },
          }
        );
      resolve();
    });
  },
  wlletPayment: (
    userId,
    order,
    products,
    total,
    coupenDis,
    user,
    couponCode
  ) => {
    let WalletOrder;
    user = userId.toString();
    if (coupenDis == undefined) {
      coupenDis = {
        DiscAmount: 0,
        totalDiscount: total,
        total: total,
      };
    }
    return new Promise(async (resolve, reject) => {
      let orderObj = {
        deliveryDetails: {
          FirstName: order[0].FirstName,
          LastName: order[0].LastName,
          Address: order[0].Address,
          Number: order[0].Number,
          Email: order[0].Email,
          City: order[0].City,
          Pincode: order[0].Pincode,
        },
        userId: objectId(userId),
        PaymentMethod: 'Wallet',
        products: products,
        totalPrice: total,
        date1: formatted,
        date2: new Date(),
        status: 'placed',
        action: true,
        discount: coupenDis.DiscAmount,
        totalPayabile: coupenDis.totalDiscount,
        beforeDiscount: coupenDis.total,
      };
      db.get()
        .collection(collection.WALLET_COLLECTION)
        .updateOne(
          {
            userId: objectId(userId),
          },
          {
            $inc: { balance: -total },
          }
        );
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          WalletOrder = response.insertedId.toString();
          console.log(' req.session.WalletOrder', WalletOrder);
          db.get()
            .collection(collection.CART_COLLECTION)
            .drop({ user: objectId(userId.userId) });
        });
      await db
        .get()
        .collection(collection.COUPEN_COLLECTION)
        .updateOne(
          {
            coupenName: couponCode,
          },
          {
            $push: {
              user: user,
            },
          }
        );
      console.log(' req.session.WalletOrder', WalletOrder);
      description = ' Purchased';
      order = WalletOrder;
      debitAmountwallet(userId, total, description, order);
      resolve();
    });
  },
  changeOrderStatus: (orderId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: { status: 'placed' },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
  cancelOrder: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: { status: 'Order Canceld', action: false },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
  cancelOrderAmountTrasferingToWallet: (orderId, userId) => {
    console.log('userId', userId);
    console.log('orderId', orderId);
    return new Promise(async (resolve, reject) => {
      order = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: objectId(orderId) });
      if (!order.action) {
        if (order.PaymentMethod == 'Razorpay' || 'Paypal' || 'wallet') {
          console.log('payment not cod');
          db.get()
            .collection(collection.ORDER_COLLECTION)
            .updateOne(
              { _id: objectId(orderId) },
              {
                $set: { orderCancelStatus: 'Amount transfer into your wallet' },
              }
            );
          db.get()
            .collection(collection.WALLET_COLLECTION)
            .updateOne(
              {
                userId: objectId(userId),
              },
              {
                $inc: { balance: order.totalPayabile },
              }
            );
          let description = ' Amount refunded ';
          let orderid=orderId
          creditAmountwallet(userId, order.totalPayabile, description,orderid);
          resolve();
        } else {
          console.log('payment cod');
          resolve();
        }
      } else {
        console.log('action true');
        resolve();
      }
    });
  },
  returnItem: (orderId, userId, order) => {
    console.log('order', order);
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          {
            _id: objectId(orderId),
          },
          {
            $set: { status: 'Order returnd' },
          }
        );
      db.get()
        .collection(collection.WALLET_COLLECTION)
        .updateOne(
          {
            userId: objectId(userId),
          },
          {
            $inc: { balance: order[0].totalPayabile },
          }
        );
      resolve();
    });
  },
  chagePassword: (Password, userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({
          _id: objectId(userId),
        });
      if (user) {
        bcrypt
          .compare(Password.oldPassword, user.Password)
          .then(async (response) => {
            if (response) {
              Password.newPassword = await bcrypt.hash(
                Password.newPassword,
                10
              );
              db.get()
                .collection(collection.USER_COLLECTION)
                .updateOne(
                  { _id: objectId(userId) },
                  {
                    $set: {
                      Password: Password.newPassword,
                    },
                  }
                )
                .then(() => {
                  resolve({ status: true });
                });
            } else {
              resolve();
            }
          });
      } else {
        resolve();
      }
    });
  },
  chagePersonalInformation: (userData, userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: {
              Name: userData.Name,
              MobileNumber: userData.MobileNumber,
              Email: userData.Email,
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
  addNewAddress: (userData, userId) => {
    let dateObj = new Date();
    let id = dateObj.toString();
    userData.addressId = id;
    let deliveryAddrees = [
      (address = {
        addressId: id,
        FirstName: userData.FirstName,
        LastName: userData.LastName,
        Address: userData.Address,
        Number: userData.Number,
        Email: userData.Email,
        City: userData.City,
        Pincode: userData.Pincode,
      }),
    ];
    return new Promise(async (resolve, reject) => {
      let address = await db
        .get()
        .collection(collection.ADDRESS_COLLECTION)
        .findOne({ userId: objectId(userId) });
      console.log('address', address);
      if (address) {
        db.get()
          .collection(collection.ADDRESS_COLLECTION)
          .updateOne(
            { userId: objectId(userId) },
            {
              $push: { deliveryAddrees: userData },
            }
          )
          .then(() => {
            resolve();
          });
      } else {
        db.get()
          .collection(collection.ADDRESS_COLLECTION)
          .insertOne({
            userId: objectId(userId),
            userName: userData.FirstName + userData.LastName,
            deliveryAddrees,
          })
          .then(() => {
            resolve();
          });
      }
    });
  },
  faindUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
  converter: (price) => {
    return new Promise((resolve, reject) => {
      let currencyConverter = new CC({
        from: 'INR',
        to: 'USD',
        amount: price,
        isDecimalComma: false,
      });
      currencyConverter.convert().then((response) => {
        resolve(response);
      });
    });
  },
  // getAddress: (userId) => {
  //   return new Promise(async (resolve, reject) => {
  //     let address = await db
  //       .get()
  //       .collection(collection.ADDRESS_COLLECTION)
  //       .find({
  //         userId: objectId(userId),
  //       })
  //       .toArray();
  //     resolve(address[0].deliveryAddrees);
  //   });
  // },
  getAddress: (userId) => {
    console.log('userId', userId);
    return new Promise(async (resolve, reject) => {
      let getAddressCount = await db
        .get()
        .collection(collection.ADDRESS_COLLECTION)
        .find({
          userId: objectId(userId),
        })
        .toArray();
      getAddressCount = getAddressCount.length;
      if (getAddressCount != 0) {
        let address = await db
          .get()
          .collection(collection.ADDRESS_COLLECTION)
          .find({
            userId: objectId(userId),
          })
          .toArray();
        address[0].deliveryAddrees.getAddressCount = true;
        resolve(address[0].deliveryAddrees);
      } else {
        resolve({ getAddressCount: false });
      }
    });
  },
  walletBalance: (userId) => {
    return new Promise(async (resolve, reject) => {
      balance = await db
        .get()
        .collection(collection.WALLET_COLLECTION)
        .findOne({
          userId: objectId(userId),
        });
      resolve(balance);
    });
  },
  downloadInvoice: (poroducts, orders, user) => {
    let data = [];
    poroducts.map(async (pro) => {
      data = {
        item: pro.productItem.NAME,
        description: pro.productItem.categoryName,
        quantity: pro.quantity,
        price: pro.productItem.OfferPrice,
        tax: '0%',
      };
    });
    return new Promise((resolve, reject) => {
      const invoiceDetail = {
        shipping: {
          name: user.Name,
          address: orders[0].deliveryDetails.Address,
          city: orders[0].deliveryDetails.City,
          state: 'kerala',
          country: 'India',
          postal_code: orders[0].deliveryDetails.Pincode,
        },
        items: [data],
        subtotal: orders[0].totalPrice,
        discount: '0',
        total: orders[0].totalPayabile,
        order_number: orders[0]._id,
        header: {
          company_name: 'Fashion store',
          company_logo: 'logo.png',
          company_address: 'Room No:16 Unknown Building Cochin',
        },
        footer: {
          text: 'Thanku for purchase from fashion store',
        },
        currency_symbol: '₹',
        date: {
          billing_date: orders[0].date1,
          due_date: orders[0].date1,
        },
      };

      niceInvoice(invoiceDetail, user.Name + orders[0]._id + '.pdf');
    });
  },
};
